// Static UI chrome (headers, buttons, labels) for the 5 languages the
// picker offers besides English. Unlike reasonTranslations.ts (which
// translates backend-generated rule strings), these are the app's own
// fixed copy — translated once here rather than re-derived per component.
// Falls back to the English key for "match document" / free-text languages.

export type UILanguage = "Türkçe" | "Norsk" | "Deutsch" | "Français" | "Español";

const STRINGS: Record<string, Record<UILanguage, string>> = {
  "Action plan": {
    Türkçe: "Eylem planı",
    Norsk: "Handlingsplan",
    Deutsch: "Aktionsplan",
    Français: "Plan d'action",
    Español: "Plan de acción",
  },
  "Document Summary": {
    Türkçe: "Belge Özeti",
    Norsk: "Dokumentsammendrag",
    Deutsch: "Dokumentzusammenfassung",
    Français: "Résumé du document",
    Español: "Resumen del documento",
  },
  Actions: {
    Türkçe: "Eylemler",
    Norsk: "Handlinger",
    Deutsch: "Aktionen",
    Français: "Actions",
    Español: "Acciones",
  },
  Deadlines: {
    Türkçe: "Son tarihler",
    Norsk: "Frister",
    Deutsch: "Fristen",
    Français: "Échéances",
    Español: "Plazos",
  },
  Dependencies: {
    Türkçe: "Bağımlılıklar",
    Norsk: "Avhengigheter",
    Deutsch: "Abhängigkeiten",
    Français: "Dépendances",
    Español: "Dependencias",
  },
  "Missing details": {
    Türkçe: "Eksik bilgiler",
    Norsk: "Manglende detaljer",
    Deutsch: "Fehlende Details",
    Français: "Détails manquants",
    Español: "Detalles faltantes",
  },
  Progress: {
    Türkçe: "İlerleme",
    Norsk: "Fremgang",
    Deutsch: "Fortschritt",
    Français: "Progression",
    Español: "Progreso",
  },
  "Explain in": {
    Türkçe: "Şu dilde açıkla",
    Norsk: "Forklar på",
    Deutsch: "Erklären auf",
    Français: "Expliquer en",
    Español: "Explicar en",
  },
  "Translating…": {
    Türkçe: "Çevriliyor…",
    Norsk: "Oversetter…",
    Deutsch: "Wird übersetzt…",
    Français: "Traduction en cours…",
    Español: "Traduciendo…",
  },
  "Upload another": {
    Türkçe: "Başka bir belge yükle",
    Norsk: "Last opp en annen",
    Deutsch: "Weiteres Dokument hochladen",
    Français: "Téléverser un autre document",
    Español: "Subir otro documento",
  },
  Warnings: {
    Türkçe: "Uyarılar",
    Norsk: "Advarsler",
    Deutsch: "Warnungen",
    Français: "Avertissements",
    Español: "Advertencias",
  },
  "Missing information": {
    Türkçe: "Eksik bilgi",
    Norsk: "Manglende informasjon",
    Deutsch: "Fehlende Informationen",
    Français: "Informations manquantes",
    Español: "Información faltante",
  },
  "Possible consequences": {
    Türkçe: "Olası sonuçlar",
    Norsk: "Mulige konsekvenser",
    Deutsch: "Mögliche Konsequenzen",
    Français: "Conséquences possibles",
    Español: "Posibles consecuencias",
  },
  "This tool helps you organize information found in official documents. It does not provide legal advice — verify critical requirements with the issuing institution.":
    {
      Türkçe:
        "Bu araç, resmi belgelerdeki bilgileri düzenlemenize yardımcı olur. Hukuki tavsiye vermez — kritik gereklilikleri ilgili kurumla doğrulayın.",
      Norsk:
        "Dette verktøyet hjelper deg med å organisere informasjon funnet i offisielle dokumenter. Det gir ikke juridisk rådgivning — bekreft kritiske krav med den utstedende institusjonen.",
      Deutsch:
        "Dieses Tool hilft Ihnen, Informationen aus offiziellen Dokumenten zu organisieren. Es bietet keine Rechtsberatung — überprüfen Sie kritische Anforderungen bei der ausstellenden Institution.",
      Français:
        "Cet outil vous aide à organiser les informations trouvées dans des documents officiels. Il ne fournit pas de conseil juridique — vérifiez les exigences critiques auprès de l'institution émettrice.",
      Español:
        "Esta herramienta te ayuda a organizar la información encontrada en documentos oficiales. No proporciona asesoría legal — verifica los requisitos críticos con la institución emisora.",
    },
  "No deadline stated": {
    Türkçe: "Son tarih belirtilmemiş",
    Norsk: "Ingen frist angitt",
    Deutsch: "Keine Frist angegeben",
    Français: "Aucune échéance indiquée",
    Español: "No se indicó plazo",
  },
  "(from final deadline)": {
    Türkçe: "(genel son tarihten)",
    Norsk: "(fra endelig frist)",
    Deutsch: "(von der endgültigen Frist)",
    Français: "(à partir de l'échéance finale)",
    Español: "(del plazo final)",
  },
  "High confidence": {
    Türkçe: "Yüksek güven",
    Norsk: "Høy sikkerhet",
    Deutsch: "Hohe Zuverlässigkeit",
    Français: "Confiance élevée",
    Español: "Confianza alta",
  },
  "Medium confidence": {
    Türkçe: "Orta güven",
    Norsk: "Middels sikkerhet",
    Deutsch: "Mittlere Zuverlässigkeit",
    Français: "Confiance moyenne",
    Español: "Confianza media",
  },
  "Needs verification": {
    Türkçe: "Doğrulama gerekiyor",
    Norsk: "Trenger verifisering",
    Deutsch: "Überprüfung erforderlich",
    Français: "Vérification nécessaire",
    Español: "Necesita verificación",
  },
  PRIORITY: {
    Türkçe: "ÖNCELİK",
    Norsk: "PRIORITET",
    Deutsch: "PRIORITÄT",
    Français: "PRIORITÉ",
    Español: "PRIORIDAD",
  },
  HIGH: {
    Türkçe: "YÜKSEK",
    Norsk: "HØY",
    Deutsch: "HOCH",
    Français: "ÉLEVÉE",
    Español: "ALTA",
  },
  MEDIUM: {
    Türkçe: "ORTA",
    Norsk: "MIDDELS",
    Deutsch: "MITTEL",
    Français: "MOYENNE",
    Español: "MEDIA",
  },
  LOW: {
    Türkçe: "DÜŞÜK",
    Norsk: "LAV",
    Deutsch: "NIEDRIG",
    Français: "FAIBLE",
    Español: "BAJA",
  },
  Blocked: {
    Türkçe: "Bloke",
    Norsk: "Blokkert",
    Deutsch: "Blockiert",
    Français: "Bloqué",
    Español: "Bloqueado",
  },
  Conditional: {
    Türkçe: "Koşullu",
    Norsk: "Betinget",
    Deutsch: "Bedingt",
    Français: "Conditionnel",
    Español: "Condicional",
  },
  "Does this apply to you?": {
    Türkçe: "Bu sizin için geçerli mi?",
    Norsk: "Gjelder dette deg?",
    Deutsch: "Trifft das auf Sie zu?",
    Français: "Cela s'applique-t-il à vous ?",
    Español: "¿Esto te aplica?",
  },
  Yes: {
    Türkçe: "Evet",
    Norsk: "Ja",
    Deutsch: "Ja",
    Français: "Oui",
    Español: "Sí",
  },
  No: {
    Türkçe: "Hayır",
    Norsk: "Nei",
    Deutsch: "Nein",
    Français: "Non",
    Español: "No",
  },
  "(leave unanswered if not sure)": {
    Türkçe: "(emin değilseniz boş bırakın)",
    Norsk: "(la stå ubesvart hvis usikker)",
    Deutsch: "(unbeantwortet lassen, wenn unsicher)",
    Français: "(laisser sans réponse si incertain)",
    Español: "(deja sin responder si no estás seguro)",
  },
  "Applies to you": {
    Türkçe: "Sizin için geçerli",
    Norsk: "Gjelder deg",
    Deutsch: "Trifft auf Sie zu",
    Français: "S'applique à vous",
    Español: "Te aplica",
  },
  Change: {
    Türkçe: "Değiştir",
    Norsk: "Endre",
    Deutsch: "Ändern",
    Français: "Modifier",
    Español: "Cambiar",
  },
  "Doesn't apply — excluded from your plan": {
    Türkçe: "Geçerli değil — planınızdan çıkarıldı",
    Norsk: "Gjelder ikke — utelatt fra planen din",
    Deutsch: "Trifft nicht zu — aus Ihrem Plan ausgeschlossen",
    Français: "Ne s'applique pas — exclu de votre plan",
    Español: "No aplica — excluido de tu plan",
  },
  Deadline: {
    Türkçe: "Son tarih",
    Norsk: "Frist",
    Deutsch: "Frist",
    Français: "Échéance",
    Español: "Plazo",
  },
  Risk: {
    Türkçe: "Risk",
    Norsk: "Risiko",
    Deutsch: "Risiko",
    Français: "Risque",
    Español: "Riesgo",
  },
  "Depends on": {
    Türkçe: "Bağlı olduğu",
    Norsk: "Avhenger av",
    Deutsch: "Abhängig von",
    Français: "Dépend de",
    Español: "Depende de",
  },
  Nothing: {
    Türkçe: "Hiçbir şey",
    Norsk: "Ingenting",
    Deutsch: "Nichts",
    Français: "Rien",
    Español: "Nada",
  },
  "Required documents": {
    Türkçe: "Gerekli belgeler",
    Norsk: "Nødvendige dokumenter",
    Deutsch: "Erforderliche Dokumente",
    Français: "Documents requis",
    Español: "Documentos requeridos",
  },
  "None stated": {
    Türkçe: "Belirtilmemiş",
    Norsk: "Ikke angitt",
    Deutsch: "Nicht angegeben",
    Français: "Non indiqué",
    Español: "No especificado",
  },
  "Source evidence": {
    Türkçe: "Kaynak kanıt",
    Norsk: "Kildebevis",
    Deutsch: "Quellenbeleg",
    Français: "Preuve source",
    Español: "Evidencia fuente",
  },
  "Recommended next action": {
    Türkçe: "Önerilen sonraki adım",
    Norsk: "Anbefalt neste handling",
    Deutsch: "Empfohlene nächste Aktion",
    Français: "Prochaine action recommandée",
    Español: "Próxima acción recomendada",
  },
  "If this applies to you": {
    Türkçe: "Sizin için geçerliyse",
    Norsk: "Hvis dette gjelder deg",
    Deutsch: "Falls dies auf Sie zutrifft",
    Français: "Si cela s'applique à vous",
    Español: "Si esto te aplica",
  },
  "Condition:": {
    Türkçe: "Koşul:",
    Norsk: "Vilkår:",
    Deutsch: "Bedingung:",
    Français: "Condition :",
    Español: "Condición:",
  },
  "Why?": {
    Türkçe: "Neden?",
    Norsk: "Hvorfor?",
    Deutsch: "Warum?",
    Français: "Pourquoi ?",
    Español: "¿Por qué?",
  },
  "All tasks complete": {
    Türkçe: "Tüm görevler tamamlandı",
    Norsk: "Alle oppgaver fullført",
    Deutsch: "Alle Aufgaben abgeschlossen",
    Français: "Toutes les tâches sont terminées",
    Español: "Todas las tareas completadas",
  },
  "Every task in this action plan has been marked done.": {
    Türkçe: "Bu eylem planındaki tüm görevler tamamlandı olarak işaretlendi.",
    Norsk: "Alle oppgaver i denne handlingsplanen er merket som fullført.",
    Deutsch: "Alle Aufgaben in diesem Aktionsplan wurden als erledigt markiert.",
    Français: "Toutes les tâches de ce plan d'action ont été marquées comme terminées.",
    Español: "Todas las tareas de este plan de acción se han marcado como completadas.",
  },
  "Nothing is unblocked yet": {
    Türkçe: "Henüz açılmış bir görev yok",
    Norsk: "Ingenting er avblokkert ennå",
    Deutsch: "Noch nichts ist freigegeben",
    Français: "Rien n'est encore débloqué",
    Español: "Nada está desbloqueado todavía",
  },
  "Every remaining task is waiting on a dependency.": {
    Türkçe: "Kalan tüm görevler bir bağımlılığı bekliyor.",
    Norsk: "Alle gjenværende oppgaver venter på en avhengighet.",
    Deutsch: "Alle verbleibenden Aufgaben warten auf eine Abhängigkeit.",
    Français: "Toutes les tâches restantes attendent une dépendance.",
    Español: "Todas las tareas restantes están esperando una dependencia.",
  },
  "Action Flow": {
    Türkçe: "Eylem Akışı",
    Norsk: "Handlingsflyt",
    Deutsch: "Aktionsablauf",
    Français: "Flux d'actions",
    Español: "Flujo de acciones",
  },
  "Critical Path": {
    Türkçe: "Kritik Yol",
    Norsk: "Kritisk sti",
    Deutsch: "Kritischer Pfad",
    Français: "Chemin critique",
    Español: "Ruta crítica",
  },
  "All Tasks": {
    Türkçe: "Tüm Görevler",
    Norsk: "Alle oppgaver",
    Deutsch: "Alle Aufgaben",
    Français: "Toutes les tâches",
    Español: "Todas las tareas",
  },
  "Agent activity": {
    Türkçe: "Ajan etkinliği",
    Norsk: "Agentaktivitet",
    Deutsch: "Agentenaktivität",
    Français: "Activité de l'agent",
    Español: "Actividad del agente",
  },
  Show: {
    Türkçe: "Göster",
    Norsk: "Vis",
    Deutsch: "Anzeigen",
    Français: "Afficher",
    Español: "Mostrar",
  },
  Hide: {
    Türkçe: "Gizle",
    Norsk: "Skjul",
    Deutsch: "Ausblenden",
    Français: "Masquer",
    Español: "Ocultar",
  },
  "Loading…": {
    Türkçe: "Yükleniyor…",
    Norsk: "Laster…",
    Deutsch: "Wird geladen…",
    Français: "Chargement…",
    Español: "Cargando…",
  },
  "No activity yet.": {
    Türkçe: "Henüz etkinlik yok.",
    Norsk: "Ingen aktivitet ennå.",
    Deutsch: "Noch keine Aktivität.",
    Français: "Aucune activité pour l'instant.",
    Español: "Aún no hay actividad.",
  },
  "How to complete this": {
    Türkçe: "Bu nasıl tamamlanır",
    Norsk: "Slik fullfører du dette",
    Deutsch: "So wird dies erledigt",
    Français: "Comment accomplir cela",
    Español: "Cómo completar esto",
  },
  "Hide guidance": {
    Türkçe: "Rehberi gizle",
    Norsk: "Skjul veiledning",
    Deutsch: "Anleitung ausblenden",
    Français: "Masquer le guide",
    Español: "Ocultar guía",
  },
  "Generating guidance…": {
    Türkçe: "Rehber oluşturuluyor…",
    Norsk: "Genererer veiledning…",
    Deutsch: "Anleitung wird erstellt…",
    Français: "Génération du guide…",
    Español: "Generando guía…",
  },
  "Something went wrong.": {
    Türkçe: "Bir şeyler ters gitti.",
    Norsk: "Noe gikk galt.",
    Deutsch: "Etwas ist schiefgelaufen.",
    Français: "Une erreur s'est produite.",
    Español: "Algo salió mal.",
  },
  "From the document": {
    Türkçe: "Belgeden",
    Norsk: "Fra dokumentet",
    Deutsch: "Aus dem Dokument",
    Français: "Du document",
    Español: "Del documento",
  },
  "AI suggestion — steps": {
    Türkçe: "Yapay zeka önerisi — adımlar",
    Norsk: "KI-forslag — trinn",
    Deutsch: "KI-Vorschlag — Schritte",
    Français: "Suggestion IA — étapes",
    Español: "Sugerencia de IA — pasos",
  },
  "AI suggestion — before you start": {
    Türkçe: "Yapay zeka önerisi — başlamadan önce",
    Norsk: "KI-forslag — før du starter",
    Deutsch: "KI-Vorschlag — bevor Sie beginnen",
    Français: "Suggestion IA — avant de commencer",
    Español: "Sugerencia de IA — antes de empezar",
  },
  "AI suggestion — common mistakes": {
    Türkçe: "Yapay zeka önerisi — sık yapılan hatalar",
    Norsk: "KI-forslag — vanlige feil",
    Deutsch: "KI-Vorschlag — häufige Fehler",
    Français: "Suggestion IA — erreurs courantes",
    Español: "Sugerencia de IA — errores comunes",
  },
  "Ask about this task": {
    Türkçe: "Bu görev hakkında sor",
    Norsk: "Spør om denne oppgaven",
    Deutsch: "Frag zu dieser Aufgabe",
    Français: "Poser une question sur cette tâche",
    Español: "Preguntar sobre esta tarea",
  },
  "Hide chat": {
    Türkçe: "Sohbeti gizle",
    Norsk: "Skjul chat",
    Deutsch: "Chat ausblenden",
    Français: "Masquer le chat",
    Español: "Ocultar chat",
  },
  "Thinking…": {
    Türkçe: "Düşünüyor…",
    Norsk: "Tenker…",
    Deutsch: "Denkt nach…",
    Français: "Réflexion…",
    Español: "Pensando…",
  },
  "Ask a question about this task…": {
    Türkçe: "Bu görev hakkında bir soru sorun…",
    Norsk: "Still et spørsmål om denne oppgaven…",
    Deutsch: "Stellen Sie eine Frage zu dieser Aufgabe…",
    Français: "Posez une question sur cette tâche…",
    Español: "Haz una pregunta sobre esta tarea…",
  },
  Ask: {
    Türkçe: "Sor",
    Norsk: "Spør",
    Deutsch: "Fragen",
    Français: "Demander",
    Español: "Preguntar",
  },
  "Why is this important?": {
    Türkçe: "Bu neden önemli?",
    Norsk: "Hvorfor er dette viktig?",
    Deutsch: "Warum ist das wichtig?",
    Français: "Pourquoi est-ce important ?",
    Español: "¿Por qué es importante esto?",
  },
  "Why is it blocked?": {
    Türkçe: "Neden bloke edilmiş?",
    Norsk: "Hvorfor er den blokkert?",
    Deutsch: "Warum ist sie blockiert?",
    Français: "Pourquoi est-elle bloquée ?",
    Español: "¿Por qué está bloqueada?",
  },
  "Where is this in the document?": {
    Türkçe: "Bu belgenin neresinde?",
    Norsk: "Hvor i dokumentet er dette?",
    Deutsch: "Wo im Dokument steht das?",
    Français: "Où cela se trouve-t-il dans le document ?",
    Español: "¿Dónde está esto en el documento?",
  },
  "How do I start?": {
    Türkçe: "Nasıl başlarım?",
    Norsk: "Hvordan begynner jeg?",
    Deutsch: "Wie fange ich an?",
    Français: "Comment commencer ?",
    Español: "¿Cómo empiezo?",
  },
  "What if I delay this?": {
    Türkçe: "Bunu ertelersem ne olur?",
    Norsk: "Hva skjer hvis jeg utsetter dette?",
    Deutsch: "Was passiert, wenn ich das verschiebe?",
    Français: "Que se passe-t-il si je retarde ceci ?",
    Español: "¿Qué pasa si retraso esto?",
  },
  "Hide delay impact": {
    Türkçe: "Erteleme etkisini gizle",
    Norsk: "Skjul forsinkelseseffekt",
    Deutsch: "Verzögerungsauswirkung ausblenden",
    Français: "Masquer l'impact du retard",
    Español: "Ocultar impacto del retraso",
  },
  "Checking downstream impact…": {
    Türkçe: "Sonraki etkiler kontrol ediliyor…",
    Norsk: "Sjekker nedstrømseffekt…",
    Deutsch: "Auswirkungen werden geprüft…",
    Français: "Vérification de l'impact en aval…",
    Español: "Verificando el impacto posterior…",
  },
  Dashboard: {
    Türkçe: "Panel",
    Norsk: "Oversikt",
    Deutsch: "Übersicht",
    Français: "Tableau de bord",
    Español: "Panel",
  },
  Documents: {
    Türkçe: "Belgeler",
    Norsk: "Dokumenter",
    Deutsch: "Dokumente",
    Français: "Documents",
    Español: "Documentos",
  },
  Tasks: {
    Türkçe: "Görevler",
    Norsk: "Oppgaver",
    Deutsch: "Aufgaben",
    Français: "Tâches",
    Español: "Tareas",
  },
  "Workflow complete": {
    Türkçe: "İş akışı tamamlandı",
    Norsk: "Arbeidsflyten er fullført",
    Deutsch: "Arbeitsablauf abgeschlossen",
    Français: "Flux de travail terminé",
    Español: "Flujo de trabajo completado",
  },
  "No remaining blockers": {
    Türkçe: "Kalan engel yok",
    Norsk: "Ingen gjenværende blokkeringer",
    Deutsch: "Keine verbleibenden Blockaden",
    Français: "Aucun blocage restant",
    Español: "Sin bloqueos restantes",
  },
  "You're done with this document.": {
    Türkçe: "Bu belgeyle işiniz bitti.",
    Norsk: "Du er ferdig med dette dokumentet.",
    Deutsch: "Sie sind mit diesem Dokument fertig.",
    Français: "Vous avez terminé avec ce document.",
    Español: "Has terminado con este documento.",
  },
  "Start this action": {
    Türkçe: "Bu göreve başla",
    Norsk: "Start denne handlingen",
    Deutsch: "Diese Aufgabe starten",
    Français: "Démarrer cette action",
    Español: "Iniciar esta acción",
  },
  "Activity Log": {
    Türkçe: "Etkinlik Günlüğü",
    Norsk: "Aktivitetslogg",
    Deutsch: "Aktivitätsprotokoll",
    Français: "Journal d'activité",
    Español: "Registro de actividad",
  },
  Guidance: {
    Türkçe: "Rehberlik",
    Norsk: "Veiledning",
    Deutsch: "Anleitung",
    Français: "Guide",
    Español: "Guía",
  },
  "Your Progress": {
    Türkçe: "İlerlemeniz",
    Norsk: "Fremgangen din",
    Deutsch: "Ihr Fortschritt",
    Français: "Votre progression",
    Español: "Tu progreso",
  },
  completed: {
    Türkçe: "tamamlandı",
    Norsk: "fullført",
    Deutsch: "erledigt",
    Français: "terminées",
    Español: "completadas",
  },
  blocked: {
    Türkçe: "bloke",
    Norsk: "blokkert",
    Deutsch: "blockiert",
    Français: "bloquées",
    Español: "bloqueadas",
  },
  "Upcoming Deadlines": {
    Türkçe: "Yaklaşan son tarihler",
    Norsk: "Kommende frister",
    Deutsch: "Anstehende Fristen",
    Français: "Échéances à venir",
    Español: "Próximos plazos",
  },
  "No upcoming deadlines.": {
    Türkçe: "Yaklaşan son tarih yok.",
    Norsk: "Ingen kommende frister.",
    Deutsch: "Keine anstehenden Fristen.",
    Français: "Aucune échéance à venir.",
    Español: "No hay plazos próximos.",
  },
  "View all": {
    Türkçe: "Tümünü gör",
    Norsk: "Vis alle",
    Deutsch: "Alle anzeigen",
    Français: "Tout afficher",
    Español: "Ver todo",
  },
  "Recent Activity": {
    Türkçe: "Son etkinlik",
    Norsk: "Nylig aktivitet",
    Deutsch: "Letzte Aktivität",
    Français: "Activité récente",
    Español: "Actividad reciente",
  },
  "Select a task to see how to complete it.": {
    Türkçe: "Nasıl tamamlanacağını görmek için bir görev seçin.",
    Norsk: "Velg en oppgave for å se hvordan du fullfører den.",
    Deutsch: "Wählen Sie eine Aufgabe aus, um zu sehen, wie sie erledigt wird.",
    Français: "Sélectionnez une tâche pour voir comment l'accomplir.",
    Español: "Selecciona una tarea para ver cómo completarla.",
  },
  "Updated automatically based on your progress": {
    Türkçe: "İlerlemenize göre otomatik olarak güncellendi",
    Norsk: "Oppdatert automatisk basert på fremgangen din",
    Deutsch: "Automatisch basierend auf Ihrem Fortschritt aktualisiert",
    Français: "Mis à jour automatiquement selon votre progression",
    Español: "Actualizado automáticamente según tu progreso",
  },
};

const LOCALE: Record<UILanguage, string> = {
  Türkçe: "tr-TR",
  Norsk: "nb-NO",
  Deutsch: "de-DE",
  Français: "fr-FR",
  Español: "es-ES",
};

export function localeFor(language: string | undefined): string | undefined {
  return language ? LOCALE[language as UILanguage] : undefined;
}

export function t(key: string, language: string | undefined): string {
  const dict = STRINGS[key];
  if (!dict) return key;
  const value = language ? dict[language as UILanguage] : undefined;
  return value ?? key;
}

const DETECTED_COUNT: Record<UILanguage, (n: number) => string> = {
  Türkçe: (n) => `${n} tespit edildi`,
  Norsk: (n) => `${n} oppdaget`,
  Deutsch: (n) => `${n} erkannt`,
  Français: (n) => `${n} détecté${n > 1 ? "s" : ""}`,
  Español: (n) => `${n} detectado${n > 1 ? "s" : ""}`,
};

export function tDetectedCount(n: number, language: string | undefined): string {
  const fn = language ? DETECTED_COUNT[language as UILanguage] : undefined;
  return fn ? fn(n) : `${n} detected`;
}

const PROGRESS_DONE: Record<UILanguage, (done: number, total: number) => string> = {
  Türkçe: (done, total) => `${total} görevden ${done} tamamlandı`,
  Norsk: (done, total) => `${done} av ${total} fullført`,
  Deutsch: (done, total) => `${done} von ${total} erledigt`,
  Français: (done, total) => `${done} sur ${total} terminées`,
  Español: (done, total) => `${done} de ${total} completadas`,
};

export function tProgressDone(done: number, total: number, language: string | undefined): string {
  const fn = language ? PROGRESS_DONE[language as UILanguage] : undefined;
  return fn ? fn(done, total) : `${done} of ${total} done`;
}

const TASK_LABEL: Record<UILanguage, (n: number) => string> = {
  Türkçe: (n) => `Görev ${n}`,
  Norsk: (n) => `Oppgave ${n}`,
  Deutsch: (n) => `Aufgabe ${n}`,
  Français: (n) => `Tâche ${n}`,
  Español: (n) => `Tarea ${n}`,
};

export function tTaskLabel(n: number, language: string | undefined): string {
  const fn = language ? TASK_LABEL[language as UILanguage] : undefined;
  return fn ? fn(n) : `Task ${n}`;
}

const TASKS_COUNT: Record<UILanguage, (n: number) => string> = {
  Türkçe: (n) => `${n} görev`,
  Norsk: (n) => `${n} oppgaver`,
  Deutsch: (n) => `${n} Aufgaben`,
  Français: (n) => `${n} tâches`,
  Español: (n) => `${n} tareas`,
};

export function tTasksCount(n: number, language: string | undefined): string {
  const fn = language ? TASKS_COUNT[language as UILanguage] : undefined;
  return fn ? fn(n) : `${n} tasks`;
}

const UNLOCKED_AFTER: Record<UILanguage, (title: string) => string> = {
  Türkçe: (title) => `Otomatik olarak güncellendi — "${title}" görevini tamamladıktan sonra açıldı`,
  Norsk: (title) => `Oppdatert automatisk — låst opp etter at du fullførte "${title}"`,
  Deutsch: (title) => `Automatisch aktualisiert — freigeschaltet, nachdem Sie „${title}" abgeschlossen haben`,
  Français: (title) => `Mise à jour automatique — débloqué après avoir terminé « ${title} »`,
  Español: (title) => `Actualizado automáticamente — desbloqueado después de completar "${title}"`,
};

export function tUnlockedAfter(title: string, language: string | undefined): string {
  const fn = language ? UNLOCKED_AFTER[language as UILanguage] : undefined;
  return fn
    ? fn(title)
    : `Updated automatically — unlocked after you completed "${title}"`;
}
