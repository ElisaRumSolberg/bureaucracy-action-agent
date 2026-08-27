"use client";

import { useState } from "react";
import UploadScreen from "./components/UploadScreen";
import WelcomeScreen from "./components/WelcomeScreen";
import Logo from "./components/Logo";
import AuthButton from "./components/AuthButton";
import ProcessingScreen from "./components/ProcessingScreen";
import Dashboard from "./components/Dashboard";
import HistoryScreen from "./components/HistoryScreen";
import {
  ApiError,
  getDocument,
  translateDocument,
  updateConditionStatus,
  updateTaskStatus,
  uploadDocument,
  type ConditionStatus,
  type Task,
  type UploadResult,
} from "@/lib/api";
import { t } from "@/lib/uiTranslations";

type Stage = "welcome" | "upload" | "processing" | "results" | "history";

export default function Home() {
  const [stage, setStage] = useState<Stage>("welcome");
  const [result, setResult] = useState<UploadResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isReprocessing, setIsReprocessing] = useState(false);
  const [resultLanguage, setResultLanguage] = useState<string | undefined>(undefined);

  async function handleFileSelected(file: File, targetLanguage?: string) {
    setErrorMessage(null);
    setStage("processing");
    try {
      const uploadResult = await uploadDocument(file, targetLanguage);
      setResult(uploadResult);
      setResultLanguage(targetLanguage);
      setStage("results");
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : "Something went wrong. Please try again."
      );
      setStage("upload");
    }
  }

  async function handleChangeLanguage(targetLanguage: string | undefined) {
    if (!result || isReprocessing) return;
    setIsReprocessing(true);
    try {
      const translated = await translateDocument(result.document_id, targetLanguage);
      setResult(translated);
      setResultLanguage(targetLanguage);
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : "Something went wrong. Please try again."
      );
    } finally {
      setIsReprocessing(false);
    }
  }

  async function handleToggleTask(task: Task) {
    const nextStatus = task.status === "done" ? "todo" : "done";
    setResult((current) =>
      current
        ? {
            ...current,
            tasks: current.tasks.map((t) =>
              t.id === task.id ? { ...t, status: nextStatus } : t
            ),
          }
        : current
    );
    try {
      await updateTaskStatus(task.id, nextStatus);
    } catch {
      // Revert on failure — the backend is the source of truth.
      setResult((current) =>
        current
          ? {
              ...current,
              tasks: current.tasks.map((t) =>
                t.id === task.id ? { ...t, status: task.status } : t
              ),
            }
          : current
      );
    }
  }

  async function handleSetConditionStatus(task: Task, conditionStatus: ConditionStatus) {
    const previous = task.condition_status;
    setResult((current) =>
      current
        ? {
            ...current,
            tasks: current.tasks.map((t) =>
              t.id === task.id ? { ...t, condition_status: conditionStatus } : t
            ),
          }
        : current
    );
    try {
      await updateConditionStatus(task.id, conditionStatus);
    } catch {
      setResult((current) =>
        current
          ? {
              ...current,
              tasks: current.tasks.map((t) =>
                t.id === task.id ? { ...t, condition_status: previous } : t
              ),
            }
          : current
      );
    }
  }

  function reset() {
    setResult(null);
    setErrorMessage(null);
    setStage("upload");
  }

  async function handleOpenFromHistory(documentId: string) {
    setErrorMessage(null);
    setStage("processing");
    try {
      const doc = await getDocument(documentId);
      setResult(doc);
      setResultLanguage(doc.content_language ?? undefined);
      setStage("results");
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : "Something went wrong. Please try again."
      );
      setStage("history");
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-black">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-6 py-4">
          <Logo className="h-7 w-7 shrink-0" />
          <span className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Bureaucracy Action Agent
          </span>
          {stage !== "welcome" && (
            <div className="ml-auto flex items-center gap-1">
              {result && (
                <button
                  onClick={() => setStage("results")}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                    stage === "results"
                      ? "bg-brand-light text-brand dark:bg-indigo-950/40 dark:text-indigo-400"
                      : "text-zinc-500 hover:text-brand dark:text-zinc-400 dark:hover:text-indigo-400"
                  }`}
                >
                  {t("Dashboard", resultLanguage)}
                </button>
              )}
              <button
                onClick={() => setStage("history")}
                className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                  stage === "history"
                    ? "bg-brand-light text-brand dark:bg-indigo-950/40 dark:text-indigo-400"
                    : "text-zinc-500 hover:text-brand dark:text-zinc-400 dark:hover:text-indigo-400"
                }`}
              >
                {t("Documents", resultLanguage)}
              </button>
              <AuthButton language={resultLanguage} />
            </div>
          )}
        </div>
      </header>

      {stage === "welcome" && <WelcomeScreen onContinue={() => setStage("upload")} />}
      {stage === "upload" && (
        <UploadScreen onFileSelected={handleFileSelected} errorMessage={errorMessage} />
      )}
      {stage === "processing" && <ProcessingScreen />}
      {stage === "history" && (
        <HistoryScreen onOpen={handleOpenFromHistory} onBack={() => setStage("upload")} />
      )}
      {stage === "results" && result && (
        <Dashboard
          result={result}
          onReset={reset}
          onToggleTask={handleToggleTask}
          onSetConditionStatus={handleSetConditionStatus}
          onChangeLanguage={handleChangeLanguage}
          isReprocessing={isReprocessing}
          language={resultLanguage}
        />
      )}
    </div>
  );
}
