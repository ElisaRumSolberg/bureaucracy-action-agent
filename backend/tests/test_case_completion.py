"""Case completion. There is no stored 'completed' flag on a case (the
backend only returns per-task status, blocked_count, and next_best_action)
— completion is a derived read, exactly the same way the frontend derives
'all done' for a single document (Dashboard.tsx's `allDone`). These tests
compute that same derivation from the case detail API response, so they
double as a spec for what "case complete" means: every task is either done
or excluded (not_applicable), and nothing remains actionable."""

from tests.seed_helpers import seed_document


def _is_case_complete(case_detail: dict) -> bool:
    for doc in case_detail["documents"]:
        for task in doc["tasks"]:
            done = task["status"] == "done"
            excluded = task["is_conditional"] and task["condition_status"] == "not_applicable"
            if not done and not excluded:
                return False
    return True


def test_case_is_not_complete_while_actionable_tasks_remain(client, fake_db):
    seed_document(fake_db, "doc_a", "owner-1", [{"title": "T", "status": "todo"}])
    case_id = client.post("/cases", json={"name": "Case"}, headers={"X-Owner-Id": "owner-1"}).json()["case_id"]
    client.patch("/documents/doc_a/case", json={"case_id": case_id}, headers={"X-Owner-Id": "owner-1"})

    detail = client.get(f"/cases/{case_id}", headers={"X-Owner-Id": "owner-1"}).json()
    assert not _is_case_complete(detail)
    assert detail["next_best_action"] is not None


def test_completed_and_not_applicable_tasks_both_count_toward_completion(client, fake_db):
    seed_document(
        fake_db,
        "doc_a",
        "owner-1",
        [
            {"title": "Done task", "status": "done"},
            {
                "title": "Excluded conditional",
                "status": "todo",
                "is_conditional": True,
                "condition_status": "not_applicable",
            },
        ],
    )
    case_id = client.post("/cases", json={"name": "Case"}, headers={"X-Owner-Id": "owner-1"}).json()["case_id"]
    client.patch("/documents/doc_a/case", json={"case_id": case_id}, headers={"X-Owner-Id": "owner-1"})

    detail = client.get(f"/cases/{case_id}", headers={"X-Owner-Id": "owner-1"}).json()
    assert _is_case_complete(detail)
    assert detail["next_best_action"] is None


def test_case_with_all_applicable_tasks_completed_reaches_completed_state(client, fake_db):
    seed_document(
        fake_db,
        "doc_a",
        "owner-1",
        [
            {"title": "Step 1", "status": "todo"},
            {"title": "Step 2", "dependencies": [0], "status": "todo"},
        ],
    )
    case_id = client.post("/cases", json={"name": "Case"}, headers={"X-Owner-Id": "owner-1"}).json()["case_id"]
    client.patch("/documents/doc_a/case", json={"case_id": case_id}, headers={"X-Owner-Id": "owner-1"})

    assert not _is_case_complete(
        client.get(f"/cases/{case_id}", headers={"X-Owner-Id": "owner-1"}).json()
    )

    client.patch("/documents/tasks/task_doc_a_0", json={"status": "done"})
    client.patch("/documents/tasks/task_doc_a_1", json={"status": "done"})

    final = client.get(f"/cases/{case_id}", headers={"X-Owner-Id": "owner-1"}).json()
    assert _is_case_complete(final)


def test_blocked_task_prevents_completion_even_when_everything_else_is_done(client, fake_db):
    """A task blocked on an incomplete dependency must never let the case
    read as complete, even if every OTHER task happens to be done."""
    seed_document(
        fake_db,
        "doc_a",
        "owner-1",
        [
            {"title": "Unrelated done task", "status": "done"},
            {"title": "Blocker still open", "status": "todo"},
            {"title": "Blocked on it", "dependencies": [1], "status": "todo"},
        ],
    )
    case_id = client.post("/cases", json={"name": "Case"}, headers={"X-Owner-Id": "owner-1"}).json()["case_id"]
    client.patch("/documents/doc_a/case", json={"case_id": case_id}, headers={"X-Owner-Id": "owner-1"})

    detail = client.get(f"/cases/{case_id}", headers={"X-Owner-Id": "owner-1"}).json()
    assert not _is_case_complete(detail)
    assert detail["stats"]["blocked_count"] == 1
