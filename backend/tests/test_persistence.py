"""Firestore persistence behavior via the FakeFirestoreClient — case
creation, document/case linkage, task status persistence, event
persistence, and isolation between cases."""

from tests.seed_helpers import seed_document


def test_case_creation_persists_owner_and_name(client, fake_db):
    response = client.post("/cases", json={"name": "Visa Application"}, headers={"X-Owner-Id": "owner-1"})
    assert response.status_code == 200
    case_id = response.json()["case_id"]

    stored = fake_db.collection("cases").document(case_id).get().to_dict()
    assert stored["name"] == "Visa Application"
    assert stored["owner_id"] == "owner-1"


def test_document_attachment_to_case_persists(client, fake_db):
    seed_document(fake_db, "doc_a", "owner-1", [{"title": "T"}])
    case_id = client.post("/cases", json={"name": "Case"}, headers={"X-Owner-Id": "owner-1"}).json()["case_id"]

    response = client.patch(
        "/documents/doc_a/case", json={"case_id": case_id}, headers={"X-Owner-Id": "owner-1"}
    )
    assert response.status_code == 200

    stored = fake_db.collection("documents").document("doc_a").get().to_dict()
    assert stored["case_id"] == case_id


def test_task_status_update_persists(client, fake_db):
    seed_document(fake_db, "doc_a", "owner-1", [{"title": "T", "status": "todo"}])

    client.patch("/documents/tasks/task_doc_a_0", json={"status": "done"})

    stored = fake_db.collection("tasks").document("task_doc_a_0").get().to_dict()
    assert stored["status"] == "done"


def test_event_persistence_appends_without_overwriting_previous_events(client, fake_db):
    seed_document(fake_db, "doc_a", "owner-1", [{"title": "T"}])

    client.patch("/documents/tasks/task_doc_a_0", json={"status": "done"})
    client.patch("/documents/tasks/task_doc_a_0", json={"status": "todo"})

    events = client.get("/documents/doc_a/events").json()["events"]
    event_types = [e["type"] for e in events]
    assert "task_completed" in event_types
    assert "task_reopened" in event_types
    # Both events must coexist — the second write must not clobber the first.
    assert len(events) >= 2


def test_updating_one_case_does_not_modify_another_case(client, fake_db):
    seed_document(fake_db, "doc_a", "owner-1", [{"title": "A"}])
    seed_document(fake_db, "doc_b", "owner-1", [{"title": "B"}])

    case_1 = client.post("/cases", json={"name": "Case 1"}, headers={"X-Owner-Id": "owner-1"}).json()
    case_2 = client.post("/cases", json={"name": "Case 2"}, headers={"X-Owner-Id": "owner-1"}).json()

    client.patch("/documents/doc_a/case", json={"case_id": case_1["case_id"]}, headers={"X-Owner-Id": "owner-1"})
    client.patch("/documents/doc_b/case", json={"case_id": case_2["case_id"]}, headers={"X-Owner-Id": "owner-1"})

    detail_1 = client.get(f"/cases/{case_1['case_id']}", headers={"X-Owner-Id": "owner-1"}).json()
    detail_2 = client.get(f"/cases/{case_2['case_id']}", headers={"X-Owner-Id": "owner-1"}).json()

    assert [d["document_id"] for d in detail_1["documents"]] == ["doc_a"]
    assert [d["document_id"] for d in detail_2["documents"]] == ["doc_b"]


def test_deleting_a_case_does_not_touch_a_different_case(client, fake_db):
    seed_document(fake_db, "doc_a", "owner-1", [{"title": "A"}])
    case_1 = client.post("/cases", json={"name": "Case 1"}, headers={"X-Owner-Id": "owner-1"}).json()
    case_2 = client.post("/cases", json={"name": "Case 2"}, headers={"X-Owner-Id": "owner-1"}).json()
    client.patch("/documents/doc_a/case", json={"case_id": case_1["case_id"]}, headers={"X-Owner-Id": "owner-1"})

    client.delete(f"/cases/{case_2['case_id']}", headers={"X-Owner-Id": "owner-1"})

    # case_1 and its document assignment must be untouched.
    still_there = client.get(f"/cases/{case_1['case_id']}", headers={"X-Owner-Id": "owner-1"})
    assert still_there.status_code == 200
    assert len(still_there.json()["documents"]) == 1


def test_repeating_the_same_task_completion_is_idempotent(client, fake_db):
    """PATCH-ing the same status twice must not error and must leave the
    task in the same (already-correct) state — the route doesn't special-case
    a no-op transition, it just re-applies the same update safely."""
    seed_document(fake_db, "doc_a", "owner-1", [{"title": "T", "status": "todo"}])

    first = client.patch("/documents/tasks/task_doc_a_0", json={"status": "done"})
    second = client.patch("/documents/tasks/task_doc_a_0", json={"status": "done"})

    assert first.status_code == 200
    assert second.status_code == 200
    stored = fake_db.collection("tasks").document("task_doc_a_0").get().to_dict()
    assert stored["status"] == "done"
