from app.agent.next_best_action import get_next_best_action_index, is_blocked


def mk(**overrides) -> dict:
    defaults = dict(
        title="t",
        priority="medium",
        dependencies=[],
        status="todo",
        is_conditional=False,
        condition_status="unknown",
        deadline=None,
    )
    defaults.update(overrides)
    return defaults


def test_no_tasks_returns_none():
    assert get_next_best_action_index([]) is None


def test_picks_highest_priority_unblocked_task():
    tasks = [mk(priority="low"), mk(priority="high")]
    assert get_next_best_action_index(tasks) == 1


def test_skips_blocked_task():
    tasks = [mk(priority="low"), mk(priority="high", dependencies=[0])]
    assert get_next_best_action_index(tasks) == 0


def test_done_dependency_unblocks_downstream():
    tasks = [mk(priority="low", status="done"), mk(priority="high", dependencies=[0])]
    assert get_next_best_action_index(tasks) == 1
    assert not is_blocked(tasks, 1)


def test_conditional_task_is_only_a_fallback():
    tasks = [
        mk(title="conditional", priority="high", is_conditional=True),
        mk(title="regular", priority="low"),
    ]
    # Regular (unconditional) task wins even though its priority is lower.
    assert get_next_best_action_index(tasks) == 1


def test_conditional_not_applicable_is_excluded_and_unblocks():
    tasks = [
        mk(title="conditional", is_conditional=True, condition_status="not_applicable"),
        mk(title="depends on conditional", dependencies=[0]),
    ]
    assert get_next_best_action_index(tasks) == 1
    assert not is_blocked(tasks, 1)


def test_conditional_applies_is_treated_as_unconditional():
    tasks = [mk(title="conditional", priority="high", is_conditional=True, condition_status="applies")]
    assert get_next_best_action_index(tasks) == 0


def test_all_done_returns_none():
    tasks = [mk(status="done"), mk(status="done")]
    assert get_next_best_action_index(tasks) is None


def test_blocked_high_priority_task_loses_to_actionable_medium_task():
    """A blocked HIGH-priority task must never be recommended over an
    actionable MEDIUM task — readiness always outranks priority, since
    recommending something the user can't act on yet would be useless."""
    tasks = [
        mk(title="blocked-high", priority="high", dependencies=[1]),
        mk(title="prerequisite", priority="low"),
        mk(title="actionable-medium", priority="medium"),
    ]
    assert get_next_best_action_index(tasks) == 2


def test_same_priority_ties_break_by_blocking_count_then_deadline():
    """Deterministic tie-break order (mirrors the sort_key in
    get_next_best_action_index): priority, then how many tasks a candidate
    blocks (more blocking wins), then earliest deadline, in that order."""
    tasks = [
        mk(title="blocks-nothing", priority="medium", deadline="2026-01-01"),
        mk(title="blocks-one", priority="medium", deadline="2026-06-01"),
        mk(title="blocked-by-1", priority="low", dependencies=[1]),
    ]
    # "blocks-one" (index 1) blocks another task, so it wins the tie over
    # "blocks-nothing" despite having a later deadline.
    assert get_next_best_action_index(tasks) == 1


def test_same_priority_and_blocking_count_ties_break_by_earliest_deadline():
    tasks = [
        mk(title="later", priority="medium", deadline="2026-06-01"),
        mk(title="sooner", priority="medium", deadline="2026-01-01"),
    ]
    assert get_next_best_action_index(tasks) == 1


def test_no_actionable_task_returns_none_even_with_pending_work():
    """Every remaining task blocked -> waiting state (None), not an error and
    not a fallback guess."""
    tasks = [
        mk(title="A", dependencies=[1]),
        mk(title="B", dependencies=[0]),  # A and B block each other
    ]
    assert get_next_best_action_index(tasks) is None


def test_completing_current_recommendation_recomputes_a_new_one():
    """Simulates the reactive loop at the pure-function level: computing the
    index before and after a status flip must yield a different answer once
    the previous recommendation is marked done."""
    tasks = [mk(title="A", priority="high"), mk(title="B", dependencies=[0], priority="high")]
    first = get_next_best_action_index(tasks)
    assert first == 0

    tasks[first]["status"] = "done"
    second = get_next_best_action_index(tasks)
    assert second == 1
    assert second != first


def test_condition_unknown_is_not_assumed_applicable():
    """A conditional task with condition_status=unknown must not be picked
    over a plain unconditional task — the system never assumes an unanswered
    condition applies to the user."""
    tasks = [
        mk(title="conditional", priority="high", is_conditional=True, condition_status="unknown"),
        mk(title="regular", priority="low"),
    ]
    assert get_next_best_action_index(tasks) == 1


def test_condition_changed_from_unknown_to_applies_changes_recommendation():
    tasks = [
        mk(title="conditional", priority="high", is_conditional=True, condition_status="unknown"),
        mk(title="regular", priority="low"),
    ]
    assert get_next_best_action_index(tasks) == 1  # unconditional task wins while unknown

    tasks[0]["condition_status"] = "applies"
    assert get_next_best_action_index(tasks) == 0  # now treated as unconditional, wins on priority


def test_condition_changed_to_not_applicable_unblocks_dependents():
    tasks = [
        mk(title="conditional", is_conditional=True, condition_status="unknown", dependencies=[]),
        mk(title="dependent", dependencies=[0]),
    ]
    assert is_blocked(tasks, 1) is True  # unknown/unanswered condition still blocks

    tasks[0]["condition_status"] = "not_applicable"
    assert is_blocked(tasks, 1) is False
