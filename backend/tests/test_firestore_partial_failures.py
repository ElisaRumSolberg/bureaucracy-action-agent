"""What happens when a Firestore write fails partway through a multi-step
operation? Neither delete_document nor save_tasks uses a Firestore batch or
transaction — each is a plain loop of independent writes. These tests
document the actual (unprotected) current behavior rather than inventing a
transactional rewrite, which is out of scope for adversarial test coverage
alone. If this ever needs hardening, the fix is to wrap these loops in a
Firestore WriteBatch — noted here, not implemented, per the instruction not
to add production features while acting as an adversarial tester."""

import pytest

from tests.fake_firestore import FakeDocumentRef
from tests.seed_helpers import seed_document


def _fail_on_nth_call(monkeypatch, cls, method_name, fail_at: int):
    original = getattr(cls, method_name)
    calls = {"count": 0}

    def wrapper(self, *args, **kwargs):
        calls["count"] += 1
        if calls["count"] == fail_at:
            raise RuntimeError(f"Simulated Firestore failure on {method_name} call #{fail_at}")
        return original(self, *args, **kwargs)

    monkeypatch.setattr(cls, method_name, wrapper)


def test_delete_document_failure_partway_through_leaves_partial_state(client, fake_db, monkeypatch):
    """delete_document has no batch/transaction: if a write fails after
    task 0's docs are gone but before task 1's are, the document is left in
    an inconsistent state (some tasks deleted, some not, the document itself
    and its events untouched) rather than atomically all-or-nothing."""
    seed_document(fake_db, "doc_a", "owner-1", [{"title": "Task 0"}, {"title": "Task 1"}])

    # 4 delete() calls happen for 2 tasks (guidance + task, per task) before
    # the events/document deletes — fail on the 3rd, partway through task 1.
    _fail_on_nth_call(monkeypatch, FakeDocumentRef, "delete", fail_at=3)

    with pytest.raises(RuntimeError):
        client.delete("/documents/doc_a", headers={"X-Owner-Id": "owner-1"})

    # Known limitation: task 0 is gone, task 1 and the parent document survive.
    assert fake_db.collection("tasks").document("task_doc_a_0").get().exists is False
    assert fake_db.collection("tasks").document("task_doc_a_1").get().exists is True
    assert fake_db.collection("documents").document("doc_a").get().exists is True


def test_save_tasks_failure_partway_through_can_lose_previously_saved_tasks(fake_db, monkeypatch):
    """save_tasks deletes all of a document's existing tasks up front, then
    writes the new ones one at a time. If a later write fails, the earlier
    (already-deleted) tasks are gone and only a partial new set survives —
    a real, currently-unmitigated data-loss risk under a mid-batch failure,
    documented here rather than silently assumed safe."""
    from app.agent.tools import save_tasks
    from app.models.schemas import ValidatedTask, ValidationResult

    monkeypatch.setattr("app.agent.tools.get_firestore_client", lambda: fake_db)

    # Seed two pre-existing tasks for the document (as if from a prior run).
    seed_document(fake_db, "doc_a", "owner-1", [{"title": "Old task 0"}, {"title": "Old task 1"}])

    def make(title):
        return ValidatedTask(
            title=title, description="d", priority="medium", confidence=0.9, source_excerpt="e"
        )

    validation = ValidationResult(tasks=[make("New task 0"), make("New task 1"), make("New task 2")])

    _fail_on_nth_call(monkeypatch, FakeDocumentRef, "set", fail_at=2)  # fails writing the 2nd new task

    with pytest.raises(RuntimeError):
        save_tasks("doc_a", validation)

    remaining = list(fake_db._collections.get("tasks", {}).values())
    # Old tasks were already wiped by save_tasks' own cleanup step, and only
    # the first new task made it in before the simulated failure.
    assert len(remaining) == 1
    assert remaining[0]["title"] == "New task 0"
