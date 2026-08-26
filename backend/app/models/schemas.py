from typing import Optional

from pydantic import BaseModel, Field


class Task(BaseModel):
    title: str
    description: str
    deadline: Optional[str] = None
    deadline_inherited: bool = False
    priority: str  # high | medium | low
    dependencies: list[int] = Field(default_factory=list)
    required_documents: list[str] = Field(default_factory=list)
    confidence: float
    source_excerpt: str
    is_conditional: bool = False
    condition: str = ""


class ExtractionResult(BaseModel):
    document_summary: str
    tasks: list[Task]
    warnings: list[str] = Field(default_factory=list)
    missing_information: list[str] = Field(default_factory=list)
    consequences: list[str] = Field(default_factory=list)


class ValidatedTask(Task):
    status: str = "todo"
    priority_reason: str = ""
    risk_level: str = "low"  # high | medium | low
    risk_reason: str = ""
    # Only meaningful when is_conditional is True: whether the user has
    # confirmed their situation matches the stated condition. "not_applicable"
    # excludes the task from Next Best Action and from blocking other tasks.
    condition_status: str = "unknown"  # unknown | applies | not_applicable


class ValidationResult(BaseModel):
    tasks: list[ValidatedTask]
    warnings: list[str] = Field(default_factory=list)
    missing_information: list[str] = Field(default_factory=list)
    consequences: list[str] = Field(default_factory=list)


class SaveTasksResult(BaseModel):
    success: bool
    saved_task_ids: list[str]


class TaskGuidance(BaseModel):
    """Per-task 'how do I do this' help. document_requirements is grounded
    strictly in what the source document/task already states; suggested_steps
    etc. are the model's own advice — kept in separate fields so the UI never
    blurs "the document says" with "the AI suggests"."""

    document_requirements: list[str] = Field(default_factory=list)
    suggested_steps: list[str] = Field(default_factory=list)
    prerequisites: list[str] = Field(default_factory=list)
    common_mistakes: list[str] = Field(default_factory=list)
    generated_at: str = ""
