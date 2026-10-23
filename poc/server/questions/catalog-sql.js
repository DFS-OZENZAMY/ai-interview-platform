/**
 * Catalogue S2-03 en accès SQL direct (PostgreSQL auto-hébergé contenant les migrations 0001-0006 d'Achraf).
 * Appelle uniquement les fonctions de sélection officielles ; ne lit jamais les attendus ni les grilles privées.
 * La connexion doit avoir le droit EXECUTE sur ces fonctions (compte serveur, jamais exposé au navigateur).
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function catalogSql(pool, { engineActorId }) {
  if (!UUID.test(engineActorId || "")) throw new Error("QB_ENGINE_ACTOR_ID (UUID de l'identité moteur) est requis pour catalog-sql");
  const q = (text, params) => pool.query(text, params);
  return {
    name: "catalog-sql",
    async open({ candidateKey, locale }) {
      const r = await q("SELECT question_bank.open_interview_session($1::uuid, $2::uuid, $3::text) AS id", [candidateKey, engineActorId, locale]);
      return r.rows[0].id;
    },
    async next(ref, f) {
      try {
        const r = await q("SELECT * FROM question_bank.next_interview_question($1::uuid, $2::uuid, $3::text, $4::text, $5::smallint)",
          [ref, engineActorId, f.family ?? null, f.category ?? null, f.difficulty ?? null]);
        const s = r.rows[0]; if (!s) return null;
        const meta = await q("SELECT family, category_code, difficulty FROM question_bank.published_questions_safe WHERE code = $1 AND locale = $2", [s.question_code, s.locale]);
        const m = meta.rows[0] || {};
        return { code: s.question_code, prompt: s.prompt_text, turn: s.turn_index, locale: s.locale, questionVersionId: s.question_version_id, rubricVersionId: s.rubric_version_id, family: m.family, category: m.category_code, difficulty: m.difficulty };
      } catch (e) {
        if (/No eligible published question/.test(e.message)) return null;
        throw e;
      }
    },
    async complete(ref) {
      try { await q("SELECT question_bank.complete_interview_session($1::uuid, $2::uuid)", [ref, engineActorId]); } catch (e) { if (!/Only the owning engine/.test(e.message)) throw e; }
    },
  };
}
