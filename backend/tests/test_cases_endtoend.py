"""End-to-end coverage for the Cases feature through the actual HTTP routes
(create/list/get/delete), on top of the existing unit coverage in
test_cases_logic.py for the pure ranking/stats functions and
test_case_completion.py for completion state. Fills gaps flagged in a
product review: creation validation, document-merge into a case, case-level
progress, delete/isolation behavior, and the empty-case edge case."""

from tests.seed_helpers import seed_document


def _create_case(client, name="Study in Norway", owner="owner-1"):
    response = client.post("/cases", json={"name": name}, headers={"X-Owner-Id": owner})
    assert response.status_code == 200
    return response.json()["case_id"]


def test_assigning_a_document_to_a_case_logs_an_activity_event(client, fake_db):
    case_id = _create_case(client, name="Study in Norway")
    seed_document(fake_db, "doc_a", "owner-1", [{"title": "Task A"}])

    client.patch("/documents/doc_a/case", json={"case_id": case_id}, headers={"X-Owner-Id": "owner-1"})

    events = client.get("/documents/doc_a/events", headers={"X-Owner-Id": "owner-1"}).json()["events"]
    messages = [e["message"] for e in events]
    assert any("Study in Norway" in m for m in messages)


def test_reassigning_the_same_document_to_the_same_case_is_idempotent(client, fake_db):
    """Retrying the same attach call (e.g. after a flaky network response)
    must not create duplicate case membership — there's nothing to
    duplicate into since membership is just a document's own case_id
    field, but this locks that in as a guarantee, not an accident."""
    case_id = _create_case(client)
    seed_document(fake_db, "doc_a", "owner-1", [{"title": "Task A"}])

    for _ in range(2):
        response = client.patch(
            "/documents/doc_a/case", json={"case_id": case_id}, headers={"X-Owner-Id": "owner-1"}
        )
        assert response.status_code == 200

    detail = client.get(f"/cases/{case_id}", headers={"X-Owner-Id": "owner-1"}).json()
    assert detail["stats"]["document_count"] == 1
    assert len(detail["documents"]) == 1


def test_creating_a_case_with_a_blank_name_is_rejected(client, fake_db):
    response = client.post("/cases", json={"name": "   "}, headers={"X-Owner-Id": "owner-1"})
    assert response.status_code == 400


def test_created_case_appears_in_the_list(client, fake_db):
    case_id = _create_case(client)
    response = client.get("/cases", headers={"X-Owner-Id": "owner-1"})
    assert response.status_code == 200
    case_ids = [c["case_id"] for c in response.json()["cases"]]
    assert case_id in case_ids


def test_assigning_two_documents_to_a_case_merges_their_tasks(client, fake_db):
    case_id = _create_case(client)
    seed_document(fake_db, "doc_a", "owner-1", [{"title": "Task A"}])
    seed_document(fake_db, "doc_b", "owner-1", [{"title": "Task B"}])

    client.patch("/documents/doc_a/case", json={"case_id": case_id}, headers={"X-Owner-Id": "owner-1"})
    client.patch("/documents/doc_b/case", json={"case_id": case_id}, headers={"X-Owner-Id": "owner-1"})

    detail = client.get(f"/cases/{case_id}", headers={"X-Owner-Id": "owner-1"}).json()
    assert detail["stats"]["document_count"] == 2
    all_titles = {task["title"] for doc in detail["documents"] for task in doc["tasks"]}
    assert all_titles == {"Task A", "Task B"}


def test_case_progress_reflects_completed_tasks_across_documents(client, fake_db):
    case_id = _create_case(client)
    seed_document(fake_db, "doc_a", "owner-1", [{"title": "Task A", "status": "done"}, {"title": "Task A2"}])
    seed_document(fake_db, "doc_b", "owner-1", [{"title": "Task B", "status": "done"}])
    client.patch("/documents/doc_a/case", json={"case_id": case_id}, headers={"X-Owner-Id": "owner-1"})
    client.patch("/documents/doc_b/case", json={"case_id": case_id}, headers={"X-Owner-Id": "owner-1"})

    cases = client.get("/cases", headers={"X-Owner-Id": "owner-1"}).json()["cases"]
    case = next(c for c in cases if c["case_id"] == case_id)
    assert case["task_count"] == 3
    assert case["done_count"] == 2


def test_empty_case_has_no_next_action_and_zeroed_stats_without_crashing(client, fake_db):
    case_id = _create_case(client)
    response = client.get(f"/cases/{case_id}", headers={"X-Owner-Id": "owner-1"})
    assert response.status_code == 200
    body = response.json()
    assert body["next_best_action"] is None
    assert body["documents"] == []
    assert body["stats"]["task_count"] == 0


def test_deleting_a_case_unlinks_but_does_not_delete_its_documents(client, fake_db):
    case_id = _create_case(client)
    seed_document(fake_db, "doc_a", "owner-1", [{"title": "Task A"}], case_id=case_id)

    response = client.delete(f"/cases/{case_id}", headers={"X-Owner-Id": "owner-1"})
    assert response.status_code == 200

    doc = fake_db.collection("documents").document("doc_a").get().to_dict()
    assert doc is not None
    assert doc.get("case_id") is None


def test_deleting_one_case_does_not_affect_another_case(client, fake_db):
    case_a = _create_case(client, name="Case A")
    case_b = _create_case(client, name="Case B")
    seed_document(fake_db, "doc_b", "owner-1", [{"title": "Task B"}], case_id=case_b)

    client.delete(f"/cases/{case_a}", headers={"X-Owner-Id": "owner-1"})

    detail_b = client.get(f"/cases/{case_b}", headers={"X-Owner-Id": "owner-1"})
    assert detail_b.status_code == 200
    assert detail_b.json()["stats"]["document_count"] == 1


def test_task_updates_in_one_case_do_not_change_another_cases_stats(client, fake_db):
    case_a = _create_case(client, name="Case A")
    case_b = _create_case(client, name="Case B")
    seed_document(fake_db, "doc_a", "owner-1", [{"title": "Task A"}], case_id=case_a)
    seed_document(fake_db, "doc_b", "owner-1", [{"title": "Task B"}], case_id=case_b)

    task_a_id = "task_doc_a_0"
    client.patch(f"/documents/tasks/{task_a_id}", json={"status": "done"}, headers={"X-Owner-Id": "owner-1"})

    stats_b = client.get(f"/cases/{case_b}", headers={"X-Owner-Id": "owner-1"}).json()["stats"]
    assert stats_b["document_count"] == 1
    detail_b = client.get(f"/cases/{case_b}", headers={"X-Owner-Id": "owner-1"}).json()
    assert detail_b["documents"][0]["tasks"][0]["status"] == "todo"


def test_dependencies_do_not_cross_document_boundaries_within_a_case(client, fake_db):
    """Deliberate scope decision (see cases.py module docstring): a case
    shares one task list and one next-best-action across its documents, but
    each document's dependency graph stays local — a task's `dependencies`
    are indices into its own document's task list only, never another
    document's. Completing every task in document A must not unblock a task
    in document B just because it looks like it "depends on document A"."""
    case_id = _create_case(client)
    seed_document(fake_db, "doc_a", "owner-1", [{"title": "Task A", "status": "done"}])
    seed_document(
        fake_db,
        "doc_b",
        "owner-1",
        [{"title": "Task B0"}, {"title": "Task B1 depends on B0", "dependencies": [0]}],
    )
    client.patch("/documents/doc_a/case", json={"case_id": case_id}, headers={"X-Owner-Id": "owner-1"})
    client.patch("/documents/doc_b/case", json={"case_id": case_id}, headers={"X-Owner-Id": "owner-1"})

    detail = client.get(f"/cases/{case_id}", headers={"X-Owner-Id": "owner-1"}).json()
    doc_b = next(d for d in detail["documents"] if d["document_id"] == "doc_b")
    task_b1 = next(t for t in doc_b["tasks"] if t["title"] == "Task B1 depends on B0")
    assert task_b1["dependencies"] == [0]
    assert detail["stats"]["blocked_count"] == 1
