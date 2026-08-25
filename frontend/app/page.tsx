"use client";

import { useState } from "react";
import UploadScreen from "./components/UploadScreen";
import ProcessingScreen from "./components/ProcessingScreen";
import ResultsScreen from "./components/ResultsScreen";
import {
  ApiError,
  updateTaskStatus,
  uploadDocument,
  type Task,
  type UploadResult,
} from "@/lib/api";

type Stage = "upload" | "processing" | "results";

export default function Home() {
  const [stage, setStage] = useState<Stage>("upload");
  const [result, setResult] = useState<UploadResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleFileSelected(file: File, targetLanguage?: string) {
    setErrorMessage(null);
    setStage("processing");
    try {
      const uploadResult = await uploadDocument(file, targetLanguage);
      setResult(uploadResult);
      setStage("results");
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : "Something went wrong. Please try again."
      );
      setStage("upload");
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

  function reset() {
    setResult(null);
    setErrorMessage(null);
    setStage("upload");
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-black">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto flex max-w-4xl items-center px-6 py-4">
          <span className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Bureaucracy Action Agent
          </span>
        </div>
      </header>

      {stage === "upload" && (
        <UploadScreen onFileSelected={handleFileSelected} errorMessage={errorMessage} />
      )}
      {stage === "processing" && <ProcessingScreen />}
      {stage === "results" && result && (
        <ResultsScreen result={result} onReset={reset} onToggleTask={handleToggleTask} />
      )}
    </div>
  );
}
