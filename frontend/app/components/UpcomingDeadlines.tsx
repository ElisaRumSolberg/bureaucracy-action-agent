import type { Task } from "@/lib/api";
import { isDone } from "@/lib/taskGraph";
import { t } from "@/lib/uiTranslations";
import { translateReason } from "@/lib/reasonTranslations";

interface Props {
  tasks: Task[];
  language?: string;
  limit?: number;
}

function daysLabel(deadline: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${deadline}T00:00:00`);
  const diffDays = Math.round((due.getTime() - today.getTime()) / 86_400_000);

  if (diffDays < 0) return "Overdue";
  if (diffDays === 0) return "Due today";
  if (diffDays === 1) return "Due in 1 day";
  return `Due in ${diffDays} days`;
}

export default function UpcomingDeadlines({ tasks, language, limit = 5 }: Props) {
  const upcoming = tasks
    .filter((task) => !isDone(task) && task.deadline)
    .sort((a, b) => (a.deadline! < b.deadline! ? -1 : a.deadline! > b.deadline! ? 1 : 0))
    .slice(0, limit);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        {t("Upcoming Deadlines", language)}
      </p>
      {upcoming.length === 0 ? (
        <p className="mt-2 text-sm text-zinc-400">{t("No upcoming deadlines.", language)}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {upcoming.map((task) => {
            const label = daysLabel(task.deadline!);
            const isUrgent = label === "Overdue" || label === "Due today" || label === "Due in 1 day";
            return (
              <li key={task.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate text-zinc-700 dark:text-zinc-300">{task.title}</span>
                <span
                  className={`shrink-0 text-xs font-medium ${
                    isUrgent
                      ? "text-red-600 dark:text-red-400"
                      : "text-zinc-500 dark:text-zinc-400"
                  }`}
                >
                  {translateReason(label, language)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
