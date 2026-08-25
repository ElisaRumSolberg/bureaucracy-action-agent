import uuid

from app.agent.validation import (
    flag_low_confidence,
    normalize_deadline,
    resolve_priority,
    resolve_risk,
    today_utc,
)
from app.firestore_client import get_firestore_client
from app.models.schemas import (
    ExtractionResult,
    SaveTasksResult,
    Task,
    ValidatedTask,
    ValidationResult,
)


def validate_tasks(extraction: ExtractionResult) -> ValidationResult:
    """Tool 2: dedupe, normalize dates, sanity-check priority/dependencies."""
    warnings = list(extraction.warnings)

    # Dedupe first, tracking how original indices map onto the deduped list
    # so dependency references (which point at original indices) still resolve.
    seen_titles: set[str] = set()
    deduped: list[Task] = []
    old_to_new: dict[int, int] = {}

    for old_index, task in enumerate(extraction.tasks):
        key = task.title.strip().lower()
        if key in seen_titles:
            warnings.append(f"Duplicate task removed: {task.title}")
            continue
        seen_titles.add(key)
        old_to_new[old_index] = len(deduped)
        deduped.append(task)

    # Remap and drop out-of-range/self dependency references.
    remapped_dependencies: list[list[int]] = []
    for new_index, task in enumerate(deduped):
        deps = set()
        for dep in task.dependencies:
            new_dep = old_to_new.get(dep)
            if new_dep is None:
                warnings.append(
                    f"Dropped invalid dependency on task '{task.title}' "
                    f"(referenced task no longer exists)."
                )
            elif new_dep == new_index:
                warnings.append(f"Task '{task.title}' depended on itself — dropped.")
            else:
                deps.add(new_dep)
        remapped_dependencies.append(sorted(deps))

    blocks_another_task = {dep for deps in remapped_dependencies for dep in deps}
    today = today_utc()

    validated: list[ValidatedTask] = []
    for index, task in enumerate(deduped):
        deadline = normalize_deadline(task.deadline, warnings, task.title)
        flag_low_confidence(task.confidence, task.title, warnings)
        blocks_task = index in blocks_another_task
        priority, priority_reason = resolve_priority(
            deadline=deadline,
            gemini_priority=task.priority,
            blocks_another_task=blocks_task,
            today=today,
        )
        risk_level, risk_reason = resolve_risk(
            deadline=deadline,
            blocks_another_task=blocks_task,
            confidence=task.confidence,
            today=today,
        )
        validated.append(
            ValidatedTask(
                **{
                    **task.model_dump(),
                    "deadline": deadline,
                    "priority": priority,
                    "dependencies": remapped_dependencies[index],
                },
                status="todo",
                priority_reason=priority_reason,
                risk_level=risk_level,
                risk_reason=risk_reason,
            )
        )

    return ValidationResult(
        tasks=validated,
        warnings=warnings,
        missing_information=extraction.missing_information,
        consequences=extraction.consequences,
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
