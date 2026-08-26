"use client";

import { useState } from "react";
import { ApiError, getDelayImpact, type DelayImpact } from "@/lib/api";

interface Props {
  taskId: string;
}

export default function TaskDelayImpactPanel({ taskId }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [impact, setImpact] = useState<DelayImpact | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleOpen() {
    const willOpen = !open;
    setOpen(willOpen);
    if (!willOpen || loading) return;

    // Downstream status can change as tasks get marked done, so this always
    // refetches rather than reusing a stale answer from a previous open.
    setLoading(true);
    setError(null);
    try {
      const result = await getDelayImpact(taskId);
      setImpact(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-2">
      <button
        onClick={handleOpen}
        className="w-full rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        {open ? "Hide delay impact" : "What if I delay this?"}
      </button>

      {open && (
        <div className="mt-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs dark:border-zinc-800 dark:bg-zinc-800/40">
          {loading && (
            <p className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600 dark:border-zinc-600 dark:border-t-zinc-300" />
              Checking downstream impact…
            </p>
          )}

          {error && <p className="text-red-600 dark:text-red-400">{error}</p>}

          {impact && !loading && (
            <div className="space-y-2">
              <p className="text-zinc-700 dark:text-zinc-300">{impact.summary}</p>
              {impact.downstream_titles.length > 0 && (
                <ul className="list-inside list-disc space-y-0.5 text-zinc-600 dark:text-zinc-400">
                  {impact.downstream_titles.map((title) => (
                    <li key={title}>{title}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
