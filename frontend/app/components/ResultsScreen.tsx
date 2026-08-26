import type { ConditionStatus, Task, UploadResult } from "@/lib/api";
import TaskCard from "./TaskCard";
import LanguageSelect from "./LanguageSelect";
import NextBestAction from "./NextBestAction";
import ActionFlow from "./ActionFlow";
import AgentActivityFeed from "./AgentActivityFeed";
import { getNextBestAction } from "@/lib/taskGraph";

interface Props {
  result: UploadResult;
  onReset: () => void;
  onToggleTask: (task: Task) => void;
  onSetConditionStatus: (task: Task, conditionStatus: ConditionStatus) => void;
  onChangeLanguage: (language: string | undefined) => void;
  isReprocessing: boolean;
  language?: string;
}

export default function ResultsScreen({
  result,
  onReset,
  onToggleTask,
  onSetConditionStatus,
  onChangeLanguage,
  isReprocessing,
  language,
}: Props) {
  const doneCount = result.tasks.filter((t) => t.status === "done").length;
  const deadlineCount = result.tasks.filter((t) => t.deadline).length;
  const dependencyCount = result.tasks.filter((t) => t.dependencies.length > 0).length;
  const nextBestAction = getNextBestAction(result.tasks);

  return (
    <div
      className={`mx-auto w-full max-w-4xl flex-1 px-6 py-16 transition-opacity ${isReprocessing ? "pointer-events-none opacity-50" : ""}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-zinc-400">Action plan</p>
          <h1 className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            Document Summary
          </h1>
          <p className="mt-2 max-w-2xl text-zinc-600 dark:text-zinc-400">
            {result.summary}
          </p>

          <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <div>
              <dt className="text-xs uppercase tracking-wide text-zinc-400">Actions</dt>
              <dd className="font-medium text-zinc-800 dark:text-zinc-200">
                {result.tasks.length} detected
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-zinc-400">Deadlines</dt>
              <dd className="font-medium text-zinc-800 dark:text-zinc-200">
                {deadlineCount}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-zinc-400">
                Dependencies
              </dt>
              <dd className="font-medium text-zinc-800 dark:text-zinc-200">
                {dependencyCount}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-zinc-400">
                Missing details
              </dt>
              <dd className="font-medium text-zinc-800 dark:text-zinc-200">
                {result.missing_information.length}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-zinc-400">Progress</dt>
              <dd className="font-medium text-zinc-800 dark:text-zinc-200">
                {doneCount} of {result.tasks.length} done
              </dd>
            </div>
          </dl>

          <div className="mt-3">
            <LanguageSelect
              label={isReprocessing ? "Translating…" : "Explain in"}
              onChange={onChangeLanguage}
              compact
            />
          </div>
        </div>
        <button
          onClick={onReset}
          className="shrink-0 rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          Upload another
        </button>
      </div>

      {result.tasks.length > 0 && (
        <div className="mt-6 space-y-3">
          <NextBestAction tasks={result.tasks} language={language} />
          <AgentActivityFeed
            documentId={result.document_id}
            refreshToken={result.tasks
              .map((t) => `${t.id}:${t.status}:${t.condition_status}`)
              .join(",")}
          />
        </div>
      )}

      {result.warnings.length > 0 && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
          <p className="font-medium">Warnings</p>
          <ul className="mt-1 list-inside list-disc space-y-1">
            {result.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {result.missing_information.length > 0 && (
        <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
          <p className="font-medium">Missing information</p>
          <ul className="mt-1 list-inside list-disc space-y-1">
            {result.missing_information.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {result.consequences.length > 0 && (
        <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
          <p className="font-medium text-zinc-900 dark:text-zinc-100">
            Possible consequences
          </p>
          <ul className="mt-1 list-inside list-disc space-y-1">
            {result.consequences.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6">
        <ActionFlow tasks={result.tasks} highlightIndex={nextBestAction?.index} />
      </div>

      <div className="mt-6 grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
        {result.tasks.map((task, index) => (
          <TaskCard
            key={task.id}
            task={task}
            index={index}
            allTasks={result.tasks}
            onToggleDone={onToggleTask}
            onSetConditionStatus={onSetConditionStatus}
            language={language}
          />
        ))}
      </div>

      <p className="mx-auto mt-10 max-w-lg text-center text-xs leading-5 text-zinc-500">
        This tool helps you organize information found in official documents.
        It does not provide legal advice — verify critical requirements with
        the issuing institution.
      </p>
    </div>
  );
}
