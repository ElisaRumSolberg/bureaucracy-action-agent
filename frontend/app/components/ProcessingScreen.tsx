"use client";

import { useEffect, useState } from "react";

const STEPS = [
  "Reading document...",
  "Extracting required actions...",
  "Detecting deadlines...",
  "Building task dependencies...",
  "Saving action plan...",
];

export default function ProcessingScreen() {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((step) => Math.min(step + 1, STEPS.length - 1));
    }, 1100);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-8 px-6 py-24">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100" />
      <ul className="w-full space-y-3">
        {STEPS.map((step, index) => (
          <li
            key={step}
            className={`flex items-center gap-3 text-sm transition-opacity ${
              index <= activeStep ? "opacity-100" : "opacity-30"
            }`}
          >
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs ${
                index < activeStep
                  ? "bg-emerald-500 text-white"
                  : index === activeStep
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "bg-zinc-200 dark:bg-zinc-800"
              }`}
            >
              {index < activeStep ? "✓" : ""}
            </span>
            <span className="text-zinc-700 dark:text-zinc-300">{step}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
