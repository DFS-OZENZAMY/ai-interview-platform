/**
 * Minimal S2-04 interview session orchestration using the S2-03 protected catalog.
 * This is deterministic question selection, not AI-generated follow-ups or scoring.
 * Must run server-side with the Supabase Auth interview_engine/admin identity.
 */
export class NoPublishedQuestionsError extends Error {
  constructor() {
    super("no_published_questions_match_filters");
    this.name = "NoPublishedQuestionsError";
  }
}

export function createInterviewSessionOrchestrator(questionBank) {
  if (!questionBank ||
      !["listPublished", "createSession", "nextQuestion", "getSessionQuestions", "completeSession"].every(
        name => typeof questionBank[name] === "function")) {
    throw new TypeError("A connected and authenticated S2-03 question-bank adapter is required");
  }

  const validateSelection = selection => {
    if (!selection || typeof selection !== "object" || Array.isArray(selection))
      throw new TypeError("Selection filters must be an object");
    const {family, category, difficulty} = selection;
    if (family !== undefined && !["rh","transversal","technical"].includes(family))
      throw new TypeError("Invalid interview family");
    if (category !== undefined && (typeof category !== "string" || !/^[a-z_]{1,64}$/.test(category)))
      throw new TypeError("Invalid question category");
    if (difficulty !== undefined && (!Number.isInteger(difficulty) || difficulty < 1 || difficulty > 4))
      throw new TypeError("Invalid interview difficulty");
    return {family,category,difficulty};
  };

  return Object.freeze({
    async start({candidateUserId, locale = "fr", selection = {}}) {
      if (locale !== "fr" && locale !== "en") throw new TypeError("Invalid interview locale");
      const filters=validateSelection(selection);
      // Ensure there is at least one approved, current published question
      // before opening a session. No draft question is ever selected.
      const available=await questionBank.listPublished({...filters,locale,limit:1});
      if (!available?.items?.length) throw new NoPublishedQuestionsError();
      const session=await questionBank.createSession({candidate_user_id:candidateUserId,locale});
      const next=await questionBank.nextQuestion(session.session_id,filters);
      return Object.freeze({sessionId:session.session_id,locale,turn:next.snapshot});
    },
    async next(sessionId,selection={}) {
      const next=await questionBank.nextQuestion(sessionId,validateSelection(selection));
      return next.snapshot;
    },
    async finish(sessionId) {
      return questionBank.completeSession(sessionId);
    },
    async replay(sessionId) {
      const result=await questionBank.getSessionQuestions(sessionId);
      return result.items;
    },
  });
}
