"""Dependency-graph behavior of next_best_action.is_blocked/get_next_best_action_index
— the runtime blocking logic, as distinct from validation.remove_cyclic_dependencies
(covered in test_validate_tasks.py), which only runs once at extraction time."""

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


def test_b_depends_on_a_stays_blocked_while_a_incomplete():
    tasks = [mk(title="A"), mk(title="B", dependencies=[0])]
    assert is_blocked(tasks, 1) is True


def test_b_unblocks_once_a_is_done():
    tasks = [mk(title="A", status="done"), mk(title="B", dependencies=[0])]
    assert is_blocked(tasks, 1) is False


def test_multiple_dependencies_all_must_be_satisfied():
    tasks = [
        mk(title="A", status="done"),
        mk(title="B", status="todo"),
        mk(title="C", dependencies=[0, 1]),
    ]
    # A done but B not done -> C still blocked.
    assert is_blocked(tasks, 2) is True

    tasks[1]["status"] = "done"
    assert is_blocked(tasks, 2) is False


def test_downstream_chain_a_b_c():
    tasks = [mk(title="A"), mk(title="B", dependencies=[0]), mk(title="C", dependencies=[1])]
    assert is_blocked(tasks, 0) is False
    assert is_blocked(tasks, 1) is True
    assert is_blocked(tasks, 2) is True


def test_completing_a_does_not_incorrectly_unblock_c_while_b_incomplete():
    tasks = [
        mk(title="A", status="done"),
        mk(title="B", dependencies=[0], status="todo"),
        mk(title="C", dependencies=[1]),
    ]
    assert is_blocked(tasks, 1) is False  # B unblocked by A
    assert is_blocked(tasks, 2) is True  # C still blocked — B (its actual dependency) isn't done


def test_out_of_range_dependency_reference_does_not_crash():
    """A reference to a nonexistent task index (e.g. a dropped/renumbered
    task) must not raise — is_blocked treats a stale index as unresolvable,
    not as satisfied, since get_next_best_action_index/is_blocked never
    validate indices themselves (validation.py's remapping is what normally
    prevents this upstream)."""
    tasks = [mk(title="A", dependencies=[99])]
    # Should not raise IndexError.
    is_blocked(tasks, 0)


def test_get_next_best_action_handles_out_of_range_dependency_safely():
    tasks = [mk(title="A", dependencies=[99], priority="high")]
    # Must not crash the whole recommendation computation.
    get_next_best_action_index(tasks)


def test_self_referencing_dependency_is_treated_as_blocked_not_a_crash():
    """A task erroneously depending on itself (should be stripped upstream by
    validation.py, but if it ever slipped through) must not infinite-loop —
    is_blocked only looks one level deep per call, so a self-reference just
    reads as "blocked forever" rather than recursing."""
    tasks = [mk(title="A", dependencies=[0])]
    assert is_blocked(tasks, 0) is True
