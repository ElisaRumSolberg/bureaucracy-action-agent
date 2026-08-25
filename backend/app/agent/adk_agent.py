from dataclasses import dataclass, field

from google.adk.agents import LlmAgent
from google.adk.runners import InMemoryRunner
from google.adk.tools import FunctionTool
from google.genai import types

from app.agent.prompts import AGENT_INSTRUCTION, language_instruction
from app.agent.tools import save_tasks, validate_tasks
from app.config import settings
from app.models.schemas import ExtractionResult, SaveTasksResult, Task, ValidationResult


@dataclass
class _PipelineState:
    validation: ValidationResult | None = None
    save_result: SaveTasksResult | None = None
    warnings: list[str] = field(default_factory=list)


class AgentPipelineError(RuntimeError):
    """Raised when the agent did not complete the validate/save tool sequence."""


def _build_tools(document_id: str, state: _PipelineState) -> list[FunctionTool]:
    def validate_tasks_tool(
        tasks: list[Task],
        warnings: list[str],
        missing_information: list[str],
    ) -> dict:
        """Validates and normalizes the extracted tasks (dedupe, dates, priority).

        Args:
            tasks: the raw tasks you extracted from the document.
            warnings: warnings about ambiguous or uncertain information.
            missing_information: information the document doesn't state.
        """
        extraction = ExtractionResult(
            document_summary="",
            tasks=tasks,
            warnings=warnings,
            missing_information=missing_information,
        )
        state.validation = validate_tasks(extraction)
        return {
            "validated_task_count": len(state.validation.tasks),
            "warnings": state.validation.warnings,
        }

    def save_tasks_tool() -> dict:
        """Persists the already-validated tasks to Firestore. Takes no arguments."""
        if state.validation is None:
            return {"success": False, "error": "call validate_tasks first"}
        state.save_result = save_tasks(document_id, state.validation)
        return {
            "success": state.save_result.success,
            "saved_count": len(state.save_result.saved_task_ids),
        }

    return [FunctionTool(validate_tasks_tool), FunctionTool(save_tasks_tool)]


async def _run_once(
    document_text: str, document_id: str, target_language: str | None
) -> tuple[str, ValidationResult, SaveTasksResult]:
    state = _PipelineState()
    agent = LlmAgent(
        name="bureaucracy_action_agent",
        model=settings.gemini_model,
        instruction=AGENT_INSTRUCTION + language_instruction(target_language),
        tools=_build_tools(document_id, state),
    )
    runner = InMemoryRunner(agent=agent, app_name="bureaucracy_action_agent")
    session = await runner.session_service.create_session(
        app_name="bureaucracy_action_agent", user_id="api"
    )

    final_text = ""
    content = types.Content(
        role="user", parts=[types.Part(text=f"Document text:\n{document_text}")]
    )
    async for event in runner.run_async(
        user_id="api", session_id=session.id, new_message=content
    ):
        if event.content and event.content.parts:
            for part in event.content.parts:
                if part.text:
                    final_text = part.text

    if state.validation is None or state.save_result is None:
        raise AgentPipelineError(
            "Agent did not complete the validate_tasks/save_tasks tool sequence."
        )

    return final_text.strip(), state.validation, state.save_result


async def run_agent_pipeline(
    document_text: str, document_id: str, target_language: str | None = None
) -> tuple[str, ValidationResult, SaveTasksResult]:
    """Runs the extraction/validation/save agent pipeline once, retrying once on failure."""
    try:
        return await _run_once(document_text, document_id, target_language)
    except Exception:
        return await _run_once(document_text, document_id, target_language)
