import logging
import uuid

from fastapi import APIRouter, Form, HTTPException, UploadFile
from pydantic import BaseModel

from app.agent.adk_agent import run_agent_pipeline
from app.agent.document_extraction import (
    SUPPORTED_CONTENT_TYPES,
    DocumentReadError,
    extract_document_content,
)
from app.firestore_client import get_firestore_client

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/documents", tags=["documents"])


@router.post("/upload")
async def upload_document(file: UploadFile, target_language: str | None = Form(None)):
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
        }
    )

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
        raise HTTPException(
            status_code=502, detail="Document analysis failed. Please try again."
        ) from exc

    db.collection("documents").document(document_id).update(
        {
            "status": "processed",
            "summary": document_summary,
            "agentRunStatus": "success",
        }
    )

    warnings = list(validation.warnings)
    if not validation.tasks:
        warnings.append("No explicit required actions were detected.")

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
    }


class TaskStatusUpdate(BaseModel):
    status: str


@router.patch("/tasks/{task_id}")
def update_task_status(task_id: str, body: TaskStatusUpdate):
    if body.status not in {"todo", "done"}:
        raise HTTPException(status_code=400, detail="status must be 'todo' or 'done'.")

    db = get_firestore_client()
    task_ref = db.collection("tasks").document(task_id)
    if not task_ref.get().exists:
        raise HTTPException(status_code=404, detail="Task not found.")

    task_ref.update({"status": body.status})
    return {"id": task_id, "status": body.status}
