"use client";

import { useEffect, useState } from "react";
import {
  ApiError,
  assignDocumentToCase,
  deleteCase,
  getCase,
  listDocuments,
  updateConditionStatus,
  updateTaskStatus,
  uploadDocument,
  type CaseDetail,
  type ConditionStatus,
  type DocumentSummary,
  type Task,
} from "@/lib/api";
import TaskCard from "./TaskCard";
import RiskRadar from "./RiskRadar";
import UploadScreen from "./UploadScreen";
import ProcessingScreen from "./ProcessingScreen";
import { t } from "@/lib/uiTranslations";

interface Props {
  caseId: string;
  onBack: () => void;
  onDeleted: () => void;
  onOpenDocument: (documentId: string) => void;
  /** Jumps to the main Dashboard (the current document if one's open, else
   * Welcome) — first step of the Dashboard / Cases / <case name> breadcrumb. */
  onGoToDashboard: () => void;
  language?: string;
}

export default function CaseDetailScreen({
  caseId,
  onBack,
  onDeleted,
  onOpenDocument,
  onGoToDashboard,
  language,
}: Props) {
  const [detail, setDetail] = useState<CaseDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [unassigned, setUnassigned] = useState<DocumentSummary[]>([]);
  const [selectedToAdd, setSelectedToAdd] = useState("");
  const [busy, setBusy] = useState(false);
  const [addPanel, setAddPanel] = useState<"none" | "upload" | "existing">("none");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  function refresh() {
    getCase(caseId)
      .then(setDetail)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Something went wrong."));
    listDocuments()
      .then((docs) => setUnassigned(docs.filter((d) => !d.case_id)))
      .catch(() => {});
  }

  useEffect(refresh, [caseId]);

  async function handleAddDocument() {
    if (!selectedToAdd || busy) return;
    setBusy(true);
    try {
      await assignDocumentToCase(selectedToAdd, caseId);
      setSelectedToAdd("");
      setAddPanel("none");
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not add this document.");
    } finally {
      setBusy(false);
    }
  }

  async function handleUploadNewDocument(file: File, targetLanguage?: string) {
    setUploading(true);
    setUploadError(null);
    try {
      // Reuses the exact same upload call the main Upload screen uses —
      // Gemini extraction, deterministic validation, and save all happen
      // here, unchanged. Only once that document actually exists do we
      // attach it to this case, so a failed upload never leaves a broken
      // or partial document attached to the case.
      const result = await uploadDocument(file, targetLanguage);
      await assignDocumentToCase(result.document_id, caseId);
      setAddPanel("none");
      refresh();
    } catch (err) {
      // Whether the upload itself failed or the follow-up attach call did,
      // surface it rather than silently pretending the document is now
      // part of the case — the case's own state is untouched either way
      // since refresh() is only called after both steps succeed.
      setUploadError(err instanceof ApiError ? err.message : "Could not upload this document.");
    } finally {
      setUploading(false);
    }
  }

  async function handleRemoveDocument(documentId: string) {
    setBusy(true);
    try {
      await assignDocumentToCase(documentId, null);
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not remove this document.");
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleTask(task: Task) {
    const nextStatus = task.status === "done" ? "todo" : "done";
    try {
      await updateTaskStatus(task.id, nextStatus);
      refresh();
    } catch {
      // Leave the displayed state as-is — refresh() will re-sync on the next
      // successful action, consistent with the document dashboard's approach.
    }
  }

  async function handleSetConditionStatus(task: Task, conditionStatus: ConditionStatus) {
    try {
      await updateConditionStatus(task.id, conditionStatus);
      refresh();
    } catch {
      // Same as above.
    }
  }

  async function handleDeleteCase() {
    if (!confirm(t("Delete this case? Its documents will not be deleted.", language))) return;
    try {
      await deleteCase(caseId);
      onDeleted();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete this case.");
    }
  }

  if (error && !detail) {
    return (
      <div className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
        <button onClick={onBack} className="mt-4 text-sm font-medium text-brand hover:underline">
          {t("Back to cases", language)}
        </button>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
        <p className="text-sm text-zinc-400">Loading…</p>
      </div>
    );
  }

  const nba = detail.next_best_action;

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <nav className="flex min-w-0 items-center gap-1.5 overflow-hidden text-sm text-zinc-500 dark:text-zinc-400">
            <button
              onClick={onGoToDashboard}
              className="shrink-0 font-medium hover:text-brand dark:hover:text-indigo-400"
            >
              {t("Dashboard", language)}
            </button>
            <span className="shrink-0 text-zinc-300 dark:text-zinc-700">/</span>
            <button
              onClick={onBack}
              className="shrink-0 font-medium hover:text-brand dark:hover:text-indigo-400"
            >
              {t("Cases", language)}
            </button>
            <span className="shrink-0 text-zinc-300 dark:text-zinc-700">/</span>
            <span className="min-w-0 truncate font-medium text-zinc-700 dark:text-zinc-300" title={detail.name}>
              {detail.name}
            </span>
          </nav>
          <h1 className="mt-1 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            {detail.name}
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-zinc-600 dark:text-zinc-400">
            <span className="font-semibold text-zinc-900 dark:text-zinc-50">
              {detail.stats.document_count}
            </span>{" "}
            {detail.stats.document_count === 1 ? t("document", language) : t("documents", language)}
            <span className="text-zinc-300 dark:text-zinc-700">→</span>
            <span className="font-semibold text-zinc-900 dark:text-zinc-50">
              {detail.stats.task_count}
            </span>{" "}
            {t("actions extracted", language)}
            <span className="text-zinc-300 dark:text-zinc-700">→</span>
            <span className="font-semibold text-zinc-900 dark:text-zinc-50">
              {detail.stats.blocked_count}
            </span>{" "}
            {t("tasks blocked", language)}
            <span className="text-zinc-300 dark:text-zinc-700">→</span>
            <span
              className={`font-semibold ${nba ? "text-brand dark:text-indigo-400" : "text-zinc-400 dark:text-zinc-600"}`}
            >
              {nba ? t("Next action available", language) : t("No next action yet", language)}
            </span>
          </p>
        </div>
        <button
          onClick={handleDeleteCase}
          className="shrink-0 rounded-full border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
        >
          {t("Delete case", language)}
        </button>
      </div>

      {nba ? (
        <div className="mt-5 rounded-2xl border border-zinc-200 border-l-4 border-l-brand bg-brand-light p-5 dark:border-zinc-800 dark:border-l-indigo-500 dark:bg-indigo-950/30">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand dark:text-indigo-400">
            {nba.is_conditional_pick ? t("If this applies to you", language) : t("Recommended next action", language)}
          </p>
          <h3 className="mt-1 break-words text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            {nba.is_conditional_pick
              ? `${t("Confirm whether this applies:", language)} ${nba.task.title}`
              : nba.task.title}
          </h3>
          {nba.is_conditional_pick && nba.task.condition && (
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              {t("Condition:", language)} {nba.task.condition}
            </p>
          )}
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {t("From:", language)} {nba.filename}
          </p>
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900 dark:bg-emerald-950">
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
            {t("Nothing is unblocked yet", language)}
          </p>
        </div>
      )}

      <div className="mt-4">
        <RiskRadar
          stats={{
            approachingDeadlines: detail.stats.approaching_deadlines,
            blockedCount: detail.stats.blocked_count,
            unansweredConditions: detail.stats.unanswered_conditions,
            missingInformationCount: detail.stats.missing_information_count,
          }}
          language={language}
        />
      </div>

      {detail.deadline_conflicts.length > 0 && (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-5 dark:border-red-900 dark:bg-red-950">
          <p className="text-sm font-semibold text-red-700 dark:text-red-300">
            ⚠ {t("Same deadline on multiple documents", language)}
          </p>
          <p className="mt-0.5 text-xs text-red-600/80 dark:text-red-400/80">
            {t("Tasks from different documents happen to fall on the same date — worth double-checking they don't need to happen in a specific order.", language)}
          </p>
          <ul className="mt-2 space-y-2 text-sm text-red-700 dark:text-red-300">
            {detail.deadline_conflicts.map((conflict) => (
              <li key={conflict.deadline}>
                <span className="font-medium">{conflict.deadline}</span>
                {": "}
                {conflict.tasks.map((task, i) => (
                  <span key={task.task_id}>
                    {i > 0 && ", "}
                    {task.title} ({task.filename})
                  </span>
                ))}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6">
        {addPanel === "none" && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setAddPanel("upload")}
              className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90 dark:bg-indigo-500"
            >
              + {t("Upload new document", language)}
            </button>
            <button
              onClick={() => setAddPanel("existing")}
              className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              {t("Add existing document", language)}
            </button>
          </div>
        )}

        {addPanel === "upload" && (
          <div className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-2 dark:border-zinc-800">
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {t("Upload new document", language)}
              </p>
              {!uploading && (
                <button
                  onClick={() => {
                    setAddPanel("none");
                    setUploadError(null);
                  }}
                  className="text-xs font-medium text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                >
                  {t("Cancel", language)}
                </button>
              )}
            </div>
            {uploading ? (
              <ProcessingScreen />
            ) : (
              <UploadScreen onFileSelected={handleUploadNewDocument} errorMessage={uploadError} />
            )}
          </div>
        )}

        {addPanel === "existing" && (
          <div className="flex items-center gap-2">
            <select
              value={selectedToAdd}
              onChange={(e) => setSelectedToAdd(e.target.value)}
              className="flex-1 rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900 focus:border-brand focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            >
              <option value="">{t("Add an existing document…", language)}</option>
              {unassigned.map((doc) => (
                <option key={doc.document_id} value={doc.document_id}>
                  {doc.filename}
                </option>
              ))}
            </select>
            <button
              onClick={handleAddDocument}
              disabled={!selectedToAdd || busy}
              className="shrink-0 rounded-full bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 dark:bg-indigo-500"
            >
              {t("Add", language)}
            </button>
            <button
              onClick={() => setAddPanel("none")}
              className="shrink-0 text-xs font-medium text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            >
              {t("Cancel", language)}
            </button>
          </div>
        )}
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      {detail.documents.length === 0 && (
        <p className="mt-6 text-sm text-zinc-400">
          {t("No documents in this case yet.", language)}
        </p>
      )}

      <div className="mt-6 space-y-8">
        {detail.documents.map((doc) => (
          <div key={doc.document_id}>
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={() => onOpenDocument(doc.document_id)}
                className="min-w-0 truncate text-sm font-semibold text-zinc-900 hover:text-brand dark:text-zinc-50 dark:hover:text-indigo-400"
              >
                {doc.filename}
              </button>
              <button
                onClick={() => handleRemoveDocument(doc.document_id)}
                className="shrink-0 text-xs text-zinc-400 hover:text-red-600 dark:hover:text-red-400"
              >
                {t("Remove from case", language)}
              </button>
            </div>
            <div className="mt-3 flex flex-col">
              {doc.tasks.map((task, index) => (
                <div key={task.id} className="flex gap-3">
                  <div className="flex shrink-0 flex-col items-center pt-6">
                    <span
                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                        task.status === "done"
                          ? "bg-emerald-500"
                          : nba?.task.id === task.id
                            ? "bg-brand dark:bg-indigo-500"
                            : "border-2 border-zinc-300 bg-white dark:border-zinc-600 dark:bg-zinc-900"
                      }`}
                    />
                    {index < doc.tasks.length - 1 && (
                      <span className="mt-1 w-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 pb-4">
                    <TaskCard
                      task={task}
                      index={index}
                      allTasks={doc.tasks}
                      onToggleDone={handleToggleTask}
                      onSetConditionStatus={handleSetConditionStatus}
                      language={language}
                      sourceLabel={doc.filename}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
