"use client";

import { useState } from "react";
import { ApiError, getTaskGuidance, type TaskGuidance } from "@/lib/api";

interface Props {
  taskId: string;
}

export default function TaskGuidancePanel({ taskId }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [guidance, setGuidance] = useState<TaskGuidance | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleOpen() {
    setOpen((wasOpen) => !wasOpen);
    if (guidance || loading) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getTaskGuidance(taskId);
      setGuidance(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-3">
      <button
        onClick={handleOpen}
        className="w-full rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        {open ? "Hide guidance" : "How to complete this"}
      </button>

      {open && (
        <div className="mt-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs dark:border-zinc-800 dark:bg-zinc-800/40">
          {loading && (
            <p className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600 dark:border-zinc-600 dark:border-t-zinc-300" />
              Generating guidance…
            </p>
          )}

          {error && <p className="text-red-600 dark:text-red-400">{error}</p>}

          {guidance && (
            <div className="space-y-3">
              {guidance.document_requirements.length > 0 && (
                <div>
                  <p className="font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    From the document
                  </p>
                  <ul className="mt-1 list-inside list-disc space-y-0.5 text-zinc-700 dark:text-zinc-300">
                    {guidance.document_requirements.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {guidance.suggested_steps.length > 0 && (
                <div>
                  <p className="font-semibold uppercase tracking-wide text-sky-600 dark:text-sky-400">
                    AI suggestion — steps
                  </p>
                  <ol className="mt-1 list-inside list-decimal space-y-0.5 text-zinc-700 dark:text-zinc-300">
                    {guidance.suggested_steps.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ol>
                </div>
              )}

              {guidance.prerequisites.length > 0 && (
                <div>
                  <p className="font-semibold uppercase tracking-wide text-sky-600 dark:text-sky-400">
                    AI suggestion — before you start
                  </p>
                  <ul className="mt-1 list-inside list-disc space-y-0.5 text-zinc-700 dark:text-zinc-300">
                    {guidance.prerequisites.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {guidance.common_mistakes.length > 0 && (
                <div>
                  <p className="font-semibold uppercase tracking-wide text-sky-600 dark:text-sky-400">
                    AI suggestion — common mistakes
                  </p>
                  <ul className="mt-1 list-inside list-disc space-y-0.5 text-zinc-700 dark:text-zinc-300">
                    {guidance.common_mistakes.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
