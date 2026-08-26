"use client";

import { useState } from "react";
import type { Task } from "@/lib/api";
import { computeCriticalPath, computeLevels, isBlocked, isDone } from "@/lib/taskGraph";

interface Props {
  tasks: Task[];
  highlightIndex?: number;
}

function NodeChip({
  task,
  isNext,
  wide,
}: {
  task: Task;
  isNext: boolean;
  wide: boolean;
}) {
  const done = isDone(task);
  return (
    <div
      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs ${wide ? "w-56" : "w-40"} ${
        done
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
          : isNext
            ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
            : "border-zinc-300 bg-white text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
      }`}
    >
      <span className="shrink-0">{done ? "✓" : "○"}</span>
      <span className={wide ? "" : "truncate"} title={task.title}>
        {task.title}
      </span>
    </div>
  );
}

function CriticalPathView({ tasks, highlightIndex }: Props) {
  const path = computeCriticalPath(tasks);
  return (
    <div className="flex flex-wrap items-center gap-2">
      {path.map((taskIndex, i) => (
        <div key={tasks[taskIndex].id} className="flex items-center gap-2">
          <NodeChip task={tasks[taskIndex]} isNext={taskIndex === highlightIndex} wide />
          {i < path.length - 1 && <span className="text-zinc-300 dark:text-zinc-700">→</span>}
        </div>
      ))}
    </div>
  );
}

function AllTasksView({ tasks, highlightIndex }: Props) {
  const levels = computeLevels(tasks);
  const maxLevel = Math.max(...levels);
  const columns = Array.from({ length: maxLevel + 1 }, (_, level) =>
    tasks.map((task, index) => ({ task, index })).filter(({ index }) => levels[index] === level)
  );

  return (
    <div className="flex items-start gap-2 overflow-x-auto pb-2">
      {columns.map((column, columnIndex) => (
        <div key={columnIndex} className="flex items-center gap-2">
          <div className="flex flex-col gap-2">
            {column.map(({ task, index }) => {
              const done = isDone(task);
              const blocked = !done && isBlocked(tasks, index);
              const isNext = index === highlightIndex;
              return (
                <div
                  key={task.id}
                  className={`flex w-40 items-center gap-2 rounded-xl border px-3 py-2 text-xs ${
                    done
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
                      : isNext
                        ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                        : blocked
                          ? "border-zinc-200 bg-zinc-100 text-zinc-400 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-500"
                          : "border-zinc-300 bg-white text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                  }`}
                >
                  <span className="shrink-0">{done ? "✓" : blocked ? "🔒" : "○"}</span>
                  <span className="truncate" title={task.title}>
                    {task.title}
                  </span>
                </div>
              );
            })}
          </div>
          {columnIndex < columns.length - 1 && (
            <span className="shrink-0 text-zinc-300 dark:text-zinc-700">→</span>
          )}
        </div>
      ))}
    </div>
  );
}

export default function ActionFlow({ tasks, highlightIndex }: Props) {
  const [view, setView] = useState<"critical" | "all">("critical");

  if (tasks.length < 2) return null;

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Action Flow</p>
        <div className="flex rounded-full border border-zinc-200 p-0.5 text-xs dark:border-zinc-700">
          {(["critical", "all"] as const).map((option) => (
            <button
              key={option}
              onClick={() => setView(option)}
              className={`rounded-full px-3 py-1 font-medium transition-colors ${
                view === option
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              {option === "critical" ? "Critical Path" : "All Tasks"}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-4">
        {view === "critical" ? (
          <CriticalPathView tasks={tasks} highlightIndex={highlightIndex} />
        ) : (
          <AllTasksView tasks={tasks} highlightIndex={highlightIndex} />
        )}
      </div>
    </div>
  );
}
