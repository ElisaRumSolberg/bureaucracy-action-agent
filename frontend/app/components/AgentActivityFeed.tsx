"use client";

import { useEffect, useState } from "react";
import { ApiError, getAgentEvents, type AgentEvent } from "@/lib/api";
import { t } from "@/lib/uiTranslations";

interface Props {
  documentId: string;
  /** Any string that changes when the task list changes (status, condition
   * confirmations, ...) — used purely to trigger a refetch while the feed
   * is open, since the backend is the source of truth for what happened. */
  refreshToken: string;
  language?: string;
  /** Skip the collapse/toggle chrome and always show the feed — for a
   * dedicated Activity Log page rather than an inline panel. */
  alwaysOpen?: boolean;
  /** Show only the most recent N events (still oldest-first within that
   * slice) — for a small "Recent Activity" preview widget. */
  limit?: number;
  /** Shown next to the header when limited, e.g. a "View all" link to the
   * full Activity Log view. */
  onViewAll?: () => void;
}

const EVENT_ICON: Record<string, string> = {
  document_uploaded: "📄",
  extraction_complete: "🔍",
  validation_complete: "🔗",
  recommendation_selected: "🎯",
  recommendation_changed: "🎯",
  task_completed: "✅",
  task_reopened: "↩️",
  task_unblocked: "🔓",
  pipeline_failed: "⚠️",
};

export default function AgentActivityFeed({
  documentId,
  refreshToken,
  language,
  alwaysOpen = false,
  limit,
  onViewAll,
}: Props) {
  const [open, setOpen] = useState(alwaysOpen);
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getAgentEvents(documentId)
      .then((result) => {
        if (!cancelled) setEvents(result);
      })
      .catch((err) => {
        if (!cancelled)
          setError(err instanceof ApiError ? err.message : t("Something went wrong.", language));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [documentId, refreshToken, open]);

  const displayedEvents = limit && limit < events.length ? events.slice(-limit) : events;

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      {alwaysOpen ? (
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            🤖 {t(onViewAll ? "Recent Activity" : "Agent activity", language)}
          </span>
          {onViewAll && (
            <button
              onClick={onViewAll}
              className="text-xs font-medium text-brand hover:underline dark:text-indigo-400"
            >
              {t("View all", language)}
            </button>
          )}
        </div>
      ) : (
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          <span>🤖 {t("Agent activity", language)}</span>
          <span className="text-xs text-zinc-400">{open ? t("Hide", language) : t("Show", language)}</span>
        </button>
      )}

      {open && (
        <div className="border-t border-zinc-100 px-4 py-3 dark:border-zinc-800">
          {loading && <p className="text-xs text-zinc-400">{t("Loading…", language)}</p>}
          {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
          {!loading && !error && events.length === 0 && (
            <p className="text-xs text-zinc-400">{t("No activity yet.", language)}</p>
          )}
          <ol className="space-y-2">
            {displayedEvents.map((event, idx) => (
              <li key={idx} className="flex gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                <span>{EVENT_ICON[event.type] ?? "•"}</span>
                <span>{event.message}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
