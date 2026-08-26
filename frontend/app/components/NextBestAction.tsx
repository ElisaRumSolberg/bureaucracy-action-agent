"use client";

import { useEffect, useRef, useState } from "react";
import { getNextBestAction, isSatisfied } from "@/lib/taskGraph";
import { renderReason } from "@/lib/reasonTranslations";
import { t, tTaskLabel, tUnlockedAfter } from "@/lib/uiTranslations";
import type { Task } from "@/lib/api";

interface Props {
  tasks: Task[];
  language?: string;
}

const CHANGE_NOTICE_MS = 4000;
const CELEBRATION_MS = 5000;

export default function NextBestAction({ tasks, language }: Props) {
  const next = getNextBestAction(tasks);
  const allDone = tasks.length > 0 && tasks.every((task) => task.status === "done");

  const prevTasksRef = useRef<Task[] | null>(null);
  const prevIdRef = useRef<string | null>(null);
  const prevAllDoneRef = useRef(false);
  const [changeNote, setChangeNote] = useState<string | null>(null);
  const [justCompleted, setJustCompleted] = useState(false);

  // Celebrate the moment the whole plan flips from "in progress" to "done"
  // — a one-time animation, not a permanent state, so reloading an
  // already-finished plan just shows the plain success card.
  useEffect(() => {
    if (allDone && !prevAllDoneRef.current) {
      setJustCompleted(true);
      const timeout = setTimeout(() => setJustCompleted(false), CELEBRATION_MS);
      prevAllDoneRef.current = true;
      return () => clearTimeout(timeout);
    }
    prevAllDoneRef.current = allDone;
  }, [allDone]);

  // Detect when the agent's own recommendation moves to a different task —
  // this is what makes the re-evaluation loop (task done -> dependency
  // satisfied -> next best action recomputed) visible instead of silent.
  useEffect(() => {
    const currentId = next?.task.id ?? null;
    const prevTasks = prevTasksRef.current;
    const prevId = prevIdRef.current;

    if (prevId !== null && currentId !== null && currentId !== prevId && prevTasks && next) {
      const unlockedByIndex = next.task.dependencies.find((depIndex) => {
        const prevDep = prevTasks[depIndex];
        const currDep = tasks[depIndex];
        return prevDep && currDep && !isSatisfied(prevDep) && isSatisfied(currDep);
      });
      const unlockedTitle =
        unlockedByIndex !== undefined ? tasks[unlockedByIndex]?.title : undefined;
      setChangeNote(
        unlockedTitle
          ? tUnlockedAfter(unlockedTitle, language)
          : t("Updated automatically based on your progress", language)
      );
      const timeout = setTimeout(() => setChangeNote(null), CHANGE_NOTICE_MS);
      prevIdRef.current = currentId;
      prevTasksRef.current = tasks;
      return () => clearTimeout(timeout);
    }

    prevIdRef.current = currentId;
    prevTasksRef.current = tasks;
  }, [tasks, next, language]);

  if (!next) {
    return (
      <div
        className={`relative overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50 p-5 transition-shadow dark:border-emerald-900 dark:bg-emerald-950 ${
          justCompleted
            ? "ring-2 ring-emerald-400 ring-offset-2 ring-offset-zinc-50 dark:ring-offset-black"
            : ""
        }`}
      >
        {allDone && (
          <span
            className={`mb-1 block text-3xl ${justCompleted ? "animate-bounce" : ""}`}
            aria-hidden="true"
          >
            🎉
          </span>
        )}
        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
          {allDone ? t("All tasks complete", language) : t("Nothing is unblocked yet", language)}
        </p>
        <p className="mt-1 text-sm text-emerald-600 dark:text-emerald-400">
          {allDone
            ? t("Every task in this action plan has been marked done.", language)
            : t("Every remaining task is waiting on a dependency.", language)}
        </p>
      </div>
    );
  }

  const reasonTexts = next.reasons.map((item) => renderReason(item, language)).filter(Boolean);

  return (
    <div
      className={`rounded-2xl border border-zinc-200 border-l-4 border-l-brand bg-brand-light p-5 transition-shadow dark:border-zinc-800 dark:border-l-indigo-500 dark:bg-indigo-950/30 ${
        changeNote ? "ring-2 ring-emerald-400 ring-offset-2 ring-offset-zinc-50 dark:ring-offset-black" : ""
      }`}
    >
      {changeNote && (
        <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500 dark:bg-emerald-400" />
          {changeNote}
        </p>
      )}
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-brand dark:text-indigo-400">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand dark:bg-indigo-400" />
        {next.isConditionalPick ? t("If this applies to you", language) : t("Recommended next action", language)}
      </p>
      <h3 className="mt-1 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        {tTaskLabel(next.index + 1, language)}: {next.task.title}
      </h3>
      {next.isConditionalPick && next.task.condition && (
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          {t("Condition:", language)} {next.task.condition}
        </p>
      )}
      <p className="mt-2 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {t("Why?", language)}
      </p>
      <ul className="mt-1 space-y-1 text-sm text-zinc-600 dark:text-zinc-300">
        {reasonTexts.map((text, idx) => (
          <li key={idx} className="flex gap-2">
            <span className="text-zinc-400 dark:text-zinc-500">•</span>
            <span>{text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
