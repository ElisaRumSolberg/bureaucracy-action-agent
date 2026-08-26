"use client";

import { useState } from "react";
import type { ConditionStatus, Task, UploadResult } from "@/lib/api";
import TaskCard from "./TaskCard";
import LanguageSelect from "./LanguageSelect";
import NextBestAction from "./NextBestAction";
import ActionFlow from "./ActionFlow";
import AgentActivityFeed from "./AgentActivityFeed";
import ProgressCard from "./ProgressCard";
import UpcomingDeadlines from "./UpcomingDeadlines";
import GuidanceView from "./GuidanceView";
import { getNextBestAction } from "@/lib/taskGraph";
import { t, tDetectedCount, tProgressDone } from "@/lib/uiTranslations";

interface Props {
  result: UploadResult;
  onReset: () => void;
  onToggleTask: (task: Task) => void;
  onSetConditionStatus: (task: Task, conditionStatus: ConditionStatus) => void;
  onChangeLanguage: (language: string | undefined) => void;
  onGoToHistory: () => void;
  isReprocessing: boolean;
  language?: string;
}

type View = "dashboard" | "actionflow" | "tasks" | "guidance" | "activitylog";

const NAV_ITEMS: { view: View; label: string }[] = [
  { view: "dashboard", label: "Dashboard" },
  { view: "actionflow", label: "Action Flow" },
  { view: "tasks", label: "Tasks" },
  { view: "guidance", label: "Guidance" },
  { view: "activitylog", label: "Activity Log" },
];

export default function Dashboard({
  result,
  onReset,
  onToggleTask,
  onSetConditionStatus,
  onChangeLanguage,
  onGoToHistory,
  isReprocessing,
  language,
}: Props) {
  const [view, setView] = useState<View>("dashboard");
  const [focusTaskId, setFocusTaskId] = useState<string | undefined>(undefined);

  const doneCount = result.tasks.filter((task) => task.status === "done").length;
  const deadlineCount = result.tasks.filter((task) => task.deadline).length;
  const dependencyCount = result.tasks.filter((task) => task.dependencies.length > 0).length;
  const nextBestAction = getNextBestAction(result.tasks);
  const refreshToken = result.tasks
    .map((task) => `${task.id}:${task.status}:${task.condition_status}`)
    .join(",");

  return (
    <div
      className={`mx-auto w-full max-w-6xl flex-1 px-6 py-10 transition-opacity ${isReprocessing ? "pointer-events-none opacity-50" : ""}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-zinc-400">{t("Action plan", language)}</p>
          <h1 className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            {t("Document Summary", language)}
          </h1>
          <p className="mt-2 max-w-2xl text-zinc-600 dark:text-zinc-400">{result.summary}</p>

          <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <div>
              <dt className="text-xs uppercase tracking-wide text-zinc-400">{t("Actions", language)}</dt>
              <dd className="font-medium text-zinc-800 dark:text-zinc-200">
                {tDetectedCount(result.tasks.length, language)}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-zinc-400">{t("Deadlines", language)}</dt>
              <dd className="font-medium text-zinc-800 dark:text-zinc-200">{deadlineCount}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-zinc-400">
                {t("Dependencies", language)}
              </dt>
              <dd className="font-medium text-zinc-800 dark:text-zinc-200">{dependencyCount}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-zinc-400">
                {t("Missing details", language)}
              </dt>
              <dd className="font-medium text-zinc-800 dark:text-zinc-200">
                {result.missing_information.length}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-zinc-400">{t("Progress", language)}</dt>
              <dd className="font-medium text-zinc-800 dark:text-zinc-200">
                {tProgressDone(doneCount, result.tasks.length, language)}
              </dd>
            </div>
          </dl>

          <div className="mt-3">
            <LanguageSelect
              label={isReprocessing ? t("Translating…", language) : t("Explain in", language)}
              onChange={onChangeLanguage}
              compact
            />
          </div>
        </div>
        <button
          onClick={onReset}
          className="shrink-0 rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          {t("Upload another", language)}
        </button>
      </div>

      <div className="mt-8 flex flex-col gap-6 sm:flex-row">
        <nav className="flex shrink-0 gap-1 overflow-x-auto sm:w-44 sm:flex-col sm:overflow-visible">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.view}
              onClick={() => setView(item.view)}
              className={`shrink-0 rounded-full px-3 py-2 text-left text-sm font-medium sm:rounded-lg ${
                view === item.view
                  ? "bg-brand text-white dark:bg-indigo-500"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              }`}
            >
              {t(item.label, language)}
            </button>
          ))}
          <button
            onClick={onGoToHistory}
            className="shrink-0 rounded-full px-3 py-2 text-left text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 sm:rounded-lg"
          >
            {t("Documents", language)}
          </button>
        </nav>

        <div className="min-w-0 flex-1 space-y-4">
          {view === "dashboard" && (
            <>
              <NextBestAction
                tasks={result.tasks}
                language={language}
                onStartAction={(taskId) => {
                  setFocusTaskId(taskId);
                  setView("guidance");
                }}
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <ProgressCard tasks={result.tasks} language={language} />
                <UpcomingDeadlines tasks={result.tasks} language={language} limit={4} />
              </div>

              <AgentActivityFeed
                documentId={result.document_id}
                refreshToken={refreshToken}
                language={language}
                alwaysOpen
                limit={4}
                onViewAll={() => setView("activitylog")}
              />

              {result.warnings.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
                  <p className="font-medium">{t("Warnings", language)}</p>
                  <ul className="mt-1 list-inside list-disc space-y-1">
                    {result.warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              {result.missing_information.length > 0 && (
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
                  <p className="font-medium">{t("Missing information", language)}</p>
                  <ul className="mt-1 list-inside list-disc space-y-1">
                    {result.missing_information.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {result.consequences.length > 0 && (
                <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">
                    {t("Possible consequences", language)}
                  </p>
                  <ul className="mt-1 list-inside list-disc space-y-1">
                    {result.consequences.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          {view === "actionflow" && (
            <ActionFlow tasks={result.tasks} highlightIndex={nextBestAction?.index} language={language} />
          )}

          {view === "tasks" && (
            <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
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
          )}

          {view === "guidance" && (
            <GuidanceView tasks={result.tasks} language={language} focusTaskId={focusTaskId} />
          )}

          {view === "activitylog" && (
            <AgentActivityFeed
              documentId={result.document_id}
              refreshToken={refreshToken}
              language={language}
              alwaysOpen
            />
          )}
        </div>
      </div>

      <p className="mx-auto mt-10 max-w-lg text-center text-xs leading-5 text-zinc-500">
        {t(
          "This tool helps you organize information found in official documents. It does not provide legal advice — verify critical requirements with the issuing institution.",
          language
        )}
      </p>
    </div>
  );
}
