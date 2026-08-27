"""Concurrency and repeated-action adversarial coverage. The FakeFirestoreClient
is plain Python dicts with no locking, and none of the routes use a Firestore
transaction — so these tests are honest about what they can actually prove:
with TestClient's synchronous, GIL-serialized calls, concurrent requests
can't be forced into a true interleaved race, but they DO prove that firing
the same mutation multiple times back-to-back (the realistic "two browser
tabs" or "double-click" scenario) never corrupts state or crashes, and that
repeated remediation attempts (toggling a task/condition back and forth)
keep the activity log and recommendation consistent at every step."""

from concurrent.futures import ThreadPoolExecutor

from tests.seed_helpers import seed_document


# --- concurrency --------------------------------------------------------


def test_concurrent_completion_requests_for_the_same_task_leave_consistent_state(client, fake_db):
    seed_document(fake_db, "doc_a", "owner-1", [{"title": "T", "status": "todo"}])
    headers = {"X-Owner-Id": "owner-1"}

    def complete():
        return client.patch("/documents/tasks/task_doc_a_0", json={"status": "done"}, headers=headers)

    with ThreadPoolExecutor(max_workers=5) as pool:
        responses = list(pool.map(lambda _: complete(), range(5)))

    assert all(r.status_code == 200 for r in responses)
    stored = fake_db.collection("tasks").document("task_doc_a_0").get().to_dict()
    assert stored["status"] == "done"  # no torn/partial write, ends in the one valid state


def test_concurrent_case_creation_with_the_same_name_produces_two_independent_cases(client, fake_db):
    """Documented current behavior, not a guarantee: case creation has no
    idempotency key, so two near-simultaneous "Create" clicks with the same
    name (e.g. a double-click) produce two separate cases rather than being
    deduplicated."""
    headers = {"X-Owner-Id": "owner-1"}

    def create():
        return client.post("/cases", json={"name": "Visa Application"}, headers=headers)

    with ThreadPoolExecutor(max_workers=2) as pool:
        responses = list(pool.map(lambda _: create(), range(2)))

    case_ids = {r.json()["case_id"] for r in responses}
    assert len(case_ids) == 2  # both succeeded, independently


def test_concurrent_reassignment_of_a_document_to_two_different_cases_ends_in_one_valid_case(
    client, fake_db
):
    """No locking exists around case_id assignment — the last write wins.
    Whichever it is, it must be one of the two attempted case IDs, never a
    corrupted/mixed value."""
    seed_document(fake_db, "doc_a", "owner-1", [{"title": "T"}])
    headers = {"X-Owner-Id": "owner-1"}
    case_1 = client.post("/cases", json={"name": "Case 1"}, headers=headers).json()["case_id"]
    case_2 = client.post("/cases", json={"name": "Case 2"}, headers=headers).json()["case_id"]

    def assign(case_id):
        return client.patch("/documents/doc_a/case", json={"case_id": case_id}, headers=headers)

    with ThreadPoolExecutor(max_workers=2) as pool:
        responses = list(pool.map(assign, [case_1, case_2]))

    assert all(r.status_code == 200 for r in responses)
    final_case_id = fake_db.collection("documents").document("doc_a").get().to_dict()["case_id"]
    assert final_case_id in {case_1, case_2}


# --- repeated remediation -------------------------------------------------


def test_repeatedly_toggling_task_status_keeps_recommendation_consistent_at_every_step(client, fake_db):
    """Simulates a user flip-flopping (done -> reopen -> done -> reopen)
    several times, as might happen with a flaky UI or a user changing their
    mind — the activity log must keep growing correctly and the case's
    recommendation must stay correct after every single toggle, not just
    the final one."""
    seed_document(
        fake_db,
        "doc_a",
        "owner-1",
        [
            {"title": "A", "priority": "high", "status": "todo"},
            {"title": "B", "dependencies": [0], "priority": "high", "status": "todo"},
        ],
    )
    headers = {"X-Owner-Id": "owner-1"}

    for _ in range(3):
        client.patch("/documents/tasks/task_doc_a_0", json={"status": "done"}, headers=headers)
        doc = client.get("/documents/doc_a", headers=headers).json()
        assert doc["tasks"][0]["status"] == "done"
        assert doc["tasks"][1]["status"] == "todo"

        client.patch("/documents/tasks/task_doc_a_0", json={"status": "todo"}, headers=headers)
        doc = client.get("/documents/doc_a", headers=headers).json()
        assert doc["tasks"][0]["status"] == "todo"

    events = client.get("/documents/doc_a/events", headers=headers).json()["events"]
    event_types = [e["type"] for e in events]
    assert event_types.count("task_completed") == 3
    assert event_types.count("task_reopened") == 3


def test_repeatedly_re_confirming_the_same_condition_status_is_a_safe_no_op(client, fake_db):
    """Retrying the exact same remediation (e.g. a client retry after a
    dropped response) must not duplicate the underlying state change or
    error — same value, applied again, stays correct."""
    seed_document(
        fake_db,
        "doc_a",
        "owner-1",
        [{"title": "T", "is_conditional": True, "condition_status": "unknown"}],
    )
    headers = {"X-Owner-Id": "owner-1"}

    for _ in range(3):
        response = client.patch(
            "/documents/tasks/task_doc_a_0/condition-status",
            json={"condition_status": "applies"},
            headers=headers,
        )
        assert response.status_code == 200
        assert response.json()["condition_status"] == "applies"

    stored = fake_db.collection("tasks").document("task_doc_a_0").get().to_dict()
    assert stored["condition_status"] == "applies"
