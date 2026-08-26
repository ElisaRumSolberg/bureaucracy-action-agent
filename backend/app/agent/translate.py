import json

from google import genai
from pydantic import BaseModel, Field

from app.config import settings

_client: genai.Client | None = None


def _gemini_client() -> genai.Client:
    global _client
    if _client is None:
        _client = genai.Client(
            vertexai=True,
            project=settings.google_cloud_project,
            location=settings.google_cloud_location,
        )
    return _client


class TranslatedTask(BaseModel):
    title: str
    description: str
    condition: str = ""
    required_documents: list[str] = Field(default_factory=list)


class TranslationResult(BaseModel):
    document_summary: str
    warnings: list[str] = Field(default_factory=list)
    missing_information: list[str] = Field(default_factory=list)
    consequences: list[str] = Field(default_factory=list)
    tasks: list[TranslatedTask] = Field(default_factory=list)


TRANSLATE_PROMPT = """Translate the following extracted-document content into
{language}. Preserve the exact meaning — this is a translation task, not a
rewrite or summary. Do NOT add, remove, merge, split, or reorder any list
item or task: the output must have exactly the same number of warnings,
missing_information items, consequences, and tasks (in the same order) as
the input. Deadlines, priorities, and other non-text fields are not part of
this input and must not be invented.

document_summary: {document_summary}
warnings: {warnings}
missing_information: {missing_information}
consequences: {consequences}
tasks (title | description | condition | required_documents):
{tasks}
"""


def _format_tasks_for_prompt(tasks: list[dict]) -> str:
    lines = []
    for i, task in enumerate(tasks):
        lines.append(
            f"{i}. title={task.get('title', '')!r} "
            f"description={task.get('description', '')!r} "
            f"condition={task.get('condition', '')!r} "
            f"required_documents={task.get('required_documents', [])!r}"
        )
    return "\n".join(lines) or "(none)"


async def translate_document_content(
    target_language: str,
    document_summary: str,
    warnings: list[str],
    missing_information: list[str],
    consequences: list[str],
    tasks: list[dict],
) -> TranslationResult:
    """Translates already-extracted content into target_language. Always
    translates FROM the document's original-language snapshot (the caller's
    responsibility to pass that in), never from a previous translation, so
    switching languages repeatedly can't compound translation drift."""
    prompt = TRANSLATE_PROMPT.format(
        language=target_language,
        document_summary=document_summary,
        warnings=warnings or "(none)",
        missing_information=missing_information or "(none)",
        consequences=consequences or "(none)",
        tasks=_format_tasks_for_prompt(tasks),
    )
    response = await _gemini_client().aio.models.generate_content(
        model=settings.gemini_model,
        contents=prompt,
        config={
            "response_mime_type": "application/json",
            "response_schema": TranslationResult,
        },
    )
    result = TranslationResult.model_validate(json.loads(response.text))

    if len(result.tasks) != len(tasks):
        # Structured output occasionally drops/merges items under length
        # pressure — never trust a translation that would desync task
        # indices from the rest of the app's state.
        raise ValueError(
            f"Translation returned {len(result.tasks)} tasks, expected {len(tasks)}."
        )

    return result
