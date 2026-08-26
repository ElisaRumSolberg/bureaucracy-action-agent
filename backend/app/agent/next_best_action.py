"""Python port of frontend/lib/taskGraph.ts's getNextBestAction. Kept in sync
by hand — this lets the backend narrate recommendation changes in the agent
activity log without the frontend and backend disagreeing on which task is
"next"."""

_PRIORITY_RANK = {"high": 0, "medium": 1, "low": 2}


def is_done(task: dict) -> bool:
    return task.get("status") == "done"


def is_condition_not_applicable(task: dict) -> bool:
    return bool(task.get("is_conditional")) and task.get("condition_status") == "not_applicable"


def is_satisfied(task: dict) -> bool:
    return is_done(task) or is_condition_not_applicable(task)


def is_blocked(tasks: list[dict], index: int) -> bool:
    task = tasks[index]
    return any(
        not is_satisfied(tasks[dep])
        for dep in task.get("dependencies", [])
        if 0 <= dep < len(tasks)
    )


def blocking_count(tasks: list[dict], index: int) -> int:
    return sum(1 for t in tasks if index in t.get("dependencies", []))


def get_next_best_action_index(tasks: list[dict]) -> int | None:
    unblocked = [
        i
        for i, t in enumerate(tasks)
        if not is_done(t) and not is_condition_not_applicable(t) and not is_blocked(tasks, i)
    ]
    if not unblocked:
        return None

    unconditional = [
        i
        for i in unblocked
        if not tasks[i].get("is_conditional") or tasks[i].get("condition_status") == "applies"
    ]
    eligible = unconditional if unconditional else unblocked

    def sort_key(i: int):
        t = tasks[i]
        priority_rank = _PRIORITY_RANK.get(t.get("priority"), 1)
        blocks = -blocking_count(tasks, i)
        deadline = t.get("deadline") or "9999-99-99"
        return (priority_rank, blocks, deadline)

    eligible.sort(key=sort_key)
    return eligible[0]
