from datetime import timedelta

import pytest
from pydantic import ValidationError

from app.agent.tools import validate_tasks
from app.agent.validation import today_utc
from app.models.schemas import ExtractionResult, Task


def make_task(**overrides) -> Task:
    defaults = dict(
        title="Do the thing",
        description="Description.",
        deadline=None,
        priority="low",
        dependencies=[],
        required_documents=[],
        confidence=0.9,
        source_excerpt="Do the thing.",
    )
    defaults.update(overrides)
    return Task(**defaults)


def test_task_missing_required_field_is_rejected():
    """Current project behavior: a Task without a required field (title,
    description, priority, confidence, source_excerpt) is rejected outright
    via a Pydantic ValidationError — there is no silent normalization to
    defaults for these, unlike ValidatedTask's own fields (status,
    priority_reason, etc.), which do have defaults."""
    with pytest.raises(ValidationError):
        Task(title="Missing everything else")


def test_task_with_hallucinated_extra_field_is_silently_ignored():
    """Pydantic's default behavior (no extra='forbid' configured) drops
    unknown keys rather than raising — an LLM inventing an extra field on a
    task must not crash extraction."""
    task = Task(
        title="x",
        description="d",
        priority="low",
        confidence=0.9,
        source_excerpt="e",
        made_up_field="should be dropped",  # type: ignore[call-arg]
    )
    assert "made_up_field" not in task.model_dump()


def test_no_deadline_stays_null():
    """Plan Test 2: document with no deadline -> deadline must stay null."""
    extraction = ExtractionResult(
        document_summary="s",
        tasks=[make_task(title="Read the notice", deadline=None, priority="low")],
    )
    result = validate_tasks(extraction)
    assert result.tasks[0].deadline is None


def test_optional_task_not_promoted_to_high():
    """Plan Test 3: optional item should not become a high-priority mandatory task."""
    extraction = ExtractionResult(
        document_summary="s",
        tasks=[
            make_task(
                title="Optionally update your mailing address",
                deadline=None,
                priority="low",
            )
        ],
    )
    result = validate_tasks(extraction)
    assert result.tasks[0].priority == "low"


def test_duplicate_tasks_removed():
    """Plan Test 4: repeated instruction -> no duplicate tasks."""
    extraction = ExtractionResult(
        document_summary="s",
        tasks=[
            make_task(title="Upload passport"),
            make_task(title="upload passport  "),  # same task, different case/whitespace
        ],
    )
    result = validate_tasks(extraction)
    assert len(result.tasks) == 1
    assert any("Duplicate" in w for w in result.warnings)


def test_vague_wording_flagged_low_confidence():
    """Plan Test 5: vague wording -> low confidence / warning."""
    extraction = ExtractionResult(
        document_summary="s",
        tasks=[make_task(title="Submit soon", confidence=0.3)],
    )
    result = validate_tasks(extraction)
    assert any("Low confidence" in w for w in result.warnings)


def test_deadline_within_three_days_is_high_priority():
    soon = (today_utc() + timedelta(days=2)).isoformat()
    extraction = ExtractionResult(
        document_summary="s",
        tasks=[make_task(title="Urgent thing", deadline=soon, priority="low")],
    )
    result = validate_tasks(extraction)
    assert result.tasks[0].priority == "high"


def test_deadline_far_away_is_low_priority():
    later = (today_utc() + timedelta(days=30)).isoformat()
    extraction = ExtractionResult(
        document_summary="s",
        tasks=[make_task(title="Eventually", deadline=later, priority="high")],
    )
    result = validate_tasks(extraction)
    assert result.tasks[0].priority == "low"


def test_blocking_task_escalates_one_tier_without_deadline():
    """Blocking bumps priority by one tier (low -> medium), it doesn't force
    "high" outright — in a long dependency chain almost everything blocks
    something, so forcing high everywhere would make the badge meaningless."""
    extraction = ExtractionResult(
        document_summary="s",
        tasks=[
            make_task(title="Upload passport", deadline=None, priority="low"),
            make_task(title="Complete form", dependencies=[0], priority="low"),
        ],
    )
    result = validate_tasks(extraction)
    assert result.tasks[0].priority == "medium"  # blocks task 1, escalated from low


def test_blocking_task_with_near_deadline_stays_high():
    soon = (today_utc() + timedelta(days=1)).isoformat()
    extraction = ExtractionResult(
        document_summary="s",
        tasks=[
            make_task(title="Upload passport", deadline=soon, priority="low"),
            make_task(title="Complete form", dependencies=[0], priority="low"),
        ],
    )
    result = validate_tasks(extraction)
    assert result.tasks[0].priority == "high"
    assert "1 day" in result.tasks[0].priority_reason  # deadline reason wins over blocking


def test_dependency_indices_remapped_after_dedupe():
    extraction = ExtractionResult(
        document_summary="s",
        tasks=[
            make_task(title="Upload passport"),
            make_task(title="upload passport"),  # duplicate of index 0, removed
            make_task(title="Complete form", dependencies=[0]),
        ],
    )
    result = validate_tasks(extraction)
    assert len(result.tasks) == 2
    assert result.tasks[1].title == "Complete form"
    assert result.tasks[1].dependencies == [0]


def test_invalid_dependency_index_dropped_with_warning():
    extraction = ExtractionResult(
        document_summary="s",
        tasks=[make_task(title="Complete form", dependencies=[7])],
    )
    result = validate_tasks(extraction)
    assert result.tasks[0].dependencies == []
    assert any("invalid dependency" in w for w in result.warnings)


def test_natural_language_deadline_is_normalized_to_iso():
    """Gemini sometimes ignores the ISO-format instruction; fall back gracefully."""
    extraction = ExtractionResult(
        document_summary="s",
        tasks=[make_task(title="Upload passport", deadline="August 29, 2026")],
    )
    result = validate_tasks(extraction)
    assert result.tasks[0].deadline == "2026-08-29"


def test_unparseable_deadline_becomes_null_with_warning():
    extraction = ExtractionResult(
        document_summary="s",
        tasks=[make_task(title="Submit soon", deadline="soon")],
    )
    result = validate_tasks(extraction)
    assert result.tasks[0].deadline is None
    assert any("Could not parse deadline" in w for w in result.warnings)


def test_blocking_task_has_priority_and_risk_reason():
    extraction = ExtractionResult(
        document_summary="s",
        tasks=[
            make_task(title="Upload passport", deadline=None, priority="low"),
            make_task(title="Complete form", dependencies=[0], priority="low"),
        ],
    )
    result = validate_tasks(extraction)
    blocker = result.tasks[0]
    assert blocker.priority_reason == "Blocks another task"
    assert blocker.risk_level == "high"
    assert "cascades" in blocker.risk_reason.lower()


def test_near_deadline_gives_days_based_reason():
    soon = (today_utc() + timedelta(days=2)).isoformat()
    extraction = ExtractionResult(
        document_summary="s",
        tasks=[make_task(title="Urgent thing", deadline=soon, priority="low")],
    )
    result = validate_tasks(extraction)
    assert "2 days" in result.tasks[0].priority_reason
    assert result.tasks[0].risk_level == "high"


def test_low_confidence_task_flagged_medium_risk_even_without_deadline():
    extraction = ExtractionResult(
        document_summary="s",
        tasks=[make_task(title="Vague thing", deadline=None, confidence=0.3)],
    )
    result = validate_tasks(extraction)
    assert result.tasks[0].risk_level == "medium"
    assert "confidence" in result.tasks[0].risk_reason.lower()


def test_consequences_pass_through_from_extraction():
    extraction = ExtractionResult(
        document_summary="s",
        tasks=[make_task()],
        consequences=["Your application may be delayed."],
    )
    result = validate_tasks(extraction)
    assert result.consequences == ["Your application may be delayed."]


def test_circular_dependency_is_dropped_with_warning():
    """A depends on B and B depends on A — one edge must be dropped or the
    UI's dependency graph and Next Best Action logic would deadlock."""
    extraction = ExtractionResult(
        document_summary="s",
        tasks=[
            make_task(title="Task A", dependencies=[1]),
            make_task(title="Task B", dependencies=[0]),
        ],
    )
    result = validate_tasks(extraction)
    # Exactly one direction of the cycle should survive.
    assert (result.tasks[0].dependencies == [1]) != (result.tasks[1].dependencies == [0])
    assert any("circular dependency" in w.lower() for w in result.warnings)


def test_three_way_cycle_is_broken():
    extraction = ExtractionResult(
        document_summary="s",
        tasks=[
            make_task(title="Task A", dependencies=[2]),
            make_task(title="Task B", dependencies=[0]),
            make_task(title="Task C", dependencies=[1]),
        ],
    )
    result = validate_tasks(extraction)
    # No task should be able to (transitively) depend on itself afterward.
    graph = [t.dependencies for t in result.tasks]

    def reaches(start, target, seen):
        if start == target:
            return True
        seen.add(start)
        return any(n not in seen and reaches(n, target, seen) for n in graph[start])

    for i in range(len(graph)):
        assert not any(reaches(dep, i, set()) for dep in graph[i])
