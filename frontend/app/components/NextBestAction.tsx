import { getNextBestAction } from "@/lib/taskGraph";
import { renderReason } from "@/lib/reasonTranslations";
import type { Task } from "@/lib/api";

interface Props {
  tasks: Task[];
  language?: string;
}

export default function NextBestAction({ tasks, language }: Props) {
  const next = getNextBestAction(tasks);

  if (!next) {
    const allDone = tasks.length > 0 && tasks.every((t) => t.status === "done");
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900 dark:bg-emerald-950">
        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
          {allDone ? "All tasks complete" : "Nothing is unblocked yet"}
        </p>
        <p className="mt-1 text-sm text-emerald-600 dark:text-emerald-400">
          {allDone
            ? "Every task in this action plan has been marked done."
            : "Every remaining task is waiting on a dependency."}
        </p>
      </div>
    );
  }

  const reasonTexts = next.reasons.map((item) => renderReason(item, language)).filter(Boolean);

  return (
    <div className="rounded-2xl border border-zinc-900 bg-zinc-900 p-5 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
        {next.isConditionalPick ? "If this applies to you" : "Recommended next action"}
      </p>
      <h3 className="mt-1 text-xl font-semibold">
        Task {next.index + 1}: {next.task.title}
      </h3>
      {next.isConditionalPick && next.task.condition && (
        <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-600">
          Condition: {next.task.condition}
        </p>
      )}
      <p className="mt-2 text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
        Why?
      </p>
      <ul className="mt-1 space-y-1 text-sm text-zinc-300 dark:text-zinc-600">
        {reasonTexts.map((text, idx) => (
          <li key={idx} className="flex gap-2">
            <span className="text-zinc-500 dark:text-zinc-400">•</span>
            <span>{text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
