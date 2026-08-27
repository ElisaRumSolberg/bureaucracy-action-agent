"use client";

import { useEffect, useRef } from "react";
import type { Task } from "@/lib/api";
import { t, tTaskLabel } from "@/lib/uiTranslations";
import TaskGuidancePanel from "./TaskGuidancePanel";

interface Props {
  tasks: Task[];
  language?: string;
  /** Scroll straight to (and auto-open the guidance for) this task — set
   * when the user arrived here via "Start this action" on the Next Best
   * Action card, so the recommendation actually leads somewhere. */
  focusTaskId?: string;
}

export default function GuidanceView({ tasks, language, focusTaskId }: Props) {
  const focusRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (focusTaskId && focusRef.current) {
      focusRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [focusTaskId]);

  if (tasks.length === 0) {
    return <p className="text-sm text-zinc-400">{t("Select a task to see how to complete it.", language)}</p>;
  }

  return (
    <div className="space-y-3">
      {tasks.map((task, index) => {
        const isFocused = task.id === focusTaskId;
        return (
          <div
            // Remount when focus moves onto/off of this task so a repeat
            // "Start this action" for a different task reliably re-opens
            // and auto-fetches guidance rather than being a no-op on an
            // already-mounted panel.
            key={`${task.id}-${isFocused}`}
            ref={isFocused ? focusRef : undefined}
            className={`rounded-2xl border bg-white p-5 dark:bg-zinc-900 ${
              isFocused
                ? "border-brand ring-1 ring-brand dark:border-indigo-500 dark:ring-indigo-500"
                : "border-zinc-200 dark:border-zinc-800"
            }`}
          >
            <p className="text-xs text-zinc-400">{tTaskLabel(index + 1, language)}</p>
            <h3 className="mt-0.5 break-words font-semibold text-zinc-900 dark:text-zinc-50">
              {task.title}
            </h3>
            <TaskGuidancePanel taskId={task.id} language={language} initialOpen={isFocused} />
          </div>
        );
      })}
    </div>
  );
}
