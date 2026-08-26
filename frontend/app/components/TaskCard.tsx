import type { ConditionStatus, Task } from "@/lib/api";
import { isBlocked, isConditionNotApplicable } from "@/lib/taskGraph";
import { translateReason } from "@/lib/reasonTranslations";
import { localeFor, t, tTaskLabel, tTasksCount } from "@/lib/uiTranslations";
import TaskGuidancePanel from "./TaskGuidancePanel";
import TaskChatPanel from "./TaskChatPanel";
import TaskDelayImpactPanel from "./TaskDelayImpactPanel";

const PRIORITY_STYLES: Record<Task["priority"], string> = {
  high: "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-950 dark:text-red-300 dark:ring-red-500/30",
  medium:
    "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-500/30",
  low: "bg-zinc-100 text-zinc-600 ring-zinc-500/20 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-500/30",
};

const RISK_STYLES: Record<Task["priority"], string> = {
  high: "text-red-600 dark:text-red-400",
  medium: "text-amber-600 dark:text-amber-400",
  low: "text-zinc-500 dark:text-zinc-400",
};

function formatDeadline(deadline: string | null, inherited: boolean, language: string | undefined): string {
  if (!deadline) return t("No deadline stated", language);
  const date = new Date(`${deadline}T00:00:00`);
  const formatted = date.toLocaleDateString(localeFor(language), {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return inherited ? `${formatted} ${t("(from final deadline)", language)}` : formatted;
}

function confidenceLabel(
  confidence: number,
  language: string | undefined
): { label: string; needsVerification: boolean } {
  const pct = Math.round(confidence * 100);
  if (pct >= 90) return { label: t("High confidence", language), needsVerification: false };
  if (pct >= 70) return { label: t("Medium confidence", language), needsVerification: false };
  return { label: t("Needs verification", language), needsVerification: true };
}

interface Props {
  task: Task;
  index: number;
  allTasks: Task[];
  onToggleDone: (task: Task) => void;
  onSetConditionStatus: (task: Task, conditionStatus: ConditionStatus) => void;
  language?: string;
}

export default function TaskCard({
  task,
  index,
  allTasks,
  onToggleDone,
  onSetConditionStatus,
  language,
}: Props) {
  const dependencyTitles = task.dependencies.map(
    (depIndex) => allTasks[depIndex]?.title ?? `Task ${depIndex + 1}`
  );
  const isDone = task.status === "done";
  const notApplicable = isConditionNotApplicable(task);
  const blocked = !isDone && !notApplicable && isBlocked(allTasks, index);
  const confidence = confidenceLabel(task.confidence, language);
  const dimmed = isDone || notApplicable;

  return (
    <div
      className={`rounded-2xl border p-5 shadow-sm transition-opacity ${
        dimmed
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
          <span className="flex flex-col gap-1">
            <span
              className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${PRIORITY_STYLES[task.priority]}`}
            >
              {t(task.priority.toUpperCase(), language)} {t("PRIORITY", language)}
            </span>
            {task.priority_reason && (
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {translateReason(task.priority_reason, language)}
              </span>
            )}
          </span>
        </label>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="text-xs text-zinc-400">{tTaskLabel(index + 1, language)}</span>
          {blocked && (
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
              🔒 {t("Blocked", language)}
            </span>
          )}
        </div>
      </div>

      <h3
        className={`mt-3 text-lg font-semibold text-zinc-900 dark:text-zinc-50 ${isDone ? "line-through" : ""}`}
      >
        {task.title}
      </h3>
      {task.is_conditional && (
        <div className="mt-1.5 rounded-lg border border-sky-100 bg-sky-50/60 p-2.5 dark:border-sky-900/50 dark:bg-sky-950/30">
          <p className="text-xs font-medium text-sky-700 dark:text-sky-400">
            {t("Conditional", language)}{task.condition ? ` — ${task.condition}` : ""}
          </p>

          {task.condition_status === "unknown" && (
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <span className="text-xs text-sky-700/80 dark:text-sky-400/80">
                {t("Does this apply to you?", language)}
              </span>
              <div className="flex gap-1.5">
                <button
                  onClick={() => onSetConditionStatus(task, "applies")}
                  className="rounded-full border border-sky-300 bg-white px-2 py-0.5 text-[11px] font-medium text-sky-700 hover:bg-sky-100 dark:border-sky-800 dark:bg-zinc-900 dark:text-sky-400 dark:hover:bg-sky-950"
                >
                  {t("Yes", language)}
                </button>
                <button
                  onClick={() => onSetConditionStatus(task, "not_applicable")}
                  className="rounded-full border border-zinc-300 bg-white px-2 py-0.5 text-[11px] font-medium text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
                >
                  {t("No", language)}
                </button>
                <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                  {t("(leave unanswered if not sure)", language)}
                </span>
              </div>
            </div>
          )}

          {task.condition_status === "applies" && (
            <div className="mt-1.5 flex items-center gap-2">
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                {t("Applies to you", language)}
              </span>
              <button
                onClick={() => onSetConditionStatus(task, "unknown")}
                className="text-[11px] text-zinc-400 underline hover:text-zinc-600 dark:hover:text-zinc-300"
              >
                {t("Change", language)}
              </button>
            </div>
          )}

          {task.condition_status === "not_applicable" && (
            <div className="mt-1.5 flex items-center gap-2">
              <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-[11px] font-medium text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
                {t("Doesn't apply — excluded from your plan", language)}
              </span>
              <button
                onClick={() => onSetConditionStatus(task, "unknown")}
                className="text-[11px] text-zinc-400 underline hover:text-zinc-600 dark:hover:text-zinc-300"
              >
                {t("Change", language)}
              </button>
            </div>
          )}
        </div>
      )}
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        {task.description}
      </p>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <div>
          <dt className="text-xs uppercase tracking-wide text-zinc-400">
            {t("Deadline", language)}
          </dt>
          <dd className="mt-0.5 font-medium text-zinc-800 dark:text-zinc-200">
            {formatDeadline(task.deadline, task.deadline_inherited, language)}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-zinc-400">{t("Risk", language)}</dt>
          <dd className={`mt-0.5 font-medium ${RISK_STYLES[task.risk_level]}`}>
            {t(task.risk_level.toUpperCase(), language)}
            {task.risk_reason && (
              <span className="block text-xs font-normal text-zinc-500 dark:text-zinc-400">
                {translateReason(task.risk_reason, language)}
              </span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-zinc-400">
            {t("Depends on", language)}
          </dt>
          <dd className="mt-0.5 font-medium text-zinc-800 dark:text-zinc-200">
            {dependencyTitles.length === 0 && t("Nothing", language)}
            {dependencyTitles.length > 0 && dependencyTitles.length <= 2 && (
              dependencyTitles.join(", ")
            )}
            {dependencyTitles.length > 2 && (
              <details>
                <summary className="cursor-pointer select-none">
                  {tTasksCount(dependencyTitles.length, language)}
                </summary>
                <ul className="mt-1 list-inside list-disc font-normal text-zinc-600 dark:text-zinc-400">
                  {dependencyTitles.map((title) => (
                    <li key={title}>{title}</li>
                  ))}
                </ul>
              </details>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-zinc-400">
            {t("Required documents", language)}
          </dt>
          <dd className="mt-0.5 font-medium text-zinc-800 dark:text-zinc-200">
            {task.required_documents.length > 0
              ? task.required_documents.join(", ")
              : t("None stated", language)}
          </dd>
        </div>
      </dl>

      <div className="mt-4 border-t border-zinc-100 pt-3 dark:border-zinc-800">
        <div className="flex items-center gap-2 text-xs">
          {confidence.needsVerification && <span>⚠</span>}
          <span
            className={
              confidence.needsVerification
                ? "font-medium text-amber-600 dark:text-amber-400"
                : "text-zinc-400"
            }
          >
            {confidence.label} ({Math.round(task.confidence * 100)}%)
          </span>
        </div>
        <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
          <div
            className={`h-full rounded-full ${confidence.needsVerification ? "bg-amber-500" : "bg-emerald-500"}`}
            style={{ width: `${Math.round(task.confidence * 100)}%` }}
          />
        </div>

        {task.source_excerpt && (
          <details className="group mt-3">
            <summary className="cursor-pointer select-none text-xs font-medium text-zinc-500 dark:text-zinc-400">
              {t("Source evidence", language)}
            </summary>
            <p className="mt-2 rounded-lg bg-zinc-50 p-3 text-xs italic leading-5 text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-400">
              &ldquo;{task.source_excerpt}&rdquo;
            </p>
          </details>
        )}

        <TaskGuidancePanel taskId={task.id} language={language} />
        <TaskChatPanel taskId={task.id} language={language} />
        <TaskDelayImpactPanel taskId={task.id} language={language} />
      </div>
    </div>
  );
}
