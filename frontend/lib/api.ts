export type Priority = "high" | "medium" | "low";

export interface Task {
  title: string;
  description: string;
  deadline: string | null;
  priority: Priority;
  dependencies: number[];
  required_documents: string[];
  confidence: number;
  source_excerpt: string;
  status: string;
}

export interface UploadResult {
  document_id: string;
  summary: string;
  tasks: Task[];
  warnings: string[];
  missing_information: string[];
  saved_task_ids: string[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {}

export async function uploadDocument(file: File): Promise<UploadResult> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_URL}/documents/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(body?.detail ?? "Document analysis failed. Please try again.");
  }

  return response.json();
}
