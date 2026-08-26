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
