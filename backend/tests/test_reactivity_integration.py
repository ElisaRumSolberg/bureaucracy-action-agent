"""End-to-end integration test for the core reactivity loop the whole demo
narrative depends on: upload -> complete a task -> a downstream task
unblocks -> the recommendation changes -> both are recorded as agent
activity events. Previously only covered piecemeal by unit tests
(test_next_best_action.py, test_validate_tasks.py) that never exercise the
actual FastAPI routes together in sequence.

Runs against the real app/routes/documents.py logic with two things faked:
Firestore (tests/fake_firestore.py, an in-memory stand-in) and the Gemini
agent pipeline (a canned three-task dependency chain) — no GCP credentials
or model calls needed."""

from fastapi.testclient import TestClient

from app.main import app
from app.models.schemas import SaveTasksResult, ValidatedTask, ValidationResult
from tests.fake_firestore import FakeFirestoreClient

OWNER = "integration-test-owner"


def _make_chain_tasks() -> list[ValidatedTask]:
    return [
        ValidatedTask(
            title="Task A",
            description="First step",
            priority="high",
            dependencies=[],
            confidence=0.95,
            source_excerpt="Do A first.",
        ),
        ValidatedTask(
            title="Task B",
            description="Second step",
            priority="high",
            dependencies=[0],
            confidence=0.95,
            source_excerpt="Then do B.",
        ),
        ValidatedTask(
            title="Task C",
            description="Third step",
            priority="high",
            dependencies=[1],
            confidence=0.95,
            source_excerpt="Finally do C.",
        ),
    ]


def _make_fake_run_agent_pipeline(fake_db):
    async def run(document_text, document_id, target_language=None, image_bytes=None, image_mime_type=None):
        tasks = _make_chain_tasks()
        for index, task in enumerate(tasks):
            fake_db.collection("tasks").document(f"task_{document_id}_{index}").set(
                {
                    "documentId": document_id,
                    **task.model_dump(),
                    "original_title": task.title,
                    "original_description": task.description,
                    "original_condition": task.condition,
                    "original_required_documents": task.required_documents,
                }
            )
        validation = ValidationResult(tasks=tasks, warnings=[], missing_information=[], consequences=[])
        save_result = SaveTasksResult(
            success=True, saved_task_ids=[f"task_{document_id}_{i}" for i in range(len(tasks))]
        )
        return "A three-step chain: A, then B, then C.", validation, save_result

    return run


def _event_types(events: list[dict]) -> list[str]:
    return [e["type"] for e in events]


def test_upload_complete_unblock_recommend_reactivity_loop(monkeypatch):
    fake_db = FakeFirestoreClient()
    monkeypatch.setattr("app.routes.documents.get_firestore_client", lambda: fake_db)
    monkeypatch.setattr(
        "app.routes.documents.run_agent_pipeline", _make_fake_run_agent_pipeline(fake_db)
    )

    client = TestClient(app)
    headers = {"X-Owner-Id": OWNER}

    # 1. Upload: real extraction (plain text) + faked agent pipeline.
    upload_response = client.post(
        "/documents/upload",
        files={"file": ("notice.txt", b"Do A, then B, then C.", "text/plain")},
        headers=headers,
    )
    assert upload_response.status_code == 200
    body = upload_response.json()
    document_id = body["document_id"]
    assert [t["title"] for t in body["tasks"]] == ["Task A", "Task B", "Task C"]

    events = client.get(f"/documents/{document_id}/events", headers=headers).json()["events"]
    assert _event_types(events) == [
        "document_uploaded",
        "extraction_complete",
        "validation_complete",
        "recommendation_selected",
    ]
    assert "Task A" in events[-1]["message"]

    # 2. Complete Task A -> Task B unblocks -> recommendation moves to B.
    task_a_id = f"task_{document_id}_0"
    complete_a = client.patch(f"/documents/tasks/{task_a_id}", json={"status": "done"}, headers=headers)
    assert complete_a.status_code == 200

    events = client.get(f"/documents/{document_id}/events", headers=headers).json()["events"]
    assert _event_types(events)[-3:] == ["task_completed", "task_unblocked", "recommendation_changed"]
    assert "Task A" in events[-3]["message"]
    assert "Task B" in events[-2]["message"]
    assert "Task B" in events[-1]["message"]

    doc_after_a = client.get(f"/documents/{document_id}", headers=headers).json()
    assert doc_after_a["tasks"][0]["status"] == "done"
    assert doc_after_a["tasks"][1]["status"] == "todo"

    # 3. Complete Task B -> Task C unblocks -> recommendation moves to C.
    task_b_id = f"task_{document_id}_1"
    complete_b = client.patch(f"/documents/tasks/{task_b_id}", json={"status": "done"}, headers=headers)
    assert complete_b.status_code == 200

    events = client.get(f"/documents/{document_id}/events", headers=headers).json()["events"]
    assert _event_types(events)[-3:] == ["task_completed", "task_unblocked", "recommendation_changed"]
    assert "Task C" in events[-2]["message"]
    assert "Task C" in events[-1]["message"]

    # 4. Complete Task C -> nothing left unblocked -> recommendation clears.
    task_c_id = f"task_{document_id}_2"
    complete_c = client.patch(f"/documents/tasks/{task_c_id}", json={"status": "done"}, headers=headers)
    assert complete_c.status_code == 200

    events = client.get(f"/documents/{document_id}/events", headers=headers).json()["events"]
    assert _event_types(events)[-2:] == ["task_completed", "recommendation_changed"]
    assert events[-1]["message"] == "No task is currently unblocked"

    final_doc = client.get(f"/documents/{document_id}", headers=headers).json()
    assert all(t["status"] == "done" for t in final_doc["tasks"])

    # Cross-owner isolation still holds against the fake store too.
    other_owner_list = client.get("/documents", headers={"X-Owner-Id": "someone-else"}).json()
    assert other_owner_list["documents"] == []
    mine = client.get("/documents", headers=headers).json()
    assert len(mine["documents"]) == 1
