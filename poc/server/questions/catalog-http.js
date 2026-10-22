/**
 * Catalogue S2-03 via l'Edge Function Supabase d'Achraf, avec SON client S2-04 (src/integrations/s2-04).
 * Le POC s'authentifie comme compte de service « moteur » (app_metadata.ai_interview_role = interview_engine),
 * attribué par un administrateur Supabase. Jeton obtenu côté serveur, jamais transmis au navigateur.
 */
import { createQuestionBankClient, QuestionBankApiError } from "../../../src/integrations/s2-04/question-bank-client.mjs";

export function catalogHttp({ supabaseUrl, publishableKey, functionUrl, email, password, fetchImpl = fetch }) {
  if (!supabaseUrl || !publishableKey || !email || !password)
    throw new Error("catalog-http exige QB_SUPABASE_URL, QB_PUBLISHABLE_KEY, QB_ENGINE_EMAIL et QB_ENGINE_PASSWORD");
  const base = supabaseUrl.replace(/\/+$/, "");
  let token = null, expiresAt = 0, pending = null;
  async function tokenProvider() {
    if (token && Date.now() < expiresAt - 60_000) return token;
    pending ||= (async () => {
      const r = await fetchImpl(`${base}/auth/v1/token?grant_type=password`, {
        method: "POST", headers: { apikey: publishableKey, "content-type": "application/json" },
        body: JSON.stringify({ email, password }), redirect: "error", cache: "no-store",
      });
      if (!r.ok) throw new QuestionBankApiError(r.status, "engine_login_failed");
      const j = await r.json(); token = j.access_token; expiresAt = Date.now() + (Number(j.expires_in) || 3600) * 1000;
      return token;
    })().finally(() => { pending = null; });
    return pending;
  }
  const bank = createQuestionBankClient({ baseUrl: functionUrl || `${base}/functions/v1/question-bank`, tokenProvider, fetchImpl });
  return {
    name: "catalog-http",
    async open({ candidateKey, locale }) { return (await bank.createSession({ candidate_user_id: candidateKey, locale })).session_id; },
    async next(ref, f) {
      try {
        const { snapshot: s } = await bank.nextQuestion(ref, f);
        return s ? { code: s.question_code, prompt: s.prompt_text, turn: s.turn_index, locale: s.locale, questionVersionId: s.question_version_id, rubricVersionId: s.rubric_version_id, family: /^TECH-/.test(s.question_code) ? "technical" : "rh", category: f.category ?? null, difficulty: f.difficulty ?? null } : null;
      } catch (e) { if (e instanceof QuestionBankApiError && e.status === 404) return null; throw e; }
    },
    async complete(ref) { try { await bank.completeSession(ref); } catch (e) { if (!(e instanceof QuestionBankApiError && e.status < 500)) throw e; } },
  };
}
