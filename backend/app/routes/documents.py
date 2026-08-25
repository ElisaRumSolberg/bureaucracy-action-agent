import uuid

from fastapi import APIRouter, HTTPException, UploadFile
from pypdf import PdfReader

from app.agent.tools import extract_document_actions, save_tasks, validate_tasks
from app.firestore_client import get_firestore_client

router = APIRouter(prefix="/documents", tags=["documents"])


def _extract_pdf_text(file_bytes: bytes) -> str:
    import io

    reader = PdfReader(io.BytesIO(file_bytes))
    return "\n".join(page.extract_text() or "" for page in reader.pages)


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
        extraction = extract_document_actions(document_text)
        validation = validate_tasks(extraction)
        result = save_tasks(document_id, validation)
    except Exception as exc:  # noqa: BLE001
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

    return {
        "document_id": document_id,
        "summary": extraction.document_summary,
        "tasks": [t.model_dump() for t in validation.tasks],
        "warnings": validation.warnings,
        "missing_information": validation.missing_information,
        "saved_task_ids": result.saved_task_ids,
    }
