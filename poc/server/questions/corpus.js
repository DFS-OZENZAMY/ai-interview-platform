/**
 * Source « corpus-preview » : les 120 questions d'Achraf (data/question-bank, statut DRAFT), servies par le serveur.
 * Comme son laboratoire local : AUCUNE publication, aucun changement de statut, badge « en cours de validation ».
 * Seuls la question, ses métadonnées et ses pistes de relance humaines sont utilisés ; les attendus, variantes,
 * signaux d'alerte et notes d'évaluation ne quittent jamais ce module (ni vers le navigateur, ni vers l'IA).
 */
import rh1 from "../../../data/question-bank/rh_questions.json" with { type: "json" };
import rh2 from "../../../data/question-bank/rh_questions_expansion.json" with { type: "json" };
import t1 from "../../../data/question-bank/technical_questions.json" with { type: "json" };
import t2 from "../../../data/question-bank/technical_questions_expansion_part1.json" with { type: "json" };
import t3 from "../../../data/question-bank/technical_questions_expansion_part2.json" with { type: "json" };

const SAFE = [rh1, rh2, t1, t2, t3].flatMap((f) => f.questions).map((q) => ({
  code: q.code, family: q.family, category: q.category_code, difficulty: q.difficulty, competency: q.primary_competency,
  prompt: { fr: q.localizations?.fr?.prompt, en: q.localizations?.en?.prompt },
  seeds: { fr: q.localizations?.fr?.followup_seeds || [], en: q.localizations?.en?.followup_seeds || [] },
})).filter((q) => q.prompt.fr && q.prompt.en);

export const corpusStats = () => ({ total: SAFE.length, rh: SAFE.filter((q) => q.family === "rh").length, technical: SAFE.filter((q) => q.family === "technical").length });

export function corpusPreview({ random = Math.random } = {}) {
  return {
    name: "corpus-preview", draft: true,
    async open({ locale }) { return `${crypto.randomUUID()}|${locale === "en" ? "en" : "fr"}`; },
    async next(ref, f, { exclude = [] } = {}) {
      const locale = String(ref).split("|")[1] || "fr", seen = new Set(exclude);
      const pool = SAFE.filter((q) => !seen.has(q.code) && (!f.family || q.family === f.family) && (!f.category || q.category === f.category) && (!f.difficulty || q.difficulty === f.difficulty));
      if (!pool.length) return null;
      const q = pool[Math.floor(random() * pool.length)];
      return { code: q.code, prompt: q.prompt[locale], family: q.family, category: q.category, difficulty: q.difficulty, seeds: q.seeds[locale].slice(0, 3), draft: true, turn: exclude.length + 1, locale };
    },
    async complete() {},
  };
}

/** Questions au format de l'API locale d'Achraf (public_question / preview_question) : jamais d'attendus ni de barème. */
export const corpusItems = () => SAFE;
