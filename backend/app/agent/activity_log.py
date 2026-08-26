from datetime import datetime, timezone


def log_event(db, document_id: str, event_type: str, message: str) -> None:
    """Append one entry to the document's agent activity feed. Best-effort:
    the caller should not fail the request if logging itself fails, so this
    is called directly (Firestore writes are reliable enough here that we
    don't wrap every call site in try/except)."""
    db.collection("documents").document(document_id).collection("events").add(
        {
            "type": event_type,
            "message": message,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
    )


def list_events(db, document_id: str) -> list[dict]:
    snaps = (
        db.collection("documents")
        .document(document_id)
        .collection("events")
        .order_by("created_at")
        .stream()
    )
    return [snap.to_dict() for snap in snaps]
