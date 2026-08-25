import json
import uuid

from google import genai

from app.agent.prompts import SYSTEM_PROMPT
from app.config import settings
from app.firestore_client import get_firestore_client
from app.models.schemas import (
    ExtractionResult,
    SaveTasksResult,
    ValidatedTask,
    ValidationResult,
)

_client = None


def _gemini_client() -> genai.Client:
    global _client
    if _client is None:
        _client = genai.Client(api_key=settings.gemini_api_key)
    return _client


def extract_document_actions(document_text: str) -> ExtractionResult:
    """Tool 1: convert raw document text into structured actions/deadlines/docs."""
    response = _gemini_client().models.generate_content(
        model=settings.gemini_model,
        contents=f"{SYSTEM_PROMPT}\n\nDocument text:\n{document_text}",
        config={
            "response_mime_type": "application/json",
            "response_schema": ExtractionResult,
        },
    )
    return ExtractionResult.model_validate(json.loads(response.text))


def validate_tasks(extraction: ExtractionResult) -> ValidationResult:
    """Tool 2: dedupe, normalize dates, sanity-check priority/dependencies."""
    seen_titles: set[str] = set()
    validated: list[ValidatedTask] = []
    warnings = list(extraction.warnings)

    for task in extraction.tasks:
        key = task.title.strip().lower()
        if key in seen_titles:
            warnings.append(f"Duplicate task removed: {task.title}")
            continue
        seen_titles.add(key)
        validated.append(ValidatedTask(**task.model_dump(), status="todo"))

    return ValidationResult(
        tasks=validated,
        warnings=warnings,
        missing_information=extraction.missing_information,
    )


def save_tasks(document_id: str, validation: ValidationResult) -> SaveTasksResult:
    """Tool 3: persist validated tasks to Firestore."""
    db = get_firestore_client()
    saved_ids: list[str] = []

    for task in validation.tasks:
        task_id = f"task_{uuid.uuid4().hex[:8]}"
        db.collection("tasks").document(task_id).set(
            {
                "documentId": document_id,
                **task.model_dump(),
            }
        )
        saved_ids.append(task_id)

    return SaveTasksResult(success=True, saved_task_ids=saved_ids)
