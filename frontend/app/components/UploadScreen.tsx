"use client";

import { useRef, useState } from "react";
import LanguageSelect from "./LanguageSelect";

interface Props {
  onFileSelected: (file: File, targetLanguage?: string) => void;
  errorMessage: string | null;
}

const FLOW_STEPS = ["Upload", "Extract actions", "Detect deadlines", "Build workflow"];
const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20 MB, matches the backend's limit

export default function UploadScreen({ onFileSelected, errorMessage }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState<string | undefined>(undefined);
  const [sizeError, setSizeError] = useState<string | null>(null);

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setSizeError("This file is too large. Please upload a file under 20 MB.");
      return;
    }
    setSizeError(null);
    onFileSelected(file, targetLanguage);
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-4 px-6 py-6 text-center">
      <div>
        <span className="inline-flex items-center rounded-full border border-brand/30 bg-brand-light px-3 py-1 text-xs font-medium text-brand dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-400">
          Powered by Gemini + Google ADK
        </span>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-3xl">
          Turn complex official documents into clear actions.
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          Upload a document. Let the AI agent identify what you need to do,
          when you need to do it, and what comes first.
        </p>
      </div>

      <LanguageSelect label="Explain the results in" onChange={setTargetLanguage} />

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
        className={`flex w-full cursor-pointer flex-col items-center gap-1.5 rounded-2xl border-2 border-dashed px-10 py-6 transition-colors ${
          isDragging
            ? "border-brand bg-brand-light dark:border-indigo-500 dark:bg-indigo-950/30"
            : "border-zinc-300 hover:border-brand/60 dark:border-zinc-700 dark:hover:border-indigo-500/60"
        }`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          className="h-7 w-7 text-brand dark:text-indigo-400"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z"
          />
        </svg>
        <p className="font-medium text-zinc-900 dark:text-zinc-100">
          Upload an official document
        </p>
        <p className="text-sm text-zinc-500">or drag and drop here</p>
        <p className="text-xs text-zinc-400">
          PDF, Word, PowerPoint, text, or a photo of a document — one at a time
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.docx,.pptx,text/plain,image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      <p className="text-xs text-zinc-400">
        Try with: a university letter, government notice, or insurance document
      </p>

      <div className="flex w-full flex-wrap items-center justify-center gap-x-2 gap-y-2 text-xs text-zinc-500 dark:text-zinc-400">
        {FLOW_STEPS.map((step, index) => (
          <span key={step} className="flex items-center gap-2">
            <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 font-medium text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
              {step}
            </span>
            {index < FLOW_STEPS.length - 1 && <span className="text-zinc-300 dark:text-zinc-700">→</span>}
          </span>
        ))}
      </div>

      {(sizeError || errorMessage) && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {sizeError || errorMessage}
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
