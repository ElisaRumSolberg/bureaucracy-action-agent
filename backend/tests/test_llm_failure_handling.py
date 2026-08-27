"""upload_document wraps the entire agent pipeline call (extraction,
validate_tasks, save_tasks) in one try/except — any failure inside it,
regardless of cause, must fail safely: no half-written task documents, the
document marked "failed", a pipeline_failed activity event, and a 502 to the
client. We simulate the different LLM failure modes described in the task
(malformed JSON, missing fields, empty response, bad dependency IDs,
hallucinated fields, timeout) as different exceptions raised from a mocked
run_agent_pipeline, since that's the actual boundary the route can see —
run_agent_pipeline itself already retries once internally (untouched here)."""

import pytest

from app.agent.adk_agent import AgentPipelineError


def _fake_pipeline_raising(exc: Exception):
    async def run(document_text, document_id, target_language=None, image_bytes=None, image_mime_type=None):
        raise exc

    return run


@pytest.mark.parametrize(
    "exc",
    [
        AgentPipelineError("Agent did not complete the validate_tasks/save_tasks tool sequence."),
        ValueError("malformed JSON from the model"),
        KeyError("missing required field"),
        TimeoutError("Gemini call timed out"),
        RuntimeError("unexpected failure"),
    ],
    ids=["empty_or_incomplete_response", "malformed_json", "missing_fields", "timeout", "generic_exception"],
)
def test_pipeline_failure_returns_502_and_marks_document_failed(client, fake_db, monkeypatch, exc):
    monkeypatch.setattr("app.routes.documents.run_agent_pipeline", _fake_pipeline_raising(exc))

    response = client.post(
        "/documents/upload",
        files={"file": ("notice.txt", b"Some document text.", "text/plain")},
        headers={"X-Owner-Id": "owner-1"},
    )

    assert response.status_code == 502
    assert response.json()["detail"] == "Document analysis failed. Please try again."

    # The document itself was already created (status starts "processing")
    # before the pipeline runs — it must be updated to a failed state, not
    # left stuck at "processing" or silently deleted.
    documents = list(fake_db._collections.get("documents", {}).values())
    assert len(documents) == 1
    assert documents[0]["status"] == "failed"
    assert documents[0]["agentRunStatus"] == "error"


def test_pipeline_failure_persists_no_task_documents(client, fake_db, monkeypatch):
    """A partially-hallucinated or malformed extraction must never leave
    orphaned/corrupted task docs behind — save_tasks only runs (and only
    persists) once validate_tasks succeeds inside the ADK tool loop, and here
    the whole pipeline call fails before that ever happens."""
    monkeypatch.setattr(
        "app.routes.documents.run_agent_pipeline",
        _fake_pipeline_raising(ValueError("malformed JSON from the model")),
    )

    client.post(
        "/documents/upload",
        files={"file": ("notice.txt", b"Some document text.", "text/plain")},
        headers={"X-Owner-Id": "owner-1"},
    )

    assert fake_db._collections.get("tasks", {}) == {}


def test_pipeline_failure_logs_a_pipeline_failed_event(client, fake_db, monkeypatch):
    monkeypatch.setattr(
        "app.routes.documents.run_agent_pipeline",
        _fake_pipeline_raising(RuntimeError("boom")),
    )

    client.post(
        "/documents/upload",
        files={"file": ("notice.txt", b"Some document text.", "text/plain")},
        headers={"X-Owner-Id": "owner-1"},
    )

    document_id = next(iter(fake_db._collections["documents"]))
    events = client.get(
        f"/documents/{document_id}/events", headers={"X-Owner-Id": "owner-1"}
    ).json()["events"]
    event_types = [e["type"] for e in events]
    assert "pipeline_failed" in event_types
    # No downstream events (extraction/validation/recommendation) should
    # exist — the pipeline never got that far.
    assert "recommendation_selected" not in event_types
