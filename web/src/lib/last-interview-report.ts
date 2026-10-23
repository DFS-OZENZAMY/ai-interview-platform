/** Dernier bilan Lina conservé dans l’onglet (sessionStorage).
 *  Pas de score inventé : le moteur renvoie un feedback textuel non noté. */

export type TranscriptTurn = { question: string; answer: string };

export type LastInterviewReport = {
  feedback: string;
  transcript: TranscriptTurn[];
  interview_kind: "rh" | "technical";
  job_title: string;
  locale: "fr" | "en";
  status: "completed" | "partial";
  completed_at: string;
  /** Extrait simple du feedback pour le panneau coach du dashboard. */
  coach_priority: string | null;
  coach_recommendation: string | null;
};

const KEY = "lina-last-interview-report";

export function extractCoachHints(feedback: string): {
  coach_priority: string | null;
  coach_recommendation: string | null;
} {
  const text = feedback.trim();
  if (!text) return { coach_priority: null, coach_recommendation: null };
  // Heuristique légère : première phrase = priorité, reste = recommandation.
  const sentences = text.split(/(?<=[.!?…])\s+/).map((s) => s.trim()).filter(Boolean);
  const priority = sentences[0]?.slice(0, 160) || null;
  const recommendation = sentences.slice(1).join(" ").slice(0, 400) || text.slice(0, 280);
  return { coach_priority: priority, coach_recommendation: recommendation };
}

export function saveLastInterviewReport(report: LastInterviewReport): void {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(report));
  } catch {
    /* quota / mode privé */
  }
}

export function readLastInterviewReport(): LastInterviewReport | null {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<LastInterviewReport>;
    if (typeof data.feedback !== "string" || !data.feedback.trim()) return null;
    if (data.interview_kind !== "rh" && data.interview_kind !== "technical") return null;
    return {
      feedback: data.feedback,
      transcript: Array.isArray(data.transcript) ? data.transcript.filter(
        (t): t is TranscriptTurn =>
          !!t && typeof t.question === "string" && typeof t.answer === "string"
      ) : [],
      interview_kind: data.interview_kind,
      job_title: typeof data.job_title === "string" ? data.job_title : "",
      locale: data.locale === "en" ? "en" : "fr",
      status: data.status === "partial" ? "partial" : "completed",
      completed_at: typeof data.completed_at === "string" ? data.completed_at : new Date().toISOString(),
      coach_priority: typeof data.coach_priority === "string" ? data.coach_priority : null,
      coach_recommendation: typeof data.coach_recommendation === "string" ? data.coach_recommendation : null,
    };
  } catch {
    return null;
  }
}

export function buildReportFromSession(input: {
  feedback: string;
  transcript?: TranscriptTurn[];
  config: { family: "rh" | "technical"; locale: "fr" | "en"; jobTitle: string };
  status?: "completed" | "partial";
}): LastInterviewReport {
  const hints = extractCoachHints(input.feedback);
  return {
    feedback: input.feedback.trim(),
    transcript: input.transcript ?? [],
    interview_kind: input.config.family,
    job_title: input.config.jobTitle,
    locale: input.config.locale,
    status: input.status ?? "completed",
    completed_at: new Date().toISOString(),
    coach_priority: hints.coach_priority,
    coach_recommendation: hints.coach_recommendation,
  };
}
