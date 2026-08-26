"use client";

import { useEffect, useState } from "react";
import { ApiError, getAgentEvents, type AgentEvent } from "@/lib/api";

interface Props {
  documentId: string;
  /** Any string that changes when the task list changes (status, condition
   * confirmations, ...) — used purely to trigger a refetch while the feed
   * is open, since the backend is the source of truth for what happened. */
  refreshToken: string;
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

export default function AgentActivityFeed({ documentId, refreshToken }: Props) {
  const [open, setOpen] = useState(false);
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
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Something went wrong.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [documentId, refreshToken, open]);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-zinc-700 dark:text-zinc-300"
      >
        <span>🤖 Agent activity</span>
        <span className="text-xs text-zinc-400">{open ? "Hide" : "Show"}</span>
      </button>

      {open && (
        <div className="border-t border-zinc-100 px-4 py-3 dark:border-zinc-800">
          {loading && <p className="text-xs text-zinc-400">Loading…</p>}
          {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
          {!loading && !error && events.length === 0 && (
            <p className="text-xs text-zinc-400">No activity yet.</p>
          )}
          <ol className="space-y-2">
            {events.map((event, idx) => (
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
