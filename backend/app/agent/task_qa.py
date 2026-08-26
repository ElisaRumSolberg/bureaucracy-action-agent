from google import genai

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


TASK_QA_PROMPT = """You answer a user's question about ONE specific task that was
extracted from an official document. Answer ONLY using the context given below
— the task's own fields, its dependencies, the document summary, and the
document's warnings/consequences. Do NOT use outside knowledge, do not guess
at rules, laws, or procedures that aren't stated in the context.

If the context doesn't contain enough information to answer, say so honestly
(e.g. "The document doesn't state this — you may need to check the original
source or contact the relevant office.") instead of making something up.

Keep the answer short (2-4 sentences), direct, and in the same language as the
question.

Task title: {title}
Task description: {description}
Source excerpt: {source_excerpt}
Required documents: {required_documents}
Deadline: {deadline}
Priority: {priority} ({priority_reason})
Risk: {risk_level} ({risk_reason})
Is conditional: {is_conditional} {condition}
Depends on (must be done first): {dependency_titles}
Document summary: {document_summary}
Document warnings: {warnings}
Possible consequences of missing tasks: {consequences}

User question: {question}
"""


async def answer_task_question(
    question: str,
    title: str,
    description: str,
    source_excerpt: str,
    required_documents: list[str],
    deadline: str | None,
    priority: str,
    priority_reason: str,
    risk_level: str,
    risk_reason: str,
    is_conditional: bool,
    condition: str,
    dependency_titles: list[str],
    document_summary: str,
    warnings: list[str],
    consequences: list[str],
) -> str:
    prompt = TASK_QA_PROMPT.format(
        title=title,
        description=description,
        source_excerpt=source_excerpt or "(none)",
        required_documents=", ".join(required_documents) or "(none)",
        deadline=deadline or "(none stated)",
        priority=priority,
        priority_reason=priority_reason or "(none)",
        risk_level=risk_level,
        risk_reason=risk_reason or "(none)",
        is_conditional=is_conditional,
        condition=condition or "",
        dependency_titles=", ".join(dependency_titles) or "(none)",
        document_summary=document_summary or "(none)",
        warnings="; ".join(warnings) or "(none)",
        consequences="; ".join(consequences) or "(none)",
        question=question,
    )
    response = await _gemini_client().aio.models.generate_content(
        model=settings.gemini_model,
        contents=prompt,
    )
    return (response.text or "").strip()
