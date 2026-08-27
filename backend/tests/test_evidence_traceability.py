"""Source/document provenance must survive the full round trip: real
extraction -> save_tasks -> Firestore -> API responses -> translation/status
updates. A task's source_excerpt is a literal quote from the document, so it
must never be silently rewritten or dropped."""

from app.agent.tools import save_tasks
from app.models.schemas import Task, ValidatedTask, ValidationResult
from tests.seed_helpers import seed_document


def make_task(**overrides) -> Task:
    defaults = dict(
        title="Upload passport",
        description="Upload your passport scan.",
        deadline=None,
        priority="medium",
        dependencies=[],
        required_documents=[],
        confidence=0.9,
        source_excerpt="Please upload a copy of your passport by the deadline.",
    )
    defaults.update(overrides)
    return Task(**defaults)


def test_save_tasks_persists_document_id_and_source_excerpt(fake_db, monkeypatch):
    monkeypatch.setattr("app.agent.tools.get_firestore_client", lambda: fake_db)

    validation = ValidationResult(tasks=[ValidatedTask(**make_task().model_dump())])
    result = save_tasks("doc_provenance", validation)

    assert result.success
    saved = fake_db.collection("tasks").document(result.saved_task_ids[0]).get().to_dict()
    assert saved["documentId"] == "doc_provenance"
    assert saved["source_excerpt"] == "Please upload a copy of your passport by the deadline."


def test_task_is_traceable_back_to_its_document_via_the_api(client, fake_db):
    seed_document(
        fake_db,
        "doc_a",
        "owner-1",
        [{"title": "Upload passport", "source_excerpt": "Quote from the document."}],
    )

    response = client.get("/documents/doc_a", headers={"X-Owner-Id": "owner-1"})
    assert response.status_code == 200
    body = response.json()
    task = body["tasks"][0]
    assert task["id"] == "task_doc_a_0"
    assert task["id"].startswith("task_doc_a_")
    assert task["source_excerpt"] == "Quote from the document."


def test_task_status_update_does_not_touch_source_excerpt(client, fake_db):
    seed_document(
        fake_db,
        "doc_a",
        "owner-1",
        [{"title": "Upload passport", "source_excerpt": "Original quote."}],
    )

    client.patch("/documents/tasks/task_doc_a_0", json={"status": "done"})

    response = client.get("/documents/doc_a", headers={"X-Owner-Id": "owner-1"})
    task = response.json()["tasks"][0]
    assert task["status"] == "done"
    assert task["source_excerpt"] == "Original quote."


def test_translation_never_overwrites_source_excerpt(client, fake_db, monkeypatch):
    """translate.py deliberately excludes source_excerpt from what it
    translates — it's a literal quote, not display copy. Confirmed here at
    the route level rather than trusting that convention silently."""

    async def fake_translate(**kwargs):
        raise AssertionError("Gemini should not be called for 'match document language' (no target).")

    monkeypatch.setattr("app.routes.documents.translate_document_content", fake_translate)

    seed_document(
        fake_db,
        "doc_a",
        "owner-1",
        [
            {
                "title": "Upload passport",
                "source_excerpt": "Untranslatable literal quote.",
                "original_title": "Upload passport",
                "original_description": "desc",
                "original_condition": "",
                "original_required_documents": [],
            }
        ],
    )

    response = client.post(
        "/documents/doc_a/translate",
        json={"target_language": None},
        headers={"X-Owner-Id": "owner-1"},
    )
    assert response.status_code == 200
    task = response.json()["tasks"][0]
    assert task["source_excerpt"] == "Untranslatable literal quote."
