"""Shared helper for writing a realistic document + its tasks straight into a
FakeFirestoreClient, bypassing the (mocked-out) Gemini pipeline. Mirrors the
shape app.agent.tools.save_tasks actually persists, so route-level tests
exercise the same field set real documents have."""


def seed_document(fake_db, document_id: str, owner_id: str | None, tasks: list[dict], **doc_overrides) -> str:
    doc_data = {
        "filename": f"{document_id}.pdf",
        "status": "processed",
        "summary": "summary",
        "owner_id": owner_id,
        "warnings": [],
        "missing_information": [],
        "consequences": [],
        "uploaded_at": "2026-01-01T00:00:00+00:00",
    }
    doc_data.update(doc_overrides)
    fake_db.collection("documents").document(document_id).set(doc_data)

    for i, overrides in enumerate(tasks):
        base = dict(
            title=f"Task {i}",
            description="desc",
            deadline=None,
            deadline_inherited=False,
            priority="medium",
            dependencies=[],
            required_documents=[],
            confidence=0.9,
            source_excerpt="excerpt",
            is_conditional=False,
            condition="",
            status="todo",
            priority_reason="",
            risk_level="medium",
            risk_reason="",
            condition_status="unknown",
        )
        base.update(overrides)
        task_id = f"task_{document_id}_{i}"
        fake_db.collection("tasks").document(task_id).set({"documentId": document_id, **base})

    return document_id
