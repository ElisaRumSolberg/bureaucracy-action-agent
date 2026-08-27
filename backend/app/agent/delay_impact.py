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


def compute_downstream_impact(all_tasks: list[dict], target_index: int) -> dict:
    """Deterministic graph walk: which not-yet-done tasks depend, directly or
    transitively, on the task at target_index. This is the ground truth the
    LLM is only allowed to phrase in natural language, never to invent."""
    downstream: set[int] = set()
    changed = True
    while changed:
        changed = False
        for idx, task in enumerate(all_tasks):
            if idx in downstream or idx == target_index:
                continue
            # A conditional task the user has ruled out is already treated as
            # "satisfied" for unblocking purposes elsewhere (next_best_action.
            # is_satisfied) — it can neither be impacted by a delay nor pass
            # one along to whatever depends on it, so it never enters the
            # downstream set at all.
            if task.get("is_conditional") and task.get("condition_status") == "not_applicable":
                continue
            deps = task.get("dependencies", [])
            if target_index in deps or any(dep in downstream for dep in deps):
                downstream.add(idx)
                changed = True

    pending = [i for i in sorted(downstream) if all_tasks[i].get("status") != "done"]
    titles = [all_tasks[i]["title"] for i in pending]

    deadlined = sorted(
        (
            (all_tasks[i]["deadline"], all_tasks[i]["title"])
            for i in pending
            if all_tasks[i].get("deadline")
        ),
        key=lambda pair: pair[0],
    )
    earliest_deadline, earliest_task = deadlined[0] if deadlined else (None, None)

    return {
        "downstream_count": len(pending),
        "downstream_titles": titles,
        "earliest_downstream_deadline": earliest_deadline,
        "earliest_downstream_task": earliest_task,
    }


DELAY_IMPACT_PROMPT = """You explain, in 2-4 short sentences, what delaying ONE
task would mean for the rest of the plan. Use ONLY the computed facts given
below — never invent additional downstream tasks, deadlines, or consequences
beyond what's listed here. If there are zero downstream tasks, say clearly
that delaying this task doesn't block anything else, but still mention its
own deadline risk if one is stated.

Task being delayed: {title}
Task's own deadline: {deadline}
Number of not-yet-done tasks that depend on this one, directly or indirectly: {downstream_count}
Those downstream tasks: {downstream_titles}
Earliest downstream deadline put at risk: {earliest_deadline} (task: {earliest_task})
Document-level consequences mentioned in the source document: {consequences}
"""


async def generate_delay_impact_summary(
    title: str,
    deadline: str | None,
    downstream_count: int,
    downstream_titles: list[str],
    earliest_deadline: str | None,
    earliest_task: str | None,
    consequences: list[str],
) -> str:
    prompt = DELAY_IMPACT_PROMPT.format(
        title=title,
        deadline=deadline or "(none stated)",
        downstream_count=downstream_count,
        downstream_titles=", ".join(downstream_titles) or "(none)",
        earliest_deadline=earliest_deadline or "(none)",
        earliest_task=earliest_task or "(none)",
        consequences="; ".join(consequences) or "(none)",
    )
    response = await _gemini_client().aio.models.generate_content(
        model=settings.gemini_model,
        contents=prompt,
    )
    return (response.text or "").strip()
