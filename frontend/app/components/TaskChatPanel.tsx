"use client";

import { useState } from "react";
import { ApiError, askTaskQuestion } from "@/lib/api";

interface Props {
  taskId: string;
}

interface QAPair {
  question: string;
  answer: string;
}

const QUICK_QUESTIONS = [
  "Why is this important?",
  "Why is it blocked?",
  "Where is this in the document?",
  "How do I start?",
];

export default function TaskChatPanel({ taskId }: Props) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<QAPair[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function ask(question: string) {
    const trimmed = question.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    setError(null);
    setInput("");
    try {
      const answer = await askTaskQuestion(taskId, trimmed);
      setHistory((prev) => [...prev, { question: trimmed, answer }]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen((wasOpen) => !wasOpen)}
        className="w-full rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        {open ? "Hide chat" : "Ask about this task"}
      </button>

      {open && (
        <div className="mt-2 space-y-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs dark:border-zinc-800 dark:bg-zinc-800/40">
          {history.length === 0 && !loading && (
            <div className="flex flex-wrap gap-1.5">
              {QUICK_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => ask(q)}
                  className="rounded-full border border-sky-200 bg-white px-2.5 py-1 text-[11px] font-medium text-sky-700 hover:bg-sky-50 dark:border-sky-900 dark:bg-zinc-900 dark:text-sky-400 dark:hover:bg-sky-950"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {history.length > 0 && (
            <div className="space-y-3">
              {history.map((pair, idx) => (
                <div key={idx} className="space-y-1">
                  <p className="font-semibold text-zinc-700 dark:text-zinc-300">
                    {pair.question}
                  </p>
                  <p className="text-zinc-600 dark:text-zinc-400">{pair.answer}</p>
                </div>
              ))}
            </div>
          )}

          {loading && (
            <p className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600 dark:border-zinc-600 dark:border-t-zinc-300" />
              Thinking…
            </p>
          )}

          {error && <p className="text-red-600 dark:text-red-400">{error}</p>}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              ask(input);
            }}
            className="flex gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question about this task…"
              disabled={loading}
              className="flex-1 rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-800 outline-none focus:border-sky-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="rounded-md bg-sky-600 px-2.5 py-1 text-xs font-medium text-white disabled:opacity-40"
            >
              Ask
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
