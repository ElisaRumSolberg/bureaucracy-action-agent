"""Success and error-path coverage for the API surface described in the
project's own README API Overview table. Uses the app's actual HTTP status
codes (never invented ones) and the FakeFirestoreClient rather than real
GCP/Gemini."""

from tests.seed_helpers import seed_document


# --- upload -------------------------------------------------------------


def test_upload_rejects_unsupported_content_type(client, fake_db):
    response = client.post(
        "/documents/upload",
        files={"file": ("archive.zip", b"not a real zip", "application/zip")},
        headers={"X-Owner-Id": "owner-1"},
    )
    assert response.status_code == 400


def test_upload_rejects_empty_text_file(client, fake_db):
    response = client.post(
        "/documents/upload",
        files={"file": ("empty.txt", b"", "text/plain")},
        headers={"X-Owner-Id": "owner-1"},
    )
    assert response.status_code == 422


def test_upload_success_returns_document_and_tasks(client, fake_db, monkeypatch):
    from app.models.schemas import SaveTasksResult, ValidatedTask, ValidationResult

    async def fake_pipeline(document_text, document_id, target_language=None, image_bytes=None, image_mime_type=None):
        task = ValidatedTask(
            title="Do the thing",
            description="desc",
            priority="high",
            confidence=0.9,
            source_excerpt="Do the thing.",
        )
        fake_db.collection("tasks").document(f"task_{document_id}_0").set(
            {"documentId": document_id, **task.model_dump()}
        )
        return "Summary.", ValidationResult(tasks=[task]), SaveTasksResult(
            success=True, saved_task_ids=[f"task_{document_id}_0"]
        )

    monkeypatch.setattr("app.routes.documents.run_agent_pipeline", fake_pipeline)

    response = client.post(
        "/documents/upload",
        files={"file": ("notice.txt", b"Do the thing.", "text/plain")},
        headers={"X-Owner-Id": "owner-1"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["tasks"][0]["title"] == "Do the thing"


# --- case retrieval -------------------------------------------------------


def test_get_nonexistent_case_returns_404(client, fake_db):
    response = client.get("/cases/case_does_not_exist", headers={"X-Owner-Id": "owner-1"})
    assert response.status_code == 404


def test_get_case_owned_by_someone_else_returns_404(client, fake_db):
    case_id = client.post("/cases", json={"name": "Case"}, headers={"X-Owner-Id": "owner-1"}).json()["case_id"]
    response = client.get(f"/cases/{case_id}", headers={"X-Owner-Id": "someone-else"})
    assert response.status_code == 404


# --- task completion -------------------------------------------------------


def test_task_completion_success(client, fake_db):
    seed_document(fake_db, "doc_a", "owner-1", [{"title": "T", "status": "todo"}])
    response = client.patch("/documents/tasks/task_doc_a_0", json={"status": "done"})
    assert response.status_code == 200
    assert response.json() == {"id": "task_doc_a_0", "status": "done"}


def test_task_completion_invalid_task_id_returns_404(client, fake_db):
    response = client.patch("/documents/tasks/task_does_not_exist_0", json={"status": "done"})
    assert response.status_code == 404


def test_task_completion_malformed_status_returns_400(client, fake_db):
    seed_document(fake_db, "doc_a", "owner-1", [{"title": "T"}])
    response = client.patch("/documents/tasks/task_doc_a_0", json={"status": "not-a-real-status"})
    assert response.status_code == 400


def test_task_completion_malformed_body_returns_422(client, fake_db):
    seed_document(fake_db, "doc_a", "owner-1", [{"title": "T"}])
    response = client.patch("/documents/tasks/task_doc_a_0", json={"wrong_field": "done"})
    assert response.status_code == 422


# --- condition update -------------------------------------------------------


def test_condition_update_success(client, fake_db):
    seed_document(
        fake_db, "doc_a", "owner-1", [{"title": "T", "is_conditional": True, "condition_status": "unknown"}]
    )
    response = client.patch("/documents/tasks/task_doc_a_0/condition-status", json={"condition_status": "applies"})
    assert response.status_code == 200
    assert response.json()["condition_status"] == "applies"


def test_condition_update_invalid_task_id_returns_404(client, fake_db):
    response = client.patch(
        "/documents/tasks/task_does_not_exist_0/condition-status", json={"condition_status": "applies"}
    )
    assert response.status_code == 404


def test_condition_update_on_non_conditional_task_returns_400(client, fake_db):
    seed_document(fake_db, "doc_a", "owner-1", [{"title": "T", "is_conditional": False}])
    response = client.patch("/documents/tasks/task_doc_a_0/condition-status", json={"condition_status": "applies"})
    assert response.status_code == 400


def test_condition_update_invalid_value_returns_400(client, fake_db):
    seed_document(fake_db, "doc_a", "owner-1", [{"title": "T", "is_conditional": True}])
    response = client.patch(
        "/documents/tasks/task_doc_a_0/condition-status", json={"condition_status": "maybe"}
    )
    assert response.status_code == 400


# --- next-best-action retrieval (embedded in document/case responses) -----


def test_document_response_includes_next_best_action_relevant_state(client, fake_db):
    seed_document(
        fake_db,
        "doc_a",
        "owner-1",
        [
            {"title": "A", "priority": "low"},
            {"title": "B", "priority": "high"},
        ],
    )
    response = client.get("/documents/doc_a", headers={"X-Owner-Id": "owner-1"})
    tasks = response.json()["tasks"]
    assert [t["title"] for t in tasks] == ["A", "B"]
    assert tasks[1]["priority"] == "high"


def test_case_response_includes_next_best_action(client, fake_db):
    seed_document(fake_db, "doc_a", "owner-1", [{"title": "A", "priority": "high"}])
    case_id = client.post("/cases", json={"name": "Case"}, headers={"X-Owner-Id": "owner-1"}).json()["case_id"]
    client.patch("/documents/doc_a/case", json={"case_id": case_id}, headers={"X-Owner-Id": "owner-1"})

    response = client.get(f"/cases/{case_id}", headers={"X-Owner-Id": "owner-1"})
    nba = response.json()["next_best_action"]
    assert nba is not None
    assert nba["task"]["title"] == "A"


# --- history / activity retrieval -------------------------------------------


def test_list_documents_without_owner_header_returns_empty():
    from fastapi.testclient import TestClient
    from app.main import app

    response = TestClient(app).get("/documents")
    assert response.status_code == 200
    assert response.json() == {"documents": []}


def test_list_documents_scoped_to_owner(client, fake_db):
    seed_document(fake_db, "doc_a", "owner-1", [{"title": "A"}])
    seed_document(fake_db, "doc_b", "owner-2", [{"title": "B"}])

    response = client.get("/documents", headers={"X-Owner-Id": "owner-1"})
    documents = response.json()["documents"]
    assert [d["document_id"] for d in documents] == ["doc_a"]


def test_activity_log_for_nonexistent_document_returns_404(client, fake_db):
    response = client.get("/documents/doc_does_not_exist/events")
    assert response.status_code == 404


def test_activity_log_returns_events_in_chronological_order(client, fake_db):
    seed_document(fake_db, "doc_a", "owner-1", [{"title": "T", "status": "todo"}])
    client.patch("/documents/tasks/task_doc_a_0", json={"status": "done"})

    response = client.get("/documents/doc_a/events")
    events = response.json()["events"]
    assert len(events) >= 1
    assert events == sorted(events, key=lambda e: e["created_at"])
