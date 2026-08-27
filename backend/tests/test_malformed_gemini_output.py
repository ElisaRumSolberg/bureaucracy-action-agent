"""Adversarial coverage for what happens when Gemini's structured output is
garbage — invalid JSON, a task count that drifts from what was sent, a
missing required field, or extra hallucinated keys. translate_document_content
is the one place in the codebase that parses raw Gemini JSON text by hand
(everything else goes through the ADK tool-calling loop, already covered by
test_llm_failure_handling.py's generic-exception tests).

No pytest-asyncio in this project's test setup, so async calls are driven
with asyncio.run() from plain sync test functions, same as elsewhere."""

import asyncio
from types import SimpleNamespace

import pytest

from app.agent.translate import TranslationResult, translate_document_content
from tests.seed_helpers import seed_document


def _fake_client_returning(text: str):
    async def generate_content(**kwargs):
        return SimpleNamespace(text=text)

    return SimpleNamespace(aio=SimpleNamespace(models=SimpleNamespace(generate_content=generate_content)))


ORIGINAL_TASKS = [{"title": "Upload passport", "description": "d", "condition": "", "required_documents": []}]


def _translate(**overrides):
    kwargs = dict(
        target_language="Türkçe",
        document_summary="s",
        warnings=[],
        missing_information=[],
        consequences=[],
        tasks=ORIGINAL_TASKS,
    )
    kwargs.update(overrides)
    return asyncio.run(translate_document_content(**kwargs))


def test_invalid_json_response_raises(monkeypatch):
    monkeypatch.setattr(
        "app.agent.translate._gemini_client", lambda: _fake_client_returning("this is not json")
    )
    with pytest.raises(Exception):  # json.JSONDecodeError
        _translate()


def test_empty_response_raises(monkeypatch):
    monkeypatch.setattr("app.agent.translate._gemini_client", lambda: _fake_client_returning(""))
    with pytest.raises(Exception):
        _translate()


def test_task_count_mismatch_is_rejected(monkeypatch):
    """Structured output occasionally drops or merges items under length
    pressure — trusting a mismatched count would desync task indices from
    the rest of the app's persisted state."""
    text = TranslationResult(document_summary="s", tasks=[]).model_dump_json()  # 0 tasks, expected 1
    monkeypatch.setattr("app.agent.translate._gemini_client", lambda: _fake_client_returning(text))

    with pytest.raises(ValueError, match="expected 1"):
        _translate()


def test_missing_required_field_raises(monkeypatch):
    """A response missing document_summary (required, no default) must be
    rejected, not silently coerced to an empty string."""
    monkeypatch.setattr(
        "app.agent.translate._gemini_client",
        lambda: _fake_client_returning('{"tasks": []}'),
    )
    with pytest.raises(Exception):
        _translate(tasks=[])


def test_hallucinated_extra_field_is_silently_dropped(monkeypatch):
    """An extra, unrequested key in the JSON (e.g. the model inventing a
    'confidence' field on the translation) must not crash parsing — Pydantic
    drops unknown keys by default."""
    text = (
        '{"document_summary": "s", "tasks": ['
        '{"title": "t", "description": "d", "condition": "", "required_documents": [], '
        '"made_up_field": "hallucinated"}]}'
    )
    monkeypatch.setattr("app.agent.translate._gemini_client", lambda: _fake_client_returning(text))

    result = _translate()
    assert result.tasks[0].title == "t"
    assert not hasattr(result.tasks[0], "made_up_field")


def test_route_returns_502_when_translation_output_is_malformed(client, fake_db, monkeypatch):
    async def broken_translate(**kwargs):
        raise ValueError("Translation returned 0 tasks, expected 1.")

    monkeypatch.setattr("app.routes.documents.translate_document_content", broken_translate)

    seed_document(
        fake_db,
        "doc_a",
        "owner-1",
        [
            {
                "title": "Upload passport",
                "original_title": "Upload passport",
                "original_description": "desc",
                "original_condition": "",
                "original_required_documents": [],
            }
        ],
    )

    response = client.post(
        "/documents/doc_a/translate",
        json={"target_language": "Français"},
        headers={"X-Owner-Id": "owner-1"},
    )
    assert response.status_code == 502

    # The task must be left exactly as it was — a failed translation must
    # never partially overwrite titles/descriptions.
    unchanged = client.get("/documents/doc_a", headers={"X-Owner-Id": "owner-1"}).json()
    assert unchanged["tasks"][0]["title"] == "Upload passport"
