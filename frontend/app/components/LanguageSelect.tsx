"use client";

import { useState } from "react";
import { LANGUAGE_OPTIONS } from "@/lib/languages";

interface Props {
  onChange: (language: string | undefined) => void;
  label?: string;
  compact?: boolean;
}

export default function LanguageSelect({ onChange, label, compact }: Props) {
  const [languageChoice, setLanguageChoice] = useState("");
  const [customLanguage, setCustomLanguage] = useState("");

  function emit(choice: string, custom: string) {
    const targetLanguage = choice === "__custom__" ? custom.trim() : choice;
    onChange(targetLanguage || undefined);
  }

  return (
    <div
      className={`flex flex-col items-center gap-2 ${compact ? "sm:flex-row sm:items-center" : ""}`}
    >
      {label && (
        <label className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          {label}
        </label>
      )}
      <select
        value={languageChoice}
        onChange={(e) => {
          setLanguageChoice(e.target.value);
          if (e.target.value !== "__custom__") emit(e.target.value, customLanguage);
        }}
        className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-800 outline-none focus:border-brand focus:ring-1 focus:ring-brand dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:focus:border-indigo-500 dark:focus:ring-indigo-500"
      >
        {LANGUAGE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {languageChoice === "__custom__" && (
        <input
          type="text"
          value={customLanguage}
          onChange={(e) => setCustomLanguage(e.target.value)}
          onBlur={() => emit(languageChoice, customLanguage)}
          onKeyDown={(e) => {
            if (e.key === "Enter") emit(languageChoice, customLanguage);
          }}
          placeholder="e.g. Italiano, 日本語, العربية"
          className="w-56 rounded-full border border-zinc-300 bg-white px-4 py-2 text-center text-sm text-zinc-800 outline-none focus:border-brand focus:ring-1 focus:ring-brand dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:focus:border-indigo-500 dark:focus:ring-indigo-500"
        />
      )}
    </div>
  );
}
