"use client";

import { useRef, useState } from "react";

interface Props {
  onFileSelected: (file: File, targetLanguage?: string) => void;
  errorMessage: string | null;
}

const LANGUAGE_OPTIONS = [
  { value: "", label: "Match the document's language" },
  { value: "English", label: "English" },
  { value: "Türkçe", label: "Türkçe" },
  { value: "Norsk", label: "Norsk" },
  { value: "Deutsch", label: "Deutsch" },
  { value: "Français", label: "Français" },
  { value: "Español", label: "Español" },
  { value: "__custom__", label: "Other…" },
];

export default function UploadScreen({ onFileSelected, errorMessage }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [languageChoice, setLanguageChoice] = useState("");
  const [customLanguage, setCustomLanguage] = useState("");

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    const targetLanguage =
      languageChoice === "__custom__" ? customLanguage.trim() : languageChoice;
    onFileSelected(file, targetLanguage || undefined);
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-8 px-6 py-24 text-center">
      <div>
        <h1 className="text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-5xl">
          Turn complex official documents into clear actions.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg leading-7 text-zinc-600 dark:text-zinc-400">
          Upload a document. Let the AI agent identify what you need to do,
          when you need to do it, and what comes first.
        </p>
      </div>

      <div className="flex w-full flex-col items-center gap-2">
        <label
          htmlFor="language-select"
          className="text-xs font-medium uppercase tracking-wide text-zinc-500"
        >
          Explain the results in
        </label>
        <select
          id="language-select"
          value={languageChoice}
          onChange={(e) => setLanguageChoice(e.target.value)}
          className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
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
            placeholder="e.g. Italiano, 日本語, العربية"
            className="w-56 rounded-full border border-zinc-300 bg-white px-4 py-2 text-center text-sm text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
          />
        )}
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`flex w-full cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-10 py-14 transition-colors ${
          isDragging
            ? "border-zinc-900 bg-zinc-50 dark:border-zinc-100 dark:bg-zinc-900"
            : "border-zinc-300 hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-600"
        }`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          className="h-10 w-10 text-zinc-400"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z"
          />
        </svg>
        <p className="font-medium text-zinc-900 dark:text-zinc-100">
          Drop a PDF here, or click to browse
        </p>
        <p className="text-sm text-zinc-500">PDF only, one document at a time</p>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {errorMessage && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {errorMessage}
        </p>
      )}

      <p className="max-w-lg text-xs leading-5 text-zinc-500 dark:text-zinc-500">
        This tool helps you organize information found in official documents.
        It does not provide legal advice — verify critical requirements with
        the issuing institution.
      </p>
    </div>
  );
}
