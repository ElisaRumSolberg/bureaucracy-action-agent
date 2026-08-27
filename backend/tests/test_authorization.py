"""Adversarial authorization coverage: can a caller who does not own a
document act on its tasks anyway just by knowing (or guessing) a task_id?
And can a caller with an invalid/forged Firebase token fall back to
spoofing an X-Owner-Id header to impersonate someone else? These are the
"verification bypass" failure modes for this app's ownership model —
there's no separate kill-switch/remediation-approval concept here (this is
a document-workflow agent, not the incident-response one), so the
equivalent security boundary is: can you mutate or read something you
don't own."""

from tests.seed_helpers import seed_document


# --- forged-token "kill switch" bypass on the auth boundary itself ----------


def test_invalid_bearer_token_does_not_fall_back_to_spoofed_owner_header(client, fake_db):
    """A caller sending a broken/forged Authorization header alongside a
    plausible-looking X-Owner-Id must NOT have the header silently trusted
    as a fallback — once someone claims to be "signed in", only a verified
    token should establish identity, or none at all."""
    seed_document(fake_db, "doc_a", "victim-owner", [{"title": "T"}])

    response = client.get(
        "/documents",
        headers={"Authorization": "Bearer not-a-real-token", "X-Owner-Id": "victim-owner"},
    )
    assert response.status_code == 200
    # Must NOT see the victim's document just because X-Owner-Id claims to be them.
    assert response.json()["documents"] == []


# --- task-status mutation without ownership verification --------------------


def test_task_status_cannot_be_changed_by_a_non_owner(client, fake_db):
    seed_document(fake_db, "doc_a", "victim-owner", [{"title": "T", "status": "todo"}])

    response = client.patch(
        "/documents/tasks/task_doc_a_0",
        json={"status": "done"},
        headers={"X-Owner-Id": "attacker"},
    )
    assert response.status_code == 404

    stored = fake_db.collection("tasks").document("task_doc_a_0").get().to_dict()
    assert stored["status"] == "todo"  # untouched


def test_condition_status_cannot_be_changed_by_a_non_owner(client, fake_db):
    seed_document(
        fake_db,
        "doc_a",
        "victim-owner",
        [{"title": "T", "is_conditional": True, "condition_status": "unknown"}],
    )

    response = client.patch(
        "/documents/tasks/task_doc_a_0/condition-status",
        json={"condition_status": "not_applicable"},
        headers={"X-Owner-Id": "attacker"},
    )
    assert response.status_code == 404

    stored = fake_db.collection("tasks").document("task_doc_a_0").get().to_dict()
    assert stored["condition_status"] == "unknown"  # untouched


def test_task_guidance_cannot_be_generated_by_a_non_owner(client, fake_db):
    """Even a read/generate-only endpoint should be owner-scoped — otherwise
    anyone who learns a task_id can trigger paid Gemini calls against
    documents they have no relationship to."""
    seed_document(fake_db, "doc_a", "victim-owner", [{"title": "T"}])

    response = client.post(
        "/documents/tasks/task_doc_a_0/guidance",
        headers={"X-Owner-Id": "attacker"},
    )
    assert response.status_code == 404


def test_task_ask_cannot_be_used_by_a_non_owner(client, fake_db):
    seed_document(fake_db, "doc_a", "victim-owner", [{"title": "T"}])

    response = client.post(
        "/documents/tasks/task_doc_a_0/ask",
        json={"question": "When is this due?"},
        headers={"X-Owner-Id": "attacker"},
    )
    assert response.status_code == 404


def test_delay_impact_cannot_be_queried_by_a_non_owner(client, fake_db):
    seed_document(fake_db, "doc_a", "victim-owner", [{"title": "T"}])

    response = client.post(
        "/documents/tasks/task_doc_a_0/delay-impact",
        headers={"X-Owner-Id": "attacker"},
    )
    assert response.status_code == 404


def test_activity_log_cannot_be_read_by_a_non_owner(client, fake_db):
    seed_document(fake_db, "doc_a", "victim-owner", [{"title": "T"}])

    response = client.get("/documents/doc_a/events", headers={"X-Owner-Id": "attacker"})
    assert response.status_code == 404


# --- case-scoped authorization ----------------------------------------------


def test_non_owner_cannot_assign_someone_elses_document_into_their_own_case(client, fake_db):
    seed_document(fake_db, "doc_a", "victim-owner", [{"title": "T"}])
    attacker_case = client.post(
        "/cases", json={"name": "Attacker's case"}, headers={"X-Owner-Id": "attacker"}
    ).json()

    response = client.patch(
        "/documents/doc_a/case",
        json={"case_id": attacker_case["case_id"]},
        headers={"X-Owner-Id": "attacker"},
    )
    assert response.status_code == 404

    stored = fake_db.collection("documents").document("doc_a").get().to_dict()
    assert stored.get("case_id") is None


def test_owner_cannot_assign_their_document_into_someone_elses_case(client, fake_db):
    """The reverse direction: even the document's real owner shouldn't be
    able to slot their document into a case they don't own."""
    seed_document(fake_db, "doc_a", "owner-1", [{"title": "T"}])
    victim_case = client.post(
        "/cases", json={"name": "Victim's case"}, headers={"X-Owner-Id": "victim-owner"}
    ).json()

    response = client.patch(
        "/documents/doc_a/case",
        json={"case_id": victim_case["case_id"]},
        headers={"X-Owner-Id": "owner-1"},
    )
    assert response.status_code == 404


def test_non_owner_cannot_delete_someone_elses_case(client, fake_db):
    case = client.post("/cases", json={"name": "Case"}, headers={"X-Owner-Id": "victim-owner"}).json()

    response = client.delete(f"/cases/{case['case_id']}", headers={"X-Owner-Id": "attacker"})
    assert response.status_code == 404

    still_there = client.get(f"/cases/{case['case_id']}", headers={"X-Owner-Id": "victim-owner"})
    assert still_there.status_code == 200
