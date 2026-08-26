import type { Task } from "@/lib/api";
import { isBlocked, isDone } from "@/lib/taskGraph";
import { t } from "@/lib/uiTranslations";

interface Props {
  tasks: Task[];
  language?: string;
}

export default function ProgressCard({ tasks, language }: Props) {
  const total = tasks.length;
  const doneCount = tasks.filter(isDone).length;
  const blockedCount = tasks.filter((task, i) => !isDone(task) && isBlocked(tasks, i)).length;
  const percent = total === 0 ? 0 : Math.round((doneCount / total) * 100);

  const circumference = 2 * Math.PI * 40;
  const offset = circumference * (1 - percent / 100);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        {t("Your Progress", language)}
      </p>
      <div className="mt-3 flex items-center gap-4">
        <svg viewBox="0 0 100 100" className="h-20 w-20 shrink-0 -rotate-90">
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            strokeWidth="10"
            className="stroke-zinc-100 dark:stroke-zinc-800"
          />
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="stroke-brand dark:stroke-indigo-500 transition-[stroke-dashoffset] duration-500"
          />
        </svg>
        <div>
          <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{percent}%</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {doneCount} / {total} {t("completed", language)}
          </p>
          {blockedCount > 0 && (
            <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
              {blockedCount} {t("blocked", language)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
