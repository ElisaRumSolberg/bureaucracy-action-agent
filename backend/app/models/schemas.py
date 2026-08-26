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


class ValidationResult(BaseModel):
    tasks: list[ValidatedTask]
    warnings: list[str] = Field(default_factory=list)
    missing_information: list[str] = Field(default_factory=list)
    consequences: list[str] = Field(default_factory=list)


class SaveTasksResult(BaseModel):
    success: bool
    saved_task_ids: list[str]
