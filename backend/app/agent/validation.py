from datetime import date, datetime, timezone

from dateutil import parser as dateutil_parser

LOW_CONFIDENCE_THRESHOLD = 0.5
HIGH_PRIORITY_DAYS = 3
MEDIUM_PRIORITY_DAYS = 14


def normalize_deadline(raw: str | None, warnings: list[str], title: str) -> str | None:
    """Return an ISO date string or None. Never invents a date."""
    if not raw:
        return None
    try:
        return datetime.fromisoformat(raw).date().isoformat()
    except ValueError:
        pass
    try:
        # Model didn't follow the ISO 8601 instruction — fall back to a
        # lenient parse (e.g. "August 29, 2026") rather than discard a
        # real, explicitly-stated deadline.
        return dateutil_parser.parse(raw).date().isoformat()
    except (ValueError, OverflowError):
        warnings.append(
            f"Could not parse deadline '{raw}' for task '{title}' — treated as no deadline."
        )
        return None


def _days_label(days_until: int) -> str:
    if days_until < 0:
        return "Overdue"
    if days_until == 0:
        return "Due today"
    if days_until == 1:
        return "Due in 1 day"
    return f"Due in {days_until} days"


_TIERS = ["low", "medium", "high"]


def _escalate(tier: str) -> str:
    return _TIERS[min(_TIERS.index(tier) + 1, len(_TIERS) - 1)]


def resolve_priority(
    deadline: str | None, gemini_priority: str, blocks_another_task: bool, today: date
) -> tuple[str, str]:
    """Backend priority check: deadline proximity wins over Gemini's guess
    when they disagree, per the plan's priority rules.

    Blocking another task escalates priority by one tier rather than forcing
    "high" outright — in a long dependency chain (e.g. a 12-step assignment),
    nearly every task blocks *something*, and forcing them all to "high"
    makes the signal meaningless. A task with a distant deadline that merely
    blocks one later step is more reasonably "medium" than "high".

    Returns (priority, reason) — the reason is always backend-computed so the
    UI can explain *why*, without trusting the model to justify itself.
    """
    if deadline is None:
        base_priority = "medium" if gemini_priority == "medium" else "low"
        base_reason = (
            "Important but not time-bound"
            if base_priority == "medium"
            else "No deadline or urgency stated"
        )
    else:
        days_until = (date.fromisoformat(deadline) - today).days
        if days_until <= HIGH_PRIORITY_DAYS:
            base_priority, base_reason = "high", _days_label(days_until)
        elif days_until <= MEDIUM_PRIORITY_DAYS:
            base_priority, base_reason = "medium", _days_label(days_until)
        else:
            base_priority, base_reason = "low", f"Deadline is {days_until} days away"

    if not blocks_another_task or base_priority == "high":
        return base_priority, base_reason
    return _escalate(base_priority), "Blocks another task"


def resolve_risk(
    deadline: str | None,
    blocks_another_task: bool,
    confidence: float,
    today: date,
) -> tuple[str, str]:
    """Risk is priority's sibling: it also weighs extraction confidence, so a
    vague/uncertain task can be flagged even when it has no near deadline.
    Blocking escalates by one tier, same reasoning as resolve_priority."""
    days_until = (date.fromisoformat(deadline) - today).days if deadline else None

    if days_until is not None and days_until <= HIGH_PRIORITY_DAYS:
        base_risk, base_reason = "high", "Deadline is very close."
    elif confidence < LOW_CONFIDENCE_THRESHOLD:
        base_risk, base_reason = "medium", "Low extraction confidence — verify against the source."
    elif days_until is None:
        base_risk, base_reason = "medium", "No explicit deadline was stated."
    elif days_until <= MEDIUM_PRIORITY_DAYS:
        base_risk, base_reason = "medium", _days_label(days_until)
    else:
        base_risk, base_reason = "low", "No immediate risk detected."

    if not blocks_another_task or base_risk == "high":
        return base_risk, base_reason
    return _escalate(base_risk), "Blocks other tasks — a delay here cascades."


def remove_cyclic_dependencies(
    dependencies: list[list[int]], titles: list[str], warnings: list[str]
) -> list[list[int]]:
    """Drop any dependency edge that would close a cycle (A depends on B who
    (transitively) already depends on A). Builds the DAG incrementally,
    checking reachability before accepting each edge, so cycles longer than
    a simple A<->B pair are caught too."""
    approved: list[set[int]] = [set() for _ in dependencies]

    def reaches(start: int, target: int, seen: set[int]) -> bool:
        if start == target:
            return True
        seen.add(start)
        for nxt in approved[start]:
            if nxt not in seen and reaches(nxt, target, seen):
                return True
        return False

    result: list[list[int]] = []
    for index, deps in enumerate(dependencies):
        kept: list[int] = []
        for dep in deps:
            if reaches(dep, index, set()):
                warnings.append(
                    f"Dropped a circular dependency: '{titles[index]}' -> "
                    f"'{titles[dep]}' would create a cycle."
                )
                continue
            kept.append(dep)
            approved[index].add(dep)
        result.append(sorted(kept))
    return result


def flag_low_confidence(confidence: float, title: str, warnings: list[str]) -> None:
    if confidence < LOW_CONFIDENCE_THRESHOLD:
        warnings.append(
            f"Low confidence ({confidence:.2f}) for task '{title}' — wording may be ambiguous."
        )


def today_utc() -> date:
    return datetime.now(timezone.utc).date()
