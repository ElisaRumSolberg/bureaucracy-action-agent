import io
import logging
import uuid

from fastapi import APIRouter, HTTPException, UploadFile
from pypdf import PdfReader
from pypdf.errors import PdfReadError

from app.agent.tools import extract_document_actions, save_tasks, validate_tasks
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


def _extract_with_retry(document_text: str):
    try:
        return extract_document_actions(document_text)
    except Exception:  # noqa: BLE001
        logger.warning("Gemini extraction failed, retrying once", exc_info=True)
        return extract_document_actions(document_text)


@router.post("/upload")
async def upload_document(file: UploadFile):
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
        extraction = _extract_with_retry(document_text)
        validation = validate_tasks(extraction)
        result = save_tasks(document_id, validation)
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
            "summary": extraction.document_summary,
            "agentRunStatus": "success",
        }
    )

    warnings = list(validation.warnings)
    if not validation.tasks:
        warnings.append("No explicit required actions were detected.")

    return {
        "document_id": document_id,
        "summary": extraction.document_summary,
        "tasks": [t.model_dump() for t in validation.tasks],
        "warnings": warnings,
        "missing_information": validation.missing_information,
        "saved_task_ids": result.saved_task_ids,
    }
