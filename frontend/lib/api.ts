import { auth } from "@/lib/firebase";

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
  content_language?: string | null;
  case_id?: string | null;
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

/** Anonymous X-Owner-Id header, plus a verified Firebase Authorization
 * bearer token when someone is signed in. The backend prefers the verified
 * token over the header when both are present, so signed-in identity can't
 * be spoofed — the header stays only as the anonymous fallback. */
async function ownerHeaders(extra?: Record<string, string>): Promise<Record<string, string>> {
  const headers: Record<string, string> = { "X-Owner-Id": getOwnerId(), ...extra };
  const user = auth.currentUser;
  if (user) {
    headers["Authorization"] = `Bearer ${await user.getIdToken()}`;
  }
  return headers;
}

export interface DocumentSummary {
  document_id: string;
  filename: string;
  status: string;
  summary: string;
  uploaded_at: string | null;
  case_id?: string | null;
}

export async function listDocuments(): Promise<DocumentSummary[]> {
  const response = await fetch(`${API_URL}/documents`, { headers: await ownerHeaders() });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(body?.detail ?? "Could not load document history.");
  }

  const data = await response.json();
  return data.documents as DocumentSummary[];
}

export async function getDocument(documentId: string): Promise<UploadResult> {
  const response = await fetch(`${API_URL}/documents/${documentId}`, { headers: await ownerHeaders() });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(body?.detail ?? "Could not load this document.");
  }

  return response.json();
}

export async function translateDocument(
  documentId: string,
  targetLanguage?: string
): Promise<UploadResult> {
  const response = await fetch(`${API_URL}/documents/${documentId}/translate`, {
    method: "POST",
    headers: await ownerHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ target_language: targetLanguage || null }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(body?.detail ?? "Could not translate this document.");
  }

  return response.json();
}

export async function deleteDocument(documentId: string): Promise<void> {
  const response = await fetch(`${API_URL}/documents/${documentId}`, {
    method: "DELETE",
    headers: await ownerHeaders(),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(body?.detail ?? "Could not delete this document.");
  }
}

export async function assignDocumentToCase(
  documentId: string,
  caseId: string | null
): Promise<void> {
  const response = await fetch(`${API_URL}/documents/${documentId}/case`, {
    method: "PATCH",
    headers: await ownerHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ case_id: caseId }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(body?.detail ?? "Could not update this document's case.");
  }
}

export class ApiError extends Error {}

export interface CaseSummary {
  case_id: string;
  name: string;
  created_at: string | null;
  document_count: number;
}

export interface CaseDocument {
  document_id: string;
  filename: string;
  summary: string;
  missing_information: string[];
  tasks: Task[];
}

export interface CaseStats {
  document_count: number;
  task_count: number;
  blocked_count: number;
  unanswered_conditions: number;
  approaching_deadlines: number;
  missing_information_count: number;
}

export interface DeadlineConflict {
  deadline: string;
  tasks: { document_id: string; filename: string; task_id: string; title: string }[];
}

export interface CaseDetail {
  case_id: string;
  name: string;
  documents: CaseDocument[];
  next_best_action: { document_id: string; filename: string; task: Task } | null;
  stats: CaseStats;
  deadline_conflicts: DeadlineConflict[];
}

export async function listCases(): Promise<CaseSummary[]> {
  const response = await fetch(`${API_URL}/cases`, { headers: await ownerHeaders() });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(body?.detail ?? "Could not load cases.");
  }

  const data = await response.json();
  return data.cases as CaseSummary[];
}

export async function createCase(name: string): Promise<CaseSummary> {
  const response = await fetch(`${API_URL}/cases`, {
    method: "POST",
    headers: await ownerHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ name }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(body?.detail ?? "Could not create this case.");
  }

  return response.json();
}

export async function getCase(caseId: string): Promise<CaseDetail> {
  const response = await fetch(`${API_URL}/cases/${caseId}`, { headers: await ownerHeaders() });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(body?.detail ?? "Could not load this case.");
  }

  return response.json();
}

export async function deleteCase(caseId: string): Promise<void> {
  const response = await fetch(`${API_URL}/cases/${caseId}`, {
    method: "DELETE",
    headers: await ownerHeaders(),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(body?.detail ?? "Could not delete this case.");
  }
}

export async function uploadDocument(
  file: File,
  targetLanguage?: string
): Promise<UploadResult> {
  const formData = new FormData();
  formData.append("file", file);
  if (targetLanguage) formData.append("target_language", targetLanguage);

  const response = await fetch(`${API_URL}/documents/upload`, {
    method: "POST",
    headers: await ownerHeaders(),
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
