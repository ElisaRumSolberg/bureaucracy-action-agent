export type Priority = "high" | "medium" | "low";
export type ConditionStatus = "unknown" | "applies" | "not_applicable";

export interface Task {
  id: string;
  title: string;
  description: string;
  deadline: string | null;
  deadline_inherited: boolean;
  priority: Priority;
  priority_reason: string;
  risk_level: Priority;
  risk_reason: string;
  dependencies: number[];
  required_documents: string[];
  confidence: number;
  source_excerpt: string;
  status: string;
  is_conditional: boolean;
  condition: string;
  condition_status: ConditionStatus;
}

export interface UploadResult {
  document_id: string;
  summary: string;
  tasks: Task[];
  warnings: string[];
  missing_information: string[];
  consequences: string[];
  saved_task_ids: string[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/** A per-browser anonymous id (no accounts in this app) so the backend can
 * scope "my documents" without exposing every user's uploads to everyone —
 * persisted in localStorage, sent as X-Owner-Id on every document request. */
function getOwnerId(): string {
  if (typeof window === "undefined") return "";
  const key = "bureaucracy_agent_owner_id";
  let id = window.localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(key, id);
  }
  return id;
}

function ownerHeaders(extra?: Record<string, string>): Record<string, string> {
  return { "X-Owner-Id": getOwnerId(), ...extra };
}

export interface DocumentSummary {
  document_id: string;
  filename: string;
  status: string;
  summary: string;
  uploaded_at: string | null;
}

export async function listDocuments(): Promise<DocumentSummary[]> {
  const response = await fetch(`${API_URL}/documents`, { headers: ownerHeaders() });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(body?.detail ?? "Could not load document history.");
  }

  const data = await response.json();
  return data.documents as DocumentSummary[];
}

export async function getDocument(documentId: string): Promise<UploadResult> {
  const response = await fetch(`${API_URL}/documents/${documentId}`, { headers: ownerHeaders() });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(body?.detail ?? "Could not load this document.");
  }

  return response.json();
}

export async function deleteDocument(documentId: string): Promise<void> {
  const response = await fetch(`${API_URL}/documents/${documentId}`, {
    method: "DELETE",
    headers: ownerHeaders(),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(body?.detail ?? "Could not delete this document.");
  }
}

export class ApiError extends Error {}

export async function uploadDocument(
  file: File,
  targetLanguage?: string
): Promise<UploadResult> {
  const formData = new FormData();
  formData.append("file", file);
  if (targetLanguage) formData.append("target_language", targetLanguage);

  const response = await fetch(`${API_URL}/documents/upload`, {
    method: "POST",
    headers: ownerHeaders(),
    body: formData,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(body?.detail ?? "Document analysis failed. Please try again.");
  }

  return response.json();
}

export async function updateTaskStatus(
  taskId: string,
  status: "todo" | "done"
): Promise<void> {
  const response = await fetch(`${API_URL}/documents/tasks/${taskId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(body?.detail ?? "Could not update task status.");
  }
}

export async function updateConditionStatus(
  taskId: string,
  conditionStatus: ConditionStatus
): Promise<void> {
  const response = await fetch(`${API_URL}/documents/tasks/${taskId}/condition-status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ condition_status: conditionStatus }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(body?.detail ?? "Could not update condition status.");
  }
}

export interface AgentEvent {
  type: string;
  message: string;
  created_at: string;
}

export async function getAgentEvents(documentId: string): Promise<AgentEvent[]> {
  const response = await fetch(`${API_URL}/documents/${documentId}/events`);

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(body?.detail ?? "Could not load agent activity.");
  }

  const data = await response.json();
  return data.events as AgentEvent[];
}

export interface TaskGuidance {
  document_requirements: string[];
  suggested_steps: string[];
  prerequisites: string[];
  common_mistakes: string[];
  generated_at: string;
}

export async function getTaskGuidance(taskId: string): Promise<TaskGuidance> {
  const response = await fetch(`${API_URL}/documents/tasks/${taskId}/guidance`, {
    method: "POST",
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(body?.detail ?? "Could not generate guidance.");
  }

  return response.json();
}

export async function askTaskQuestion(
  taskId: string,
  question: string
): Promise<string> {
  const response = await fetch(`${API_URL}/documents/tasks/${taskId}/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(body?.detail ?? "Could not answer the question.");
  }

  const data = await response.json();
  return data.answer as string;
}

export interface DelayImpact {
  summary: string;
  downstream_count: number;
  downstream_titles: string[];
}

export async function getDelayImpact(taskId: string): Promise<DelayImpact> {
  const response = await fetch(`${API_URL}/documents/tasks/${taskId}/delay-impact`, {
    method: "POST",
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(body?.detail ?? "Could not compute delay impact.");
  }

  return response.json();
}
