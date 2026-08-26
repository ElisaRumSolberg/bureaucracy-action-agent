import { getNextBestAction } from "@/lib/taskGraph";
import { localizedJoin, translateBlocksCount, translateReason } from "@/lib/reasonTranslations";
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

  const reasonParts = [translateReason(next.priorityReason, language)];
  if (next.blocksCount > 0 && !next.mentionsBlockingAlready) {
    reasonParts.push(translateBlocksCount(next.blocksCount, language));
  }
  const reason = localizedJoin(reasonParts, language);

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
      <p className="mt-2 text-sm text-zinc-300 dark:text-zinc-600">
        <span className="font-medium text-zinc-100 dark:text-zinc-800">Why?</span>{" "}
        {reason}.
      </p>
    </div>
  );
}
