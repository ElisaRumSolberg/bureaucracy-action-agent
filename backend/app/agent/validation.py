from datetime import date, datetime, timezone

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
        warnings.append(
            f"Could not parse deadline '{raw}' for task '{title}' — treated as no deadline."
        )
        return None


def resolve_priority(
    deadline: str | None, gemini_priority: str, blocks_another_task: bool, today: date
) -> str:
    """Backend priority check: deadline proximity and blocking status win over
    Gemini's guess when they disagree, per the plan's priority rules."""
    if blocks_another_task:
        return "high"

    if deadline is None:
        return gemini_priority if gemini_priority in ("low", "medium") else "low"

    days_until = (date.fromisoformat(deadline) - today).days
    if days_until <= HIGH_PRIORITY_DAYS:
        return "high"
    if days_until <= MEDIUM_PRIORITY_DAYS:
        return "medium"
    return "low"


def flag_low_confidence(confidence: float, title: str, warnings: list[str]) -> None:
    if confidence < LOW_CONFIDENCE_THRESHOLD:
        warnings.append(
            f"Low confidence ({confidence:.2f}) for task '{title}' — wording may be ambiguous."
        )


def today_utc() -> date:
    return datetime.now(timezone.utc).date()
