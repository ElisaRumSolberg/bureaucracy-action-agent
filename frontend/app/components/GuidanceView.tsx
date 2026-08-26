import type { Task } from "@/lib/api";
import { t, tTaskLabel } from "@/lib/uiTranslations";
import TaskGuidancePanel from "./TaskGuidancePanel";

interface Props {
  tasks: Task[];
  language?: string;
}

export default function GuidanceView({ tasks, language }: Props) {
  if (tasks.length === 0) {
    return <p className="text-sm text-zinc-400">{t("Select a task to see how to complete it.", language)}</p>;
  }

  return (
    <div className="space-y-3">
      {tasks.map((task, index) => (
        <div
          key={task.id}
          className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <p className="text-xs text-zinc-400">{tTaskLabel(index + 1, language)}</p>
          <h3 className="mt-0.5 font-semibold text-zinc-900 dark:text-zinc-50">{task.title}</h3>
          <TaskGuidancePanel taskId={task.id} language={language} />
        </div>
      ))}
    </div>
  );
}
