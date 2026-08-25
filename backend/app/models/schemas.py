from typing import Optional

from pydantic import BaseModel


class Task(BaseModel):
    title: str
    description: str
    deadline: Optional[str] = None
    priority: str  # high | medium | low
    dependencies: list[int] = []
    required_documents: list[str] = []
    confidence: float
    source_excerpt: str


class ExtractionResult(BaseModel):
    document_summary: str
    tasks: list[Task]
    warnings: list[str] = []
    missing_information: list[str] = []
    consequences: list[str] = []


class ValidatedTask(Task):
    status: str = "todo"
    priority_reason: str = ""
    risk_level: str = "low"  # high | medium | low
    risk_reason: str = ""


class ValidationResult(BaseModel):
    tasks: list[ValidatedTask]
    warnings: list[str] = []
    missing_information: list[str] = []
    consequences: list[str] = []


class SaveTasksResult(BaseModel):
    success: bool
    saved_task_ids: list[str]
