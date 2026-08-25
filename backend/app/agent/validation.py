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


def resolve_priority(
    deadline: str | None, gemini_priority: str, blocks_another_task: bool, today: date
) -> tuple[str, str]:
    """Backend priority check: deadline proximity and blocking status win over
    Gemini's guess when they disagree, per the plan's priority rules.

    Returns (priority, reason) — the reason is always backend-computed so the
    UI can explain *why*, without trusting the model to justify itself.
    """
    if blocks_another_task:
        return "high", "Blocks another task"

    if deadline is None:
        if gemini_priority == "medium":
            return "medium", "Important but not time-bound"
        return "low", "No deadline or urgency stated"

    days_until = (date.fromisoformat(deadline) - today).days
    if days_until <= HIGH_PRIORITY_DAYS:
        return "high", _days_label(days_until)
    if days_until <= MEDIUM_PRIORITY_DAYS:
        return "medium", _days_label(days_until)
    return "low", f"Deadline is {days_until} days away"


def resolve_risk(
    deadline: str | None,
    blocks_another_task: bool,
    confidence: float,
    today: date,
) -> tuple[str, str]:
    """Risk is priority's sibling: it also weighs extraction confidence, so a
    vague/uncertain task can be flagged even when it has no near deadline."""
    days_until = (date.fromisoformat(deadline) - today).days if deadline else None

    if blocks_another_task:
        return "high", "Blocks other tasks — a delay here cascades."
    if days_until is not None and days_until <= HIGH_PRIORITY_DAYS:
        return "high", "Deadline is very close."
    if confidence < LOW_CONFIDENCE_THRESHOLD:
        return "medium", "Low extraction confidence — verify against the source."
    if days_until is None:
        return "medium", "No explicit deadline was stated."
    if days_until <= MEDIUM_PRIORITY_DAYS:
        return "medium", _days_label(days_until)
    return "low", "No immediate risk detected."


def flag_low_confidence(confidence: float, title: str, warnings: list[str]) -> None:
    if confidence < LOW_CONFIDENCE_THRESHOLD:
        warnings.append(
            f"Low confidence ({confidence:.2f}) for task '{title}' — wording may be ambiguous."
        )


def today_utc() -> date:
    return datetime.now(timezone.utc).date()
