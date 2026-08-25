import io
import logging
import uuid

from fastapi import APIRouter, Form, HTTPException, UploadFile
from pydantic import BaseModel
from pypdf import PdfReader
from pypdf.errors import PdfReadError

from app.agent.adk_agent import run_agent_pipeline
from app.firestore_client import get_firestore_client

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/documents", tags=["documents"])


def _extract_pdf_text(file_bytes: bytes) -> str:
    try:
        reader = PdfReader(io.BytesIO(file_bytes))
        return "\n".join(page.extract_text() or "" for page in reader.pages)
    except PdfReadError as exc:
        raise HTTPException(
            status_code=422, detail="We could not read this document."
        ) from exc


@router.post("/upload")
async def upload_document(file: UploadFile, target_language: str | None = Form(None)):
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    file_bytes = await file.read()
    document_text = _extract_pdf_text(file_bytes)

    if not document_text.strip():
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
            document_text, document_id, target_language
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
