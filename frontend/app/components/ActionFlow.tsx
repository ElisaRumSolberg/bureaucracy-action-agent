"use client";

import { useState } from "react";
import type { Task } from "@/lib/api";
import { computeCriticalPath, computeLevels, isBlocked, isDone } from "@/lib/taskGraph";
import { t } from "@/lib/uiTranslations";

interface Props {
  tasks: Task[];
  highlightIndex?: number;
  language?: string;
}

function NodeChip({ task, isNext, wide }: { task: Task; isNext: boolean; wide: boolean }) {
  const done = isDone(task);
  return (
    <div
      className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2 text-xs ${wide ? "w-56" : "w-40"} ${
        done
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
          : isNext
            ? "border-brand bg-brand text-white shadow-md shadow-brand/30 dark:border-indigo-500 dark:bg-indigo-500"
            : "border-zinc-300 bg-white text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
      }`}
    >
      <span className="shrink-0">{done ? "✓" : "○"}</span>
      <span className="min-w-0 flex-1 truncate" title={task.title}>
        {task.title}
      </span>
    </div>
  );
}

function CriticalPathView({ tasks, highlightIndex, language }: Props) {
  const path = computeCriticalPath(tasks);
  return (
    <div>
      <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">
        {t("The longest chain of dependent tasks — delaying any one of these delays the whole plan.", language)}
      </p>
      <div className="flex flex-col">
        {path.map((taskIndex, i) => (
          <div key={tasks[taskIndex].id} className="flex gap-3">
            <div className="flex shrink-0 flex-col items-center">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                  taskIndex === highlightIndex
                    ? "bg-brand text-white dark:bg-indigo-500"
                    : isDone(tasks[taskIndex])
                      ? "bg-emerald-200 text-emerald-800 dark:bg-emerald-800 dark:text-emerald-200"
                      : "bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"
                }`}
              >
                {i + 1}
              </span>
              {i < path.length - 1 && (
                <span className="my-1 w-px flex-1 bg-zinc-200 dark:bg-zinc-800" style={{ minHeight: "1.5rem" }} />
              )}
            </div>
            <div className="min-w-0 flex-1 pb-3">
              <NodeChip task={tasks[taskIndex]} isNext={taskIndex === highlightIndex} wide />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AllTasksView({ tasks, highlightIndex, language }: Props) {
  const levels = computeLevels(tasks);
  const maxLevel = Math.max(...levels);
  const rows = Array.from({ length: maxLevel + 1 }, (_, level) =>
    tasks.map((task, index) => ({ task, index })).filter(({ index }) => levels[index] === level)
  );

  return (
    <div>
      <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">
        {t("Every task, grouped by how many steps deep it is in the dependency chain.", language)}
      </p>
      <div className="flex flex-col">
        {rows.map((row, rowIndex) => (
          <div key={rowIndex} className="flex gap-3">
            <div className="flex shrink-0 flex-col items-center">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-[10px] font-bold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                {rowIndex + 1}
              </span>
              {rowIndex < rows.length - 1 && (
                <span className="my-1 w-px flex-1 bg-zinc-200 dark:bg-zinc-800" style={{ minHeight: "1.5rem" }} />
              )}
            </div>
            <div className="flex min-w-0 flex-1 flex-wrap gap-2 pb-3">
              {row.map(({ task, index }) => {
                const done = isDone(task);
                const blocked = !done && isBlocked(tasks, index);
                const isNext = index === highlightIndex;
                return (
                  <div
                    key={task.id}
                    className={`flex w-full items-center gap-2 rounded-xl border-2 px-3 py-2 text-xs sm:w-56 ${
                      done
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
                        : isNext
                          ? "border-brand bg-brand text-white shadow-md shadow-brand/30 dark:border-indigo-500 dark:bg-indigo-500"
                          : blocked
                            ? "border-dashed border-amber-300 bg-amber-50/60 text-amber-700 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-400"
                            : "border-zinc-300 bg-white text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                    }`}
                  >
                    <span className="shrink-0">{done ? "✓" : blocked ? "🔒" : "○"}</span>
                    <span className="min-w-0 flex-1 truncate" title={task.title}>
                      {task.title}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ActionFlow({ tasks, highlightIndex, language }: Props) {
  const [view, setView] = useState<"critical" | "all">("critical");

  if (tasks.length < 2) return null;

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{t("Action Flow", language)}</p>
        <div className="flex rounded-full border border-zinc-200 p-0.5 text-xs dark:border-zinc-700">
          {(["critical", "all"] as const).map((option) => (
            <button
              key={option}
              onClick={() => setView(option)}
              className={`rounded-full px-3 py-1 font-medium transition-colors ${
                view === option
                  ? "bg-brand text-white dark:bg-indigo-500"
                  : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              {option === "critical" ? t("Critical Path", language) : t("All Tasks", language)}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-4">
        {view === "critical" ? (
          <CriticalPathView tasks={tasks} highlightIndex={highlightIndex} language={language} />
        ) : (
          <AllTasksView tasks={tasks} highlightIndex={highlightIndex} language={language} />
        )}
      </div>
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-zinc-100 pt-3 text-[11px] text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full border-2 border-brand bg-brand dark:border-indigo-500 dark:bg-indigo-500" />
          {t("Next action", language)}
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full border-2 border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950" />
          {t("Done", language)}
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full border-2 border-dashed border-amber-300 dark:border-amber-800" />
          {t("Blocked", language)}
        </span>
      </div>
    </div>
  );
}
