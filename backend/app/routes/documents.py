import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile
from pydantic import BaseModel

from app.agent.activity_log import list_events, log_event
from app.agent.adk_agent import run_agent_pipeline
from app.agent.document_extraction import (
    SUPPORTED_CONTENT_TYPES,
    DocumentReadError,
    extract_document_content,
)
from app.agent.delay_impact import compute_downstream_impact, generate_delay_impact_summary
from app.agent.guidance import generate_task_guidance
from app.agent.next_best_action import get_next_best_action_index, is_blocked
from app.agent.task_qa import answer_task_question
from app.agent.translate import translate_document_content
from app.auth import resolve_owner_id
from app.firestore_client import get_firestore_client
from app.models.schemas import TaskGuidance, ValidatedTask

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/documents", tags=["documents"])


def _ordered_tasks_for_document(db, document_id: str) -> list[dict]:
    """All sibling tasks for a document, as plain dicts ordered by their
    index (parsed from the deterministic task_{document_id}_{index} id).
    Skips any task whose id doesn't match that pattern — older documents
    from before deterministic IDs were introduced used random suffixes."""
    sibling_snaps = db.collection("tasks").where("documentId", "==", document_id).stream()
    indexed: dict[int, dict] = {}
    for snap in sibling_snaps:
        suffix = snap.id.rsplit("_", 1)[1]
        if suffix.isdigit():
            indexed[int(suffix)] = snap.to_dict()
    return [indexed[i] for i in sorted(indexed)]


@router.post("/upload")
async def upload_document(
    file: UploadFile,
    target_language: str | None = Form(None),
    owner_id: str | None = Depends(resolve_owner_id),
):
    if file.content_type not in SUPPORTED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Upload a PDF, Word document, PowerPoint "
            "file, plain text file, or an image (JPEG/PNG/WEBP).",
        )

    file_bytes = await file.read()
    try:
        content = extract_document_content(file_bytes, file.content_type)
    except DocumentReadError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    if not content.is_image and not (content.text or "").strip():
        raise HTTPException(status_code=422, detail="We could not read this document.")

    document_id = f"doc_{uuid.uuid4().hex[:8]}"
    db = get_firestore_client()
    db.collection("documents").document(document_id).set(
        {
            "filename": file.filename,
            "status": "processing",
            "uploaded_at": datetime.now(timezone.utc).isoformat(),
            "owner_id": owner_id,
        }
    )
    log_event(db, document_id, "document_uploaded", f'Document "{file.filename}" uploaded')

    try:
        document_summary, validation, result = await run_agent_pipeline(
            content.text,
            document_id,
            target_language,
            image_bytes=content.image_bytes,
            image_mime_type=content.image_mime_type,
        )
    except Exception as exc:  # noqa: BLE001
        logger.exception("Agent pipeline failed for document %s", document_id)
        db.collection("documents").document(document_id).update(
            {"status": "failed", "agentRunStatus": "error"}
        )
        log_event(db, document_id, "pipeline_failed", "Agent pipeline failed — please try again")
        raise HTTPException(
            status_code=502, detail="Document analysis failed. Please try again."
        ) from exc

    warnings = list(validation.warnings)
    if not validation.tasks:
        warnings.append("No explicit required actions were detected.")

    db.collection("documents").document(document_id).update(
        {
            "status": "processed",
            "summary": document_summary,
            "agentRunStatus": "success",
            "warnings": warnings,
            "missing_information": validation.missing_information,
            "consequences": validation.consequences,
            # Snapshot as first generated — see save_tasks' original_* fields
            # for why this is kept separate from the display copy above.
            "original_summary": document_summary,
            "original_warnings": warnings,
            "original_missing_information": validation.missing_information,
            "original_consequences": validation.consequences,
            "content_language": target_language,
        }
    )

    log_event(
        db,
        document_id,
        "extraction_complete",
        f"Agent extracted {len(validation.tasks)} action(s) from the document",
    )
    log_event(
        db,
        document_id,
        "validation_complete",
        "Agent validated requirements and built the dependency graph",
    )

    task_dicts = [task.model_dump() for task in validation.tasks]
    initial_best_index = get_next_best_action_index(task_dicts)
    if initial_best_index is not None:
        log_event(
            db,
            document_id,
            "recommendation_selected",
            f'Agent selected the next action: "{validation.tasks[initial_best_index].title}"',
        )
    else:
        log_event(
            db,
            document_id,
            "recommendation_selected",
            "No task is currently unblocked",
        )

    tasks_with_ids = [
        {"id": task_id, **task.model_dump()}
        for task_id, task in zip(result.saved_task_ids, validation.tasks)
    ]

    return {
        "document_id": document_id,
        "summary": document_summary,
        "tasks": tasks_with_ids,
        "warnings": warnings,
        "missing_information": validation.missing_information,
        "consequences": validation.consequences,
        "saved_task_ids": result.saved_task_ids,
        "content_language": target_language,
    }


class TaskStatusUpdate(BaseModel):
    status: str


@router.patch("/tasks/{task_id}")
def update_task_status(task_id: str, body: TaskStatusUpdate):
    if body.status not in {"todo", "done"}:
        raise HTTPException(status_code=400, detail="status must be 'todo' or 'done'.")

    db = get_firestore_client()
    task_ref = db.collection("tasks").document(task_id)
    task_snap = task_ref.get()
    if not task_snap.exists:
        raise HTTPException(status_code=404, detail="Task not found.")
    task_data = task_snap.to_dict()
    document_id = task_data["documentId"]
    target_index = int(task_id.rsplit("_", 1)[1])

    ordered_before = _ordered_tasks_for_document(db, document_id)
    previous_best = get_next_best_action_index(ordered_before)

    task_ref.update({"status": body.status})

    ordered_after = [dict(t) for t in ordered_before]
    ordered_after[target_index]["status"] = body.status
    new_best = get_next_best_action_index(ordered_after)

    title = task_data.get("title", "")
    if body.status == "done":
        log_event(db, document_id, "task_completed", f'Task completed: "{title}"')
        for i, t in enumerate(ordered_after):
            if (
                i != target_index
                and target_index in t.get("dependencies", [])
                and is_blocked(ordered_before, i)
                and not is_blocked(ordered_after, i)
            ):
                log_event(db, document_id, "task_unblocked", f'Task unblocked: "{t.get("title", "")}"')
    else:
        log_event(db, document_id, "task_reopened", f'Task reopened: "{title}"')

    if new_best != previous_best:
        if new_best is not None:
            new_title = ordered_after[new_best].get("title", "")
            log_event(
                db,
                document_id,
                "recommendation_changed",
                f'Recommendation changed to: "{new_title}"',
            )
        else:
            log_event(
                db,
                document_id,
                "recommendation_changed",
                "No task is currently unblocked",
            )

    return {"id": task_id, "status": body.status}


class ConditionStatusUpdate(BaseModel):
    condition_status: str


_CONDITION_STATUS_MESSAGES = {
    "applies": 'Condition confirmed for "{title}" — it now applies',
    "not_applicable": 'Condition marked not applicable for "{title}" — task excluded',
    "unknown": 'Condition status reset for "{title}"',
}


@router.patch("/tasks/{task_id}/condition-status")
def update_condition_status(task_id: str, body: ConditionStatusUpdate):
    if body.condition_status not in {"unknown", "applies", "not_applicable"}:
        raise HTTPException(
            status_code=400,
            detail="condition_status must be 'unknown', 'applies', or 'not_applicable'.",
        )

    db = get_firestore_client()
    task_ref = db.collection("tasks").document(task_id)
    task_snap = task_ref.get()
    if not task_snap.exists:
        raise HTTPException(status_code=404, detail="Task not found.")
    task_data = task_snap.to_dict()
    if not task_data.get("is_conditional"):
        raise HTTPException(
            status_code=400, detail="This task is not conditional."
        )

    document_id = task_data["documentId"]
    target_index = int(task_id.rsplit("_", 1)[1])
    title = task_data.get("title", "")

    ordered_before = _ordered_tasks_for_document(db, document_id)
    previous_best = get_next_best_action_index(ordered_before)

    task_ref.update({"condition_status": body.condition_status})

    ordered_after = [dict(t) for t in ordered_before]
    ordered_after[target_index]["condition_status"] = body.condition_status
    new_best = get_next_best_action_index(ordered_after)

    log_event(
        db,
        document_id,
        "condition_status_changed",
        _CONDITION_STATUS_MESSAGES[body.condition_status].format(title=title),
    )
    for i, t in enumerate(ordered_after):
        if (
            i != target_index
            and target_index in t.get("dependencies", [])
            and is_blocked(ordered_before, i)
            and not is_blocked(ordered_after, i)
        ):
            log_event(db, document_id, "task_unblocked", f'Task unblocked: "{t.get("title", "")}"')

    if new_best != previous_best:
        if new_best is not None:
            new_title = ordered_after[new_best].get("title", "")
            log_event(
                db,
                document_id,
                "recommendation_changed",
                f'Recommendation changed to: "{new_title}"',
            )
        else:
            log_event(
                db,
                document_id,
                "recommendation_changed",
                "No task is currently unblocked",
            )

    return {"id": task_id, "condition_status": body.condition_status}


@router.post("/tasks/{task_id}/guidance")
async def get_task_guidance(task_id: str):
    db = get_firestore_client()
    task_snap = db.collection("tasks").document(task_id).get()
    if not task_snap.exists:
        raise HTTPException(status_code=404, detail="Task not found.")
    task_data = task_snap.to_dict()

    cached = db.collection("task_guidance").document(task_id).get()
    if cached.exists:
        return cached.to_dict()

    document_id = task_data["documentId"]
    doc_snap = db.collection("documents").document(document_id).get()
    document_summary = doc_snap.to_dict().get("summary", "") if doc_snap.exists else ""

    dependency_titles = []
    for dep_index in task_data.get("dependencies", []):
        dep_snap = db.collection("tasks").document(f"task_{document_id}_{dep_index}").get()
        if dep_snap.exists:
            dependency_titles.append(dep_snap.to_dict().get("title", ""))

    try:
        guidance: TaskGuidance = await generate_task_guidance(
            title=task_data.get("title", ""),
            description=task_data.get("description", ""),
            source_excerpt=task_data.get("source_excerpt", ""),
            required_documents=task_data.get("required_documents", []),
            deadline=task_data.get("deadline"),
            dependency_titles=dependency_titles,
            document_summary=document_summary,
        )
    except Exception as exc:  # noqa: BLE001
        logger.exception("Guidance generation failed for task %s", task_id)
        raise HTTPException(
            status_code=502, detail="Could not generate guidance. Please try again."
        ) from exc

    guidance_dict = guidance.model_dump()
    db.collection("task_guidance").document(task_id).set(guidance_dict)
    return guidance_dict


class TaskQuestion(BaseModel):
    question: str


@router.post("/tasks/{task_id}/ask")
async def ask_task_question(task_id: str, body: TaskQuestion):
    if not body.question.strip():
        raise HTTPException(status_code=400, detail="question must not be empty.")

    db = get_firestore_client()
    task_snap = db.collection("tasks").document(task_id).get()
    if not task_snap.exists:
        raise HTTPException(status_code=404, detail="Task not found.")
    task_data = task_snap.to_dict()

    document_id = task_data["documentId"]
    doc_snap = db.collection("documents").document(document_id).get()
    doc_data = doc_snap.to_dict() if doc_snap.exists else {}

    dependency_titles = []
    for dep_index in task_data.get("dependencies", []):
        dep_snap = db.collection("tasks").document(f"task_{document_id}_{dep_index}").get()
        if dep_snap.exists:
            dependency_titles.append(dep_snap.to_dict().get("title", ""))

    try:
        answer = await answer_task_question(
            question=body.question,
            title=task_data.get("title", ""),
            description=task_data.get("description", ""),
            source_excerpt=task_data.get("source_excerpt", ""),
            required_documents=task_data.get("required_documents", []),
            deadline=task_data.get("deadline"),
            priority=task_data.get("priority", ""),
            priority_reason=task_data.get("priority_reason", ""),
            risk_level=task_data.get("risk_level", ""),
            risk_reason=task_data.get("risk_reason", ""),
            is_conditional=task_data.get("is_conditional", False),
            condition=task_data.get("condition", ""),
            dependency_titles=dependency_titles,
            document_summary=doc_data.get("summary", ""),
            warnings=doc_data.get("warnings", []),
            consequences=doc_data.get("consequences", []),
        )
    except Exception as exc:  # noqa: BLE001
        logger.exception("Task Q&A failed for task %s", task_id)
        raise HTTPException(
            status_code=502, detail="Could not answer the question. Please try again."
        ) from exc

    return {"answer": answer}


@router.post("/tasks/{task_id}/delay-impact")
async def get_delay_impact(task_id: str):
    db = get_firestore_client()
    task_snap = db.collection("tasks").document(task_id).get()
    if not task_snap.exists:
        raise HTTPException(status_code=404, detail="Task not found.")
    task_data = task_snap.to_dict()
    document_id = task_data["documentId"]

    doc_snap = db.collection("documents").document(document_id).get()
    doc_data = doc_snap.to_dict() if doc_snap.exists else {}

    ordered_tasks = _ordered_tasks_for_document(db, document_id)

    target_index = int(task_id.rsplit("_", 1)[1])
    impact = compute_downstream_impact(ordered_tasks, target_index)

    try:
        summary = await generate_delay_impact_summary(
            title=task_data.get("title", ""),
            deadline=task_data.get("deadline"),
            downstream_count=impact["downstream_count"],
            downstream_titles=impact["downstream_titles"],
            earliest_deadline=impact["earliest_downstream_deadline"],
            earliest_task=impact["earliest_downstream_task"],
            consequences=doc_data.get("consequences", []),
        )
    except Exception as exc:  # noqa: BLE001
        logger.exception("Delay impact generation failed for task %s", task_id)
        raise HTTPException(
            status_code=502, detail="Could not generate delay impact. Please try again."
        ) from exc

    return {
        "summary": summary,
        "downstream_count": impact["downstream_count"],
        "downstream_titles": impact["downstream_titles"],
    }


@router.get("/{document_id}/events")
def get_agent_events(document_id: str):
    db = get_firestore_client()
    doc_snap = db.collection("documents").document(document_id).get()
    if not doc_snap.exists:
        raise HTTPException(status_code=404, detail="Document not found.")

    return {"events": list_events(db, document_id)}


@router.get("")
def list_documents(owner_id: str | None = Depends(resolve_owner_id)):
    if not owner_id:
        return {"documents": []}

    db = get_firestore_client()
    doc_snaps = db.collection("documents").where("owner_id", "==", owner_id).stream()
    documents = []
    for snap in doc_snaps:
        data = snap.to_dict()
        documents.append(
            {
                "document_id": snap.id,
                "filename": data.get("filename", ""),
                "status": data.get("status", ""),
                "summary": data.get("summary", ""),
                "uploaded_at": data.get("uploaded_at"),
            }
        )
    documents.sort(key=lambda d: d.get("uploaded_at") or "", reverse=True)
    return {"documents": documents}


def _build_document_response(db, document_id: str, doc_data: dict) -> dict:
    ordered_tasks = _ordered_tasks_for_document(db, document_id)
    tasks_with_ids = [
        # Re-validate through the model so older documents saved before a
        # field existed (e.g. condition_status) come back with proper
        # defaults instead of a key the frontend doesn't expect.
        {"id": f"task_{document_id}_{i}", **ValidatedTask(**task).model_dump()}
        for i, task in enumerate(ordered_tasks)
    ]

    return {
        "document_id": document_id,
        "summary": doc_data.get("summary", ""),
        "tasks": tasks_with_ids,
        "warnings": doc_data.get("warnings", []),
        "missing_information": doc_data.get("missing_information", []),
        "consequences": doc_data.get("consequences", []),
        "saved_task_ids": [t["id"] for t in tasks_with_ids],
        "content_language": doc_data.get("content_language"),
    }


def _get_owned_document(db, document_id: str, owner_id: str | None) -> dict:
    doc_snap = db.collection("documents").document(document_id).get()
    if not doc_snap.exists:
        raise HTTPException(status_code=404, detail="Document not found.")
    doc_data = doc_snap.to_dict()
    if doc_data.get("owner_id") and doc_data.get("owner_id") != owner_id:
        raise HTTPException(status_code=404, detail="Document not found.")
    return doc_data


@router.get("/{document_id}")
def get_document(document_id: str, owner_id: str | None = Depends(resolve_owner_id)):
    db = get_firestore_client()
    doc_data = _get_owned_document(db, document_id, owner_id)
    return _build_document_response(db, document_id, doc_data)


class TranslateRequest(BaseModel):
    target_language: str | None = None


@router.post("/{document_id}/translate")
async def translate_document(
    document_id: str,
    body: TranslateRequest,
    owner_id: str | None = Depends(resolve_owner_id),
):
    db = get_firestore_client()
    doc_data = _get_owned_document(db, document_id, owner_id)
    ordered_tasks = _ordered_tasks_for_document(db, document_id)

    original_summary = doc_data.get("original_summary", doc_data.get("summary", ""))
    original_warnings = doc_data.get("original_warnings", doc_data.get("warnings", []))
    original_missing = doc_data.get(
        "original_missing_information", doc_data.get("missing_information", [])
    )
    original_consequences = doc_data.get(
        "original_consequences", doc_data.get("consequences", [])
    )

    if not body.target_language:
        # "Match the document's language" — always free, no Gemini call:
        # just restore the untouched original-language snapshot.
        doc_update = {
            "summary": original_summary,
            "warnings": original_warnings,
            "missing_information": original_missing,
            "consequences": original_consequences,
            "content_language": None,
        }
        for i, task in enumerate(ordered_tasks):
            db.collection("tasks").document(f"task_{document_id}_{i}").update(
                {
                    "title": task.get("original_title", task.get("title", "")),
                    "description": task.get("original_description", task.get("description", "")),
                    "condition": task.get("original_condition", task.get("condition", "")),
                    "required_documents": task.get(
                        "original_required_documents", task.get("required_documents", [])
                    ),
                }
            )
    else:
        try:
            translation = await translate_document_content(
                target_language=body.target_language,
                document_summary=original_summary,
                warnings=original_warnings,
                missing_information=original_missing,
                consequences=original_consequences,
                tasks=[
                    {
                        "title": task.get("original_title", task.get("title", "")),
                        "description": task.get("original_description", task.get("description", "")),
                        "condition": task.get("original_condition", task.get("condition", "")),
                        "required_documents": task.get(
                            "original_required_documents", task.get("required_documents", [])
                        ),
                    }
                    for task in ordered_tasks
                ],
            )
        except Exception as exc:  # noqa: BLE001
            logger.exception("Translation failed for document %s", document_id)
            raise HTTPException(
                status_code=502, detail="Could not translate this document. Please try again."
            ) from exc

        doc_update = {
            "summary": translation.document_summary,
            "warnings": translation.warnings,
            "missing_information": translation.missing_information,
            "consequences": translation.consequences,
            "content_language": body.target_language,
        }
        for i, translated_task in enumerate(translation.tasks):
            db.collection("tasks").document(f"task_{document_id}_{i}").update(
                {
                    "title": translated_task.title,
                    "description": translated_task.description,
                    "condition": translated_task.condition,
                    "required_documents": translated_task.required_documents,
                }
            )

    db.collection("documents").document(document_id).update(doc_update)
    log_event(
        db,
        document_id,
        "document_translated",
        f"Document translated to {body.target_language or 'its original language'}",
    )

    doc_data.update(doc_update)
    return _build_document_response(db, document_id, doc_data)


@router.delete("/{document_id}")
def delete_document(document_id: str, owner_id: str | None = Depends(resolve_owner_id)):
    db = get_firestore_client()
    doc_ref = db.collection("documents").document(document_id)
    doc_snap = doc_ref.get()
    if not doc_snap.exists:
        raise HTTPException(status_code=404, detail="Document not found.")
    existing_owner = doc_snap.to_dict().get("owner_id")
    if existing_owner and existing_owner != owner_id:
        raise HTTPException(status_code=404, detail="Document not found.")

    task_snaps = list(db.collection("tasks").where("documentId", "==", document_id).stream())
    for task_snap in task_snaps:
        db.collection("task_guidance").document(task_snap.id).delete()
        task_snap.reference.delete()

    for event_snap in doc_ref.collection("events").stream():
        event_snap.reference.delete()

    doc_ref.delete()
    return {"document_id": document_id, "deleted": True}
