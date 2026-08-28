"use client";

import { useEffect, useState } from "react";
import { ApiError, createCase, listCases, type CaseSummary } from "@/lib/api";
import { t } from "@/lib/uiTranslations";

interface Props {
  onOpen: (caseId: string) => void;
  language?: string;
}

export default function CasesScreen({ onOpen, language }: Props) {
  const [cases, setCases] = useState<CaseSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  function refresh() {
    listCases()
      .then(setCases)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Something went wrong."));
  }

  useEffect(refresh, []);

  async function handleCreate() {
    if (!newName.trim() || creating) return;
    setCreating(true);
    try {
      await createCase(newName.trim());
      setNewName("");
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create this case.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          {t("Cases", language)}
        </h1>
      </div>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        {t(
          "Group related documents (e.g. a visa application) to see their tasks in one place with one shared next action.",
          language
        )}
      </p>

      <div className="mt-4 flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          placeholder={t("New case name…", language)}
          className="flex-1 rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900 focus:border-brand focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
        <button
          onClick={handleCreate}
          disabled={creating || !newName.trim()}
          className="shrink-0 rounded-full bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 dark:bg-indigo-500"
        >
          {t("Create", language)}
        </button>
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      {cases === null && !error && <p className="mt-6 text-sm text-zinc-400">Loading…</p>}

      {cases && cases.length === 0 && (
        <div className="mt-6 rounded-2xl border border-dashed border-zinc-300 bg-white/50 p-6 text-center dark:border-zinc-700 dark:bg-zinc-900/40">
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {t("No cases yet", language)}
          </p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-zinc-500 dark:text-zinc-400">
            {t("A case groups related documents into one process, with one shared task list and one shared next action.", language)}
          </p>
          <div className="mx-auto mt-4 max-w-xs rounded-xl border border-zinc-200 bg-white p-3 text-left dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
              {t("Example", language)}
            </p>
            <p className="mt-1 font-medium text-zinc-900 dark:text-zinc-50">Study in Norway</p>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">3 documents · 8 tasks · 2 deadlines</p>
            <p className="mt-1 text-xs font-medium text-brand dark:text-indigo-400">
              {t("Next action:", language)} Upload proof of funds
            </p>
          </div>
        </div>
      )}

      <ul className="mt-6 space-y-3">
        {cases?.map((c) => {
          const progress = c.task_count > 0 ? Math.round((c.done_count / c.task_count) * 100) : 0;
          return (
            <li
              key={c.case_id}
              className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-zinc-900 dark:text-zinc-50">
                    {c.name}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    {c.document_count} {c.document_count === 1 ? t("document", language) : t("documents", language)}
                    {" · "}
                    {c.task_count} {t("tasks", language)}
                    {c.deadline_conflicts_count > 0 && (
                      <span className="ml-1 text-amber-600 dark:text-amber-400">
                        · ⚠ {c.deadline_conflicts_count} {t("conflicts", language)}
                      </span>
                    )}
                  </p>
                  {c.task_count > 0 && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-1.5 w-32 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                        <div
                          className="h-full rounded-full bg-brand dark:bg-indigo-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-zinc-400">{progress}%</span>
                    </div>
                  )}
                  {c.next_best_action_title && (
                    <p className="mt-2 truncate text-xs font-medium text-brand dark:text-indigo-400">
                      {t("Next action:", language)} {c.next_best_action_title}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => onOpen(c.case_id)}
                  className="shrink-0 rounded-full bg-brand px-4 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-90 dark:bg-indigo-500"
                >
                  {t("Open case", language)}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
