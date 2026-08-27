"use client";

import { useEffect, useState } from "react";
import Logo from "./Logo";
import { auth, onAuthStateChanged, signInWithGoogle, type User } from "@/lib/firebase";
import { t } from "@/lib/uiTranslations";

interface Props {
  onContinue: () => void;
}

export default function WelcomeScreen({ onContinue }: Props) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-5 px-6 py-6 text-center">
      <Logo className="h-14 w-14" />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {t("Welcome to Bureaucracy Action Agent", undefined)}
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          {t("Sign in to save your documents and access them from any device.", undefined)}
        </p>
      </div>

      {user ? (
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            {user.photoURL && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.photoURL}
                alt=""
                className="h-6 w-6 rounded-full"
                referrerPolicy="no-referrer"
              />
            )}
            <span>
              {t("Signed in as", undefined)} {user.displayName ?? user.email}
            </span>
          </div>
          <button
            onClick={onContinue}
            className="rounded-full bg-brand px-6 py-2.5 text-sm font-medium text-white hover:opacity-90 dark:bg-indigo-500"
          >
            {t("Continue", undefined)}
          </button>
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
            className="rounded-full bg-brand px-6 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 dark:bg-indigo-500"
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
  );
}
