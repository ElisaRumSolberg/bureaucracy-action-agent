"""delete_document and save_tasks each write through a single Firestore
WriteBatch now, instead of a loop of independent writes — so a mid-way
Firestore failure can't leave a document half-deleted or a task list
half-replaced. These tests simulate that failure by making the batch's
commit() itself raise (mirroring a real batch commit failing server-side,
where the client never observes partial application) and assert the store
is left completely unchanged, not partially written."""

import pytest

from tests.fake_firestore import FakeWriteBatch
from tests.seed_helpers import seed_document


def _make_commit_fail(monkeypatch):
    def failing_commit(self):
        raise RuntimeError("Simulated Firestore batch commit failure")

    monkeypatch.setattr(FakeWriteBatch, "commit", failing_commit)


def test_delete_document_failure_leaves_everything_untouched(client, fake_db, monkeypatch):
    seed_document(fake_db, "doc_a", "owner-1", [{"title": "Task 0"}, {"title": "Task 1"}])
    _make_commit_fail(monkeypatch)

    with pytest.raises(RuntimeError):
        client.delete("/documents/doc_a", headers={"X-Owner-Id": "owner-1"})

    assert fake_db.collection("tasks").document("task_doc_a_0").get().exists is True
    assert fake_db.collection("tasks").document("task_doc_a_1").get().exists is True
    assert fake_db.collection("documents").document("doc_a").get().exists is True


def test_save_tasks_failure_leaves_the_previous_task_list_intact(fake_db, monkeypatch):
    """A failed save must not lose the tasks that were there before the
    attempt — the old data-loss risk this test used to document (see git
    history) is exactly what the batch/commit fix eliminates."""
    from app.agent.tools import save_tasks
    from app.models.schemas import ValidatedTask, ValidationResult

    monkeypatch.setattr("app.agent.tools.get_firestore_client", lambda: fake_db)

    seed_document(fake_db, "doc_a", "owner-1", [{"title": "Old task 0"}, {"title": "Old task 1"}])

    def make(title):
        return ValidatedTask(
            title=title, description="d", priority="medium", confidence=0.9, source_excerpt="e"
        )

    validation = ValidationResult(tasks=[make("New task 0"), make("New task 1"), make("New task 2")])

    _make_commit_fail(monkeypatch)

    with pytest.raises(RuntimeError):
        save_tasks("doc_a", validation)

    remaining = list(fake_db._collections.get("tasks", {}).values())
    assert {t["title"] for t in remaining} == {"Old task 0", "Old task 1"}
