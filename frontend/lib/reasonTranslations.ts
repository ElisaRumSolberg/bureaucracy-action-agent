// The backend computes priority_reason/risk_reason deterministically in
// English (see backend/app/agent/validation.py) — they're rule-based, not
// LLM output, so they don't go through the document's own language pipeline.
// This translates the small fixed set of phrases those rules can produce,
// for the languages offered in the picker. Anything else (a custom
// free-text language, or "match the document's language") falls back to
// the English original rather than guessing.

type Translations = Record<string, string>;

const EXACT: Record<string, Translations> = {
  "Blocks another task": {
    Türkçe: "Başka bir görevi engelliyor",
    Norsk: "Blokkerer en annen oppgave",
    Deutsch: "Blockiert eine andere Aufgabe",
    Français: "Bloque une autre tâche",
    Español: "Bloquea otra tarea",
  },
  "Important but not time-bound": {
    Türkçe: "Önemli ama zamana bağlı değil",
    Norsk: "Viktig, men ikke tidsbestemt",
    Deutsch: "Wichtig, aber nicht zeitgebunden",
    Français: "Important mais non urgent",
    Español: "Importante pero sin plazo",
  },
  "No deadline or urgency stated": {
    Türkçe: "Son tarih veya aciliyet belirtilmemiş",
    Norsk: "Ingen frist eller hast angitt",
    Deutsch: "Keine Frist oder Dringlichkeit angegeben",
    Français: "Aucune échéance ni urgence indiquée",
    Español: "No se indica plazo ni urgencia",
  },
  Overdue: {
    Türkçe: "Süresi geçmiş",
    Norsk: "Forfalt",
    Deutsch: "Überfällig",
    Français: "En retard",
    Español: "Vencido",
  },
  "Due today": {
    Türkçe: "Bugün son gün",
    Norsk: "Forfaller i dag",
    Deutsch: "Heute fällig",
    Français: "À rendre aujourd'hui",
    Español: "Vence hoy",
  },
  "Due in 1 day": {
    Türkçe: "1 gün kaldı",
    Norsk: "Forfaller om 1 dag",
    Deutsch: "In 1 Tag fällig",
    Français: "À rendre dans 1 jour",
    Español: "Vence en 1 día",
  },
  "Blocks other tasks — a delay here cascades.": {
    Türkçe: "Diğer görevleri engelliyor — burada bir gecikme zincirleme etki yapar.",
    Norsk: "Blokkerer andre oppgaver — en forsinkelse her får ringvirkninger.",
    Deutsch: "Blockiert andere Aufgaben — eine Verzögerung hier wirkt sich kettenartig aus.",
    Français: "Bloque d'autres tâches — un retard ici a un effet en cascade.",
    Español: "Bloquea otras tareas — un retraso aquí tiene efecto en cadena.",
  },
  "Deadline is very close.": {
    Türkçe: "Son tarih çok yakın.",
    Norsk: "Fristen er svært nær.",
    Deutsch: "Die Frist ist sehr nah.",
    Français: "L'échéance est très proche.",
    Español: "El plazo está muy cerca.",
  },
  "Low extraction confidence — verify against the source.": {
    Türkçe: "Düşük çıkarım güveni — kaynakla doğrulayın.",
    Norsk: "Lav ekstraksjonssikkerhet — verifiser mot kilden.",
    Deutsch: "Geringe Extraktionssicherheit — mit der Quelle abgleichen.",
    Français: "Faible confiance d'extraction — vérifier avec la source.",
    Español: "Baja confianza de extracción — verificar con la fuente.",
  },
  "No explicit deadline was stated.": {
    Türkçe: "Açık bir son tarih belirtilmemiş.",
    Norsk: "Ingen eksplisitt frist ble angitt.",
    Deutsch: "Es wurde keine ausdrückliche Frist genannt.",
    Français: "Aucune échéance explicite n'a été indiquée.",
    Español: "No se indicó un plazo explícito.",
  },
  "No immediate risk detected.": {
    Türkçe: "Acil bir risk tespit edilmedi.",
    Norsk: "Ingen umiddelbar risiko oppdaget.",
    Deutsch: "Kein unmittelbares Risiko erkannt.",
    Français: "Aucun risque immédiat détecté.",
    Español: "No se detectó riesgo inmediato.",
  },
};

const DAYS_LEFT: Record<string, (n: string) => string> = {
  Türkçe: (n) => `${n} gün kaldı`,
  Norsk: (n) => `Forfaller om ${n} dager`,
  Deutsch: (n) => `In ${n} Tagen fällig`,
  Français: (n) => `À rendre dans ${n} jours`,
  Español: (n) => `Vence en ${n} días`,
};

const DEADLINE_AWAY: Record<string, (n: string) => string> = {
  Türkçe: (n) => `Son tarihe ${n} gün var`,
  Norsk: (n) => `Fristen er ${n} dager unna`,
  Deutsch: (n) => `Frist ist noch ${n} Tage entfernt`,
  Français: (n) => `L'échéance est dans ${n} jours`,
  Español: (n) => `Faltan ${n} días para el plazo`,
};

export function translateReason(reason: string, language: string | undefined): string {
  if (!reason || !language) return reason;

  const exact = EXACT[reason]?.[language];
  if (exact) return exact;

  const daysMatch = reason.match(/^Due in (\d+) days?$/);
  if (daysMatch) {
    const translator = DAYS_LEFT[language];
    if (translator) return translator(daysMatch[1]);
  }

  const awayMatch = reason.match(/^Deadline is (\d+) days away$/);
  if (awayMatch) {
    const translator = DEADLINE_AWAY[language];
    if (translator) return translator(awayMatch[1]);
  }

  return reason;
}

const BLOCKS_COUNT: Record<string, (n: number) => string> = {
  Türkçe: (n) => `${n} başka görevi engelliyor`,
  Norsk: (n) => `blokkerer ${n} annen oppgave${n > 1 ? "r" : ""}`,
  Deutsch: (n) => `blockiert ${n} andere Aufgabe${n > 1 ? "n" : ""}`,
  Français: (n) => `bloque ${n} autre${n > 1 ? "s" : ""} tâche${n > 1 ? "s" : ""}`,
  Español: (n) => `bloquea ${n} otra${n > 1 ? "s" : ""} tarea${n > 1 ? "s" : ""}`,
};

export function translateBlocksCount(count: number, language: string | undefined): string {
  const translator = language ? BLOCKS_COUNT[language] : undefined;
  if (translator) return translator(count);
  return `blocks ${count} other task${count > 1 ? "s" : ""}`;
}

const AND_WORD: Record<string, string> = {
  Türkçe: " ve ",
  Norsk: " og ",
  Deutsch: " und ",
  Français: " et ",
  Español: " y ",
};

export function localizedJoin(parts: string[], language: string | undefined): string {
  const joiner = (language && AND_WORD[language]) || ", and ";
  return parts.join(joiner);
}
