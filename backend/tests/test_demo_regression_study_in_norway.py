"""Deterministic regression fixture for the hackathon demo scenario, so a
future change to priority/dependency/conditional logic can't silently break
the exact flow the demo walks through live. No Gemini call anywhere — the
tasks are seeded directly, exactly as save_tasks would have persisted them.

Case: "Study in Norway"
  A. Pay semester fee                              (no deps, high)
  B. Register for courses            depends on A  (high)
  C. Upload proof of funds                          (no deps, medium)
  D. Submit residence application     depends on C  (medium)
  E. Register with police             conditional on staying > 6 months (low)
"""

from tests.seed_helpers import seed_document

OWNER = "study-in-norway-owner"


def _seed_case(client, fake_db):
    seed_document(
        fake_db,
        "doc_norway",
        OWNER,
        [
            {"title": "Pay semester fee", "priority": "high", "status": "todo"},
            {"title": "Register for courses", "priority": "high", "dependencies": [0], "status": "todo"},
            {"title": "Upload proof of funds", "priority": "medium", "status": "todo"},
            {"title": "Submit residence application", "priority": "medium", "dependencies": [2], "status": "todo"},
            {
                "title": "Register with police",
                "priority": "low",
                "is_conditional": True,
                "condition": "Only if staying more than 6 months",
                "condition_status": "unknown",
                "status": "todo",
            },
        ],
    )
    case_id = client.post("/cases", json={"name": "Study in Norway"}, headers={"X-Owner-Id": OWNER}).json()[
        "case_id"
    ]
    client.patch("/documents/doc_norway/case", json={"case_id": case_id}, headers={"X-Owner-Id": OWNER})
    return case_id


def _nba_title(client, case_id):
    detail = client.get(f"/cases/{case_id}", headers={"X-Owner-Id": OWNER}).json()
    nba = detail["next_best_action"]
    return nba["task"]["title"] if nba else None


def test_initial_recommendation_is_a_valid_actionable_task(client, fake_db):
    case_id = _seed_case(client, fake_db)
    # Both "Pay semester fee" and "Upload proof of funds" are unblocked;
    # "Pay semester fee" wins on higher priority.
    assert _nba_title(client, case_id) == "Pay semester fee"


def test_completing_dependencies_changes_the_recommendation_correctly(client, fake_db):
    case_id = _seed_case(client, fake_db)

    client.patch("/documents/tasks/task_doc_norway_0", json={"status": "done"})  # pay fee
    assert _nba_title(client, case_id) == "Register for courses"  # now unblocked, still high priority

    client.patch("/documents/tasks/task_doc_norway_1", json={"status": "done"})  # register for courses
    assert _nba_title(client, case_id) == "Upload proof of funds"  # only unblocked unconditional task left

    client.patch("/documents/tasks/task_doc_norway_2", json={"status": "done"})  # upload proof of funds
    assert _nba_title(client, case_id) == "Submit residence application"  # now unblocked


def test_police_condition_not_applicable_removes_it_from_the_workflow(client, fake_db):
    case_id = _seed_case(client, fake_db)
    for task_id in ["task_doc_norway_0", "task_doc_norway_1", "task_doc_norway_2", "task_doc_norway_3"]:
        client.patch(f"/documents/tasks/{task_id}", json={"status": "done"})

    detail = client.get(f"/cases/{case_id}", headers={"X-Owner-Id": OWNER}).json()
    assert detail["next_best_action"]["task"]["title"] == "Register with police"  # only fallback left

    client.patch(
        "/documents/tasks/task_doc_norway_4/condition-status", json={"condition_status": "not_applicable"}
    )

    final = client.get(f"/cases/{case_id}", headers={"X-Owner-Id": OWNER}).json()
    assert final["next_best_action"] is None  # excluded — nothing left to recommend
    assert all(
        t["status"] == "done" or (t["is_conditional"] and t["condition_status"] == "not_applicable")
        for doc in final["documents"]
        for t in doc["tasks"]
    )  # case reads as fully complete


def test_police_condition_applies_makes_it_actionable(client, fake_db):
    case_id = _seed_case(client, fake_db)
    for task_id in ["task_doc_norway_0", "task_doc_norway_1", "task_doc_norway_2", "task_doc_norway_3"]:
        client.patch(f"/documents/tasks/{task_id}", json={"status": "done"})

    client.patch("/documents/tasks/task_doc_norway_4/condition-status", json={"condition_status": "applies"})

    detail = client.get(f"/cases/{case_id}", headers={"X-Owner-Id": OWNER}).json()
    assert detail["next_best_action"]["task"]["title"] == "Register with police"

    client.patch("/documents/tasks/task_doc_norway_4", json={"status": "done"})
    final = client.get(f"/cases/{case_id}", headers={"X-Owner-Id": OWNER}).json()
    assert final["next_best_action"] is None
    assert all(t["status"] == "done" for doc in final["documents"] for t in doc["tasks"])
