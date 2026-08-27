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
        <p className="mt-6 text-sm text-zinc-400">{t("No cases yet.", language)}</p>
      )}

      <ul className="mt-6 space-y-3">
        {cases?.map((c) => (
          <li
            key={c.case_id}
            className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="min-w-0">
              <p className="truncate font-medium text-zinc-900 dark:text-zinc-50">{c.name}</p>
              <p className="mt-0.5 text-xs text-zinc-400">
                {c.document_count} {c.document_count === 1 ? t("document", language) : t("documents", language)}
              </p>
            </div>
            <button
              onClick={() => onOpen(c.case_id)}
              className="shrink-0 rounded-full bg-brand px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 dark:bg-indigo-500"
            >
              {t("Open", language)}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
