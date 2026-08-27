from app.agent.delay_impact import compute_downstream_impact


def make(
    title,
    dependencies=None,
    deadline=None,
    status="todo",
    is_conditional=False,
    condition_status="unknown",
):
    return {
        "title": title,
        "dependencies": dependencies or [],
        "deadline": deadline,
        "status": status,
        "is_conditional": is_conditional,
        "condition_status": condition_status,
    }


def test_no_downstream_tasks():
    tasks = [make("A"), make("B", dependencies=[0])]
    impact = compute_downstream_impact(tasks, target_index=1)
    assert impact["downstream_count"] == 0
    assert impact["downstream_titles"] == []


def test_direct_and_transitive_downstream_tasks():
    # A <- B <- C (C depends on B, B depends on A)
    tasks = [make("A"), make("B", dependencies=[0]), make("C", dependencies=[1])]
    impact = compute_downstream_impact(tasks, target_index=0)
    assert impact["downstream_count"] == 2
    assert impact["downstream_titles"] == ["B", "C"]


def test_done_downstream_tasks_are_excluded():
    tasks = [make("A"), make("B", dependencies=[0], status="done")]
    impact = compute_downstream_impact(tasks, target_index=0)
    assert impact["downstream_count"] == 0


def test_earliest_downstream_deadline_is_reported():
    tasks = [
        make("A"),
        make("B", dependencies=[0], deadline="2026-09-05"),
        make("C", dependencies=[0], deadline="2026-09-01"),
    ]
    impact = compute_downstream_impact(tasks, target_index=0)
    assert impact["earliest_downstream_deadline"] == "2026-09-01"
    assert impact["earliest_downstream_task"] == "C"


def test_unrelated_branch_is_not_downstream():
    tasks = [make("A"), make("B", dependencies=[0]), make("C")]
    impact = compute_downstream_impact(tasks, target_index=0)
    assert impact["downstream_titles"] == ["B"]


def test_not_applicable_conditional_task_does_not_produce_false_downstream_impact():
    """A -> B (conditional, excluded via not_applicable) -> C. Since B is
    excluded from the workflow, C isn't really gated by A anymore (next best
    action already treats B as satisfied for unblocking purposes) — delaying
    A must not falsely report B or C as impacted."""
    tasks = [
        make("A"),
        make("B", dependencies=[0], is_conditional=True, condition_status="not_applicable"),
        make("C", dependencies=[1]),
    ]
    impact = compute_downstream_impact(tasks, target_index=0)
    assert impact["downstream_count"] == 0
    assert impact["downstream_titles"] == []


def test_delaying_task_with_no_dependents_returns_no_downstream_impact():
    tasks = [make("A"), make("B")]  # B does not depend on A
    impact = compute_downstream_impact(tasks, target_index=0)
    assert impact["downstream_count"] == 0
