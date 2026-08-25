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


class ValidatedTask(Task):
    status: str = "todo"


class ValidationResult(BaseModel):
    tasks: list[ValidatedTask]
    warnings: list[str] = []
    missing_information: list[str] = []


class SaveTasksResult(BaseModel):
    success: bool
    saved_task_ids: list[str]
