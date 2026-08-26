import { t, tProgressDone } from "@/lib/uiTranslations";

interface Props {
  total: number;
  language?: string;
}

export default function WorkflowCompleteSummary({ total, language }: Props) {
  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900 dark:bg-emerald-950">
      <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
        ✓ {t("Workflow complete", language)}
      </p>
      <ul className="mt-2 space-y-1 text-sm text-emerald-700 dark:text-emerald-300">
        <li>{tProgressDone(total, total, language)}</li>
        <li>{t("No remaining blockers", language)}</li>
        <li>{t("No upcoming deadlines.", language).replace(/\.$/, "")}</li>
      </ul>
      <p className="mt-3 text-sm text-emerald-600 dark:text-emerald-400">
        {t("You're done with this document.", language)}
      </p>
    </div>
  );
}
