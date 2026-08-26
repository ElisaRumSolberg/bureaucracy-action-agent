"use client";

import { useState } from "react";
import UploadScreen from "./components/UploadScreen";
import Logo from "./components/Logo";
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

type Stage = "upload" | "processing" | "results" | "history";

export default function Home() {
  const [stage, setStage] = useState<Stage>("upload");
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
          {stage !== "results" && (
            <button
              onClick={() => setStage("history")}
              className="ml-auto text-sm font-medium text-zinc-500 hover:text-brand dark:text-zinc-400 dark:hover:text-indigo-400"
            >
              History
            </button>
          )}
        </div>
      </header>

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
          onGoToHistory={() => setStage("history")}
          isReprocessing={isReprocessing}
          language={resultLanguage}
        />
      )}
    </div>
  );
}
