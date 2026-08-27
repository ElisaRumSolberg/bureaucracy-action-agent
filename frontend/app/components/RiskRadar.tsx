import type { RiskStats } from "@/lib/taskGraph";
import { t } from "@/lib/uiTranslations";

interface Props {
  stats: RiskStats;
  language?: string;
}

export default function RiskRadar({ stats, language }: Props) {
  const items = [
    { count: stats.approachingDeadlines, icon: "⏰", label: t("deadlines approaching", language) },
    { count: stats.blockedCount, icon: "🔒", label: t("tasks blocked", language) },
    { count: stats.unansweredConditions, icon: "❓", label: t("conditions unanswered", language) },
    { count: stats.missingInformationCount, icon: "📄", label: t("details missing", language) },
  ];
  const anyRisk = items.some((item) => item.count > 0);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        {t("Risk Radar", language)}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {items.map((item) => (
          <div
            key={item.label}
            className={`rounded-xl p-3 text-center ${
              item.count > 0
                ? "bg-amber-50 dark:bg-amber-950/30"
                : "bg-zinc-50 dark:bg-zinc-800/40"
            }`}
          >
            <p className="text-lg leading-none">{item.icon}</p>
            <p
              className={`mt-1 text-xl font-semibold ${
                item.count > 0
                  ? "text-amber-700 dark:text-amber-300"
                  : "text-zinc-400 dark:text-zinc-600"
              }`}
            >
              {item.count}
            </p>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{item.label}</p>
          </div>
        ))}
      </div>
      {!anyRisk && (
        <p className="mt-3 text-xs text-emerald-600 dark:text-emerald-400">
          {t("Nothing needs attention right now.", language)}
        </p>
      )}
    </div>
  );
}
