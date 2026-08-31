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
  type CaseDetail,
  type ConditionStatus,
  type DocumentSummary,
  type Task,
} from "@/lib/api";
import TaskCard from "./TaskCard";
import RiskRadar from "./RiskRadar";
import { t } from "@/lib/uiTranslations";

interface Props {
  caseId: string;
  onBack: () => void;
  onDeleted: () => void;
  onOpenDocument: (documentId: string) => void;
  language?: string;
}

export default function CaseDetailScreen({
  caseId,
  onBack,
  onDeleted,
  onOpenDocument,
  language,
}: Props) {
  const [detail, setDetail] = useState<CaseDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [unassigned, setUnassigned] = useState<DocumentSummary[]>([]);
  const [selectedToAdd, setSelectedToAdd] = useState("");
  const [busy, setBusy] = useState(false);

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
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not add this document.");
    } finally {
      setBusy(false);
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
        <div>
          <button
            onClick={onBack}
            className="text-sm font-medium text-zinc-500 hover:text-brand dark:text-zinc-400 dark:hover:text-indigo-400"
          >
            {t("← Back to cases", language)}
          </button>
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
            {t("Recommended next action", language)}
          </p>
          <h3 className="mt-1 break-words text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            {nba.task.title}
          </h3>
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

      <div className="mt-6 flex items-center gap-2">
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
            <div className="mt-3 grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
              {doc.tasks.map((task, index) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  index={index}
                  allTasks={doc.tasks}
                  onToggleDone={handleToggleTask}
                  onSetConditionStatus={handleSetConditionStatus}
                  language={language}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
