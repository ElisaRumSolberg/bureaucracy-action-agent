import type { Task } from "@/lib/api";

const PRIORITY_STYLES: Record<Task["priority"], string> = {
  high: "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-950 dark:text-red-300 dark:ring-red-500/30",
  medium:
    "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-500/30",
  low: "bg-zinc-100 text-zinc-600 ring-zinc-500/20 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-500/30",
};

function formatDeadline(deadline: string | null): string {
  if (!deadline) return "No deadline stated";
  const date = new Date(`${deadline}T00:00:00`);
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

interface Props {
  task: Task;
  index: number;
  allTasks: Task[];
  onToggleDone: (task: Task) => void;
}

export default function TaskCard({ task, index, allTasks, onToggleDone }: Props) {
  const dependencyTitles = task.dependencies.map(
    (depIndex) => allTasks[depIndex]?.title ?? `Task ${depIndex + 1}`
  );
  const isDone = task.status === "done";

  return (
    <div
      className={`rounded-2xl border p-5 shadow-sm transition-opacity ${
        isDone
          ? "border-zinc-200 bg-zinc-50 opacity-60 dark:border-zinc-800 dark:bg-zinc-900/50"
          : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <label className="flex cursor-pointer items-start gap-2">
          <input
            type="checkbox"
            checked={isDone}
            onChange={() => onToggleDone(task)}
            className="mt-1 h-4 w-4 shrink-0 rounded border-zinc-300 dark:border-zinc-600"
          />
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${PRIORITY_STYLES[task.priority]}`}
          >
            {task.priority.toUpperCase()} PRIORITY
          </span>
        </label>
        <span className="text-xs text-zinc-400">Task {index + 1}</span>
      </div>

      <h3
        className={`mt-3 text-lg font-semibold text-zinc-900 dark:text-zinc-50 ${isDone ? "line-through" : ""}`}
      >
        {task.title}
      </h3>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        {task.description}
      </p>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <div>
          <dt className="text-xs uppercase tracking-wide text-zinc-400">
            Deadline
          </dt>
          <dd className="mt-0.5 font-medium text-zinc-800 dark:text-zinc-200">
            {formatDeadline(task.deadline)}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-zinc-400">
            Depends on
          </dt>
          <dd className="mt-0.5 font-medium text-zinc-800 dark:text-zinc-200">
            {dependencyTitles.length > 0 ? dependencyTitles.join(", ") : "Nothing"}
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="text-xs uppercase tracking-wide text-zinc-400">
            Required documents
          </dt>
          <dd className="mt-0.5 font-medium text-zinc-800 dark:text-zinc-200">
            {task.required_documents.length > 0
              ? task.required_documents.join(", ")
              : "None stated"}
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-3 dark:border-zinc-800">
        <span className="text-xs text-zinc-400">
          Confidence {Math.round(task.confidence * 100)}%
        </span>
        <details className="text-xs text-zinc-500">
          <summary className="cursor-pointer select-none">Source</summary>
          <p className="mt-1 max-w-xs text-right italic text-zinc-500">
            &ldquo;{task.source_excerpt}&rdquo;
          </p>
        </details>
      </div>
    </div>
  );
}
