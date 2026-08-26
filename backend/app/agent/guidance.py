import json
from datetime import datetime, timezone

from google import genai

from app.config import settings
from app.models.schemas import TaskGuidance

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


GUIDANCE_PROMPT = """You are helping a user complete ONE specific task that was
extracted from an official document. You are given the task's own fields and
a short summary of the overall document — you do NOT have the full document
text, so don't invent details beyond what's given.

Produce two clearly separate kinds of content:

1. document_requirements: short bullet points restating what the task's own
   description/source excerpt/required documents/deadline ALREADY state.
   Never add anything not present in the given fields — if the task doesn't
   mention something, don't claim it does.
2. suggested_steps, prerequisites, common_mistakes: your OWN practical advice
   for actually getting this done — a sensible breakdown into steps, what
   should be ready before starting (you may reference the listed dependency
   tasks by name), and plausible pitfalls. This is your judgment, not the
   document's — keep it clearly a suggestion, don't phrase it as a stated
   requirement.

Task title: {title}
Task description: {description}
Source excerpt: {source_excerpt}
Required documents: {required_documents}
Deadline: {deadline}
Depends on (must be done first): {dependency_titles}
Document summary (for context only): {document_summary}
"""


async def generate_task_guidance(
    title: str,
    description: str,
    source_excerpt: str,
    required_documents: list[str],
    deadline: str | None,
    dependency_titles: list[str],
    document_summary: str,
) -> TaskGuidance:
    prompt = GUIDANCE_PROMPT.format(
        title=title,
        description=description,
        source_excerpt=source_excerpt or "(none)",
        required_documents=", ".join(required_documents) or "(none)",
        deadline=deadline or "(none stated)",
        dependency_titles=", ".join(dependency_titles) or "(none)",
        document_summary=document_summary or "(none)",
    )
    response = await _gemini_client().aio.models.generate_content(
        model=settings.gemini_model,
        contents=prompt,
        config={
            "response_mime_type": "application/json",
            "response_schema": TaskGuidance,
        },
    )
    guidance = TaskGuidance.model_validate(json.loads(response.text))
    guidance.generated_at = datetime.now(timezone.utc).isoformat()
    return guidance
