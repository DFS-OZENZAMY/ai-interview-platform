/** Pure input and authorization checks used by the deployed Edge Function.
 * Auth identities must first be verified by Supabase Auth getUser(accessToken).
 * Roles are read ONLY from server-managed app_metadata.
 */
export function roleFromVerifiedUser(user: {app_metadata?: Record<string, unknown>}): unknown {
  return user.app_metadata?.ai_interview_role ?? null;
}
export function canEngine(role: unknown): boolean {
  return role === "interview_engine" || role === "admin";
}
export function canEvaluate(role: unknown): boolean {
  return role === "evaluator" || role === "admin";
}
export function validLocale(value: unknown): value is "fr"|"en" {
  return value === "fr" || value === "en";
}
export function validCode(value: unknown): value is string {
  return typeof value === "string" && /^(RH|TECH)-[0-9]{3}$/.test(value);
}
export function validUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
/** Defensive schema projection: never rely on SELECT * when serving candidates. */
export function safeQuestion(row: Record<string, unknown>) {
  return {
    code: row.code, version: row.version, family: row.family,
    category_code: row.category_code, question_type: row.question_type,
    difficulty: row.difficulty, locale: row.locale, prompt: row.prompt,
    primary_competency: row.primary_competency,
  };
}
export function safeCandidateTurn(row: Record<string, unknown>) {
  return {
    turn_index: row.turn_index, question_code: row.question_code,
    locale: row.locale, prompt_text: row.prompt_text,
  };
}
