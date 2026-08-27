"use client";

import { useEffect, useState } from "react";
import { auth, onAuthStateChanged, signInWithGoogle, signOut, type User } from "@/lib/firebase";
import { t } from "@/lib/uiTranslations";

interface Props {
  language?: string;
  onSignOut?: () => void;
}

export default function AuthButton({ language, onSignOut }: Props) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  if (user) {
    return (
      <div className="flex items-center gap-2">
        {user.photoURL && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.photoURL} alt="" className="h-6 w-6 rounded-full" referrerPolicy="no-referrer" />
        )}
        <button
          onClick={async () => {
            await signOut();
            onSignOut?.();
          }}
          className="text-sm font-medium text-zinc-500 hover:text-brand dark:text-zinc-400 dark:hover:text-indigo-400"
        >
          {t("Sign out", language)}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={async () => {
        setLoading(true);
        try {
          await signInWithGoogle();
        } catch {
          // Popup closed or blocked — nothing to recover, user can retry.
        } finally {
          setLoading(false);
        }
      }}
      disabled={loading}
      className="rounded-full border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
    >
      {t("Sign in with Google", language)}
    </button>
  );
}
