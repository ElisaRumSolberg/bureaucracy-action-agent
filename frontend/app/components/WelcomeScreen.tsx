"use client";

import { useEffect, useState } from "react";
import Logo from "./Logo";
import { auth, onAuthStateChanged, signInWithGoogle, signOut, type User } from "@/lib/firebase";
import { t } from "@/lib/uiTranslations";

interface Props {
  onContinue: () => void;
}

const STEPS = [
  {
    label: "Upload",
    detail: "Upload any document — a letter, a form, a notice — in any language.",
  },
  {
    label: "Extract & Validate",
    detail: "Gemini extracts every task and requirement; a deterministic validator checks dependencies and drops hallucinated fields.",
  },
  {
    label: "Prioritize",
    detail: "A rule-based next-best-action engine ranks what to do first — never the model's own opinion.",
  },
  {
    label: "Track & Resolve",
    detail: "Check off tasks, answer conditions, and watch downstream impact and deadlines update in real time.",
  },
];

const FEATURES = [
  {
    icon: "🎯",
    title: "Next Best Action",
    description:
      "A deterministic ranking engine — not the model — decides what you should do first, based on priority, blockers, and deadlines.",
  },
  {
    icon: "📡",
    title: "Risk Radar",
    description:
      "Approaching deadlines, blocked tasks, unanswered conditions, and missing information — surfaced at a glance, before they become a problem.",
  },
  {
    icon: "🗂️",
    title: "Case Grouping",
    description:
      "Group every document in one bureaucratic process into a Case, with one shared task list and one shared next best action.",
  },
  {
    icon: "⚠️",
    title: "Cross-Document Conflicts",
    description:
      "Two documents in the same Case sharing a deadline? The agent flags it automatically — no manual cross-checking required.",
  },
];

export default function WelcomeScreen({ onContinue }: Props) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  return (
    <div className="relative flex-1 overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[-10%] h-[300px] w-[520px] -translate-x-1/2 rounded-full bg-brand opacity-[0.08] blur-[100px] dark:opacity-[0.14]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute right-[10%] top-[12%] h-[180px] w-[180px] rounded-full bg-amber-400 opacity-[0.05] blur-[90px] dark:opacity-[0.07]"
      />

      <div className="relative mx-auto flex w-full max-w-4xl flex-col items-center px-6 pb-16 pt-12 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-brand backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-indigo-400">
          <Logo className="h-3.5 w-3.5" />
          Document-to-Action Agent
        </div>

        <h1 className="max-w-2xl text-3xl font-bold leading-tight tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-50">
          Upload the document. Know exactly what to do next.
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-6 text-zinc-600 sm:text-base dark:text-zinc-400">
          Extracts tasks, deadlines, dependencies, and risks — then continuously tells you the next
          best action.
        </p>
        <p className="mt-3 max-w-xl text-sm font-medium text-zinc-800 dark:text-zinc-200">
          This is not a document summarizer. It turns bureaucracy into an ordered action plan.
        </p>

        {user && (
          <div className="mt-5 flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-500">
            {user.photoURL && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.photoURL}
                alt=""
                className="h-4 w-4 rounded-full"
                referrerPolicy="no-referrer"
              />
            )}
            <span>
              {t("Signed in as", undefined)} {user.displayName ?? user.email}
            </span>
          </div>
        )}

        <div className="mt-4">
          {user ? (
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={onContinue}
                className="rounded-full bg-brand px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-brand/20 transition hover:-translate-y-0.5 hover:opacity-90 dark:bg-indigo-500"
              >
                {t("Continue", undefined)}
              </button>
              <div className="flex items-center gap-4 text-sm">
                <button
                  onClick={async () => {
                    await signOut();
                    onContinue();
                  }}
                  className="font-medium text-zinc-500 hover:text-brand dark:text-zinc-400 dark:hover:text-indigo-400"
                >
                  {t("Continue as guest instead", undefined)}
                </button>
                <span className="text-zinc-300 dark:text-zinc-700">•</span>
                <button
                  onClick={async () => {
                    await signOut();
                    await signInWithGoogle().catch(() => {});
                  }}
                  className="font-medium text-zinc-500 hover:text-brand dark:text-zinc-400 dark:hover:text-indigo-400"
                >
                  {t("Not you? Switch account", undefined)}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={async () => {
                  setLoading(true);
                  try {
                    await signInWithGoogle();
                  } catch {
                    // Popup closed or blocked — user can retry or continue as guest.
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                className="rounded-full bg-brand px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-brand/20 transition hover:-translate-y-0.5 hover:opacity-90 disabled:opacity-50 dark:bg-indigo-500"
              >
                {t("Sign in with Google", undefined)}
              </button>
              <button
                onClick={onContinue}
                className="text-sm font-medium text-zinc-500 hover:text-brand dark:text-zinc-400 dark:hover:text-indigo-400"
              >
                {t("Continue without signing in", undefined)}
              </button>
            </div>
          )}
        </div>

        {/* Live preview: what the agent tells you right after upload */}
        <div className="mt-10 w-full max-w-sm rounded-xl border border-zinc-200 bg-white/70 p-4 text-left backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/70">
          <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-brand dark:text-indigo-400">
            <span className="h-1.5 w-1.5 rounded-full bg-brand dark:bg-indigo-400" />
            Next Best Action
          </div>
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Upload proof of funds</p>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">Deadline: 3 days</p>
          <div className="mt-3 space-y-1 text-xs text-zinc-500 dark:text-zinc-400">
            <p className="font-medium text-zinc-700 dark:text-zinc-300">Why now?</p>
            <p>• Blocks residence application</p>
            <p>• High priority</p>
            <p>• Required by 2 documents</p>
          </div>
        </div>

        {/* How it works */}
        <div className="mt-14 w-full">
          <div className="mb-8 text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-600">
            How it works — four steps, fully visible
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            {STEPS.map((step, i) => (
              <div key={step.label} className="relative">
                <div className="flex h-full flex-col rounded-xl border border-zinc-200 bg-white/70 p-4 text-left backdrop-blur transition hover:border-brand/50 dark:border-zinc-800 dark:bg-zinc-900/70">
                  <div className="mb-3 flex h-7 w-7 items-center justify-center rounded-full bg-brand text-xs font-bold text-white dark:bg-indigo-500">
                    {i + 1}
                  </div>
                  <div className="mb-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    {step.label}
                  </div>
                  <div className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                    {step.detail}
                  </div>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    aria-hidden
                    className="absolute right-[-14px] top-1/2 hidden -translate-y-1/2 text-zinc-300 dark:text-zinc-700 sm:block"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* What you actually see */}
        <div className="mt-16 w-full">
          <div className="mb-8 text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-600">
            What you actually see
          </div>
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white/70 text-left backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/70">
            <div className="flex items-center gap-2 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              <span className="ml-3 text-xs text-zinc-500 dark:text-zinc-400">
                Residence permit application — task timeline
              </span>
            </div>
            <div className="grid gap-0 sm:grid-cols-[1.1fr_1fr]">
              <div className="space-y-3 border-b border-zinc-200 p-5 sm:border-b-0 sm:border-r dark:border-zinc-800">
                {[
                  { t: "Extracted", d: "5 tasks found, 1 deadline in 4 days.", c: "text-zinc-600 dark:text-zinc-400" },
                  { t: "Next Best Action", d: "Submit proof of address — blocks 2 other tasks.", c: "text-brand dark:text-indigo-400" },
                  { t: "Risk Radar", d: "1 deadline approaching, 1 condition unanswered.", c: "text-amber-600 dark:text-amber-400" },
                  { t: "Resolved", d: "Task marked done — dependent tasks unblocked.", c: "text-emerald-600 dark:text-emerald-400" },
                ].map((row) => (
                  <div key={row.t} className="flex gap-3 text-xs">
                    <span className={`mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full ${row.c.replace("text-", "bg-")}`} />
                    <div>
                      <span className="font-semibold text-zinc-900 dark:text-zinc-50">{row.t}: </span>
                      <span className="text-zinc-500 dark:text-zinc-400">{row.d}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-5">
                <div className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-600">
                  Cross-document conflict
                </div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
                  Shared deadline detected across 2 documents
                </div>
                <div className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                  A rule, not a guess — the same deadline appearing on tasks from two different documents
                  in the same Case is flagged automatically, no model judgment involved.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature grid */}
        <div className="mt-16 grid w-full gap-4 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="group rounded-xl border border-zinc-200 bg-white/70 p-5 text-left backdrop-blur transition hover:-translate-y-0.5 hover:border-brand/50 dark:border-zinc-800 dark:bg-zinc-900/70"
            >
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-brand-light text-base dark:bg-indigo-950/40">
                {f.icon}
              </div>
              <div className="mb-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">{f.title}</div>
              <div className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                {f.description}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-xs text-zinc-400 dark:text-zinc-600">
          Built for the Google Cloud &quot;All Things Agentic&quot; hackathon — Taskmaster track.
        </div>
      </div>
    </div>
  );
}
