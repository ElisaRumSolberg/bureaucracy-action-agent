import type { Task } from "@/lib/api";
import { isBlocked, isDone } from "@/lib/taskGraph";

interface Props {
  tasks: Task[];
  highlightIndex?: number;
}

function computeLevels(tasks: Task[]): number[] {
  const levels = new Array(tasks.length).fill(-1);

  function levelOf(index: number, visiting: Set<number>): number {
    if (levels[index] !== -1) return levels[index];
    if (visiting.has(index)) return 0; // guard against a cyclic reference
    visiting.add(index);
    const deps = tasks[index].dependencies.filter((d) => d >= 0 && d < tasks.length);
    const level = deps.length === 0 ? 0 : Math.max(...deps.map((d) => levelOf(d, visiting))) + 1;
    levels[index] = level;
    return level;
  }

  tasks.forEach((_, index) => levelOf(index, new Set()));
  return levels;
}

export default function ActionFlow({ tasks, highlightIndex }: Props) {
  if (tasks.length < 2) return null;

  const levels = computeLevels(tasks);
  const maxLevel = Math.max(...levels);
  const columns = Array.from({ length: maxLevel + 1 }, (_, level) =>
    tasks
      .map((task, index) => ({ task, index }))
      .filter(({ index }) => levels[index] === level)
  );

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Action Flow</p>
      <div className="mt-4 flex items-start gap-2 overflow-x-auto pb-2">
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
                    <span className="shrink-0">
                      {done ? "✓" : blocked ? "🔒" : "○"}
                    </span>
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
    </div>
  );
}
