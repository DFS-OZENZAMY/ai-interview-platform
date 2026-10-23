// S2-03 server-only question-bank bridge. JWT required at gateway and Auth.
// Never use this function as a browser-facing evaluator channel.
// No writes, no dynamic SQL, no secret material in responses.
import { createClient } from "npm:@supabase/supabase-js@2.76.1";
import postgres from "npm:postgres@3.4.7";
import { canEngine, canEvaluate, roleFromVerifiedUser, validUuid, validCode, validLocale, safeQuestion, safeCandidateTurn } from "./policy.ts";

const projectUrl = Deno.env.get("SUPABASE_URL") ?? "";
const publishable = (() => {
  try {
    const keys = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}");
    return keys.default ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  } catch { return Deno.env.get("SUPABASE_ANON_KEY") ?? ""; }
})();
const dbUrl = Deno.env.get("SUPABASE_DB_URL") ?? "";
const sql = dbUrl ? postgres(dbUrl, { prepare: false, max: 1, idle_timeout: 3, connect_timeout: 5 }) : null;
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
async function readSmallJson(req: Request): Promise<Record<string, unknown> | null> {
  const body = await req.text();
  if (body.length > 2048) return null;
  try { const value = JSON.parse(body); return value && typeof value === "object" && !Array.isArray(value) ? value : null; }
  catch { return null; }
}

Deno.serve(async (req: Request) => {
  if (req.method !== "GET" && req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (!sql || !projectUrl || !publishable) return json({ error: "configuration_unavailable" }, 503);
  const authorization = req.headers.get("authorization") ?? "";
  const match = /^Bearer (\S+)$/.exec(authorization);
  if (!match) return json({ error: "unauthorized" }, 401);
  const auth = createClient(projectUrl, publishable, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  const { data, error } = await auth.auth.getUser(match[1]);
  if (error || !data.user) return json({ error: "unauthorized" }, 401);
  // app_metadata is server-managed. Do not inspect mutable user_metadata for roles.
  const role = roleFromVerifiedUser(data.user);
  const url = new URL(req.url);
  const path = url.pathname.split("/").filter(Boolean);
  // Supabase routes /functions/v1/question-bank/...; only trailing path matters.
  const endpoint = path.slice(path.indexOf("question-bank") + 1);
  const locale = url.searchParams.get("locale") ?? "fr";
  if (!validLocale(locale)) return json({ error: "invalid_locale" }, 400);
  const family = url.searchParams.get("family");
  if (family && !["rh", "transversal", "technical"].includes(family))
    return json({ error: "invalid_family" }, 400);
  const category = url.searchParams.get("category");
  const difficultyString = url.searchParams.get("difficulty");
  const difficulty = difficultyString === null ? null : Number(difficultyString);
  if (difficulty !== null && (![1, 2, 3, 4].includes(difficulty) || !/^[1-4]$/.test(difficultyString!)))
    return json({ error: "invalid_difficulty" }, 400);
  const rawLimit = url.searchParams.get("limit") ?? "20";
  if (!/^[1-9][0-9]?$|^100$/.test(rawLimit)) return json({ error: "invalid_limit" }, 400);
  const limit = Number(rawLimit);
  const after = url.searchParams.get("cursor");
  if (after && !validCode(after)) return json({ error: "invalid_cursor" }, 400);

  try {
    if (req.method === "GET" && endpoint.length === 1 && endpoint[0] === "questions") {
      // Candidate users must not enumerate future interview prompts.
      if (!canEngine(role)) return json({ error: "forbidden" }, 403);
      // The view includes only approved current published revisions.
      // Fetch metadata only; private expected answer fields are never selected here.
      const rows = await sql`
        SELECT code, version, family, category_code, question_type,
          difficulty, locale, prompt, primary_competency
        FROM question_bank.published_questions_safe
        WHERE locale = ${locale}
          AND (${family}::text IS NULL OR family = ${family})
          AND (${category}::text IS NULL OR category_code = ${category})
          AND (${difficulty}::int IS NULL OR difficulty = ${difficulty})
          AND (${after}::text IS NULL OR code > ${after})
        ORDER BY code ASC LIMIT ${limit + 1}
      `;
      const more = rows.length > limit;
      const items = rows.slice(0, limit).map(safeQuestion);
      return json({ items, next_cursor: more ? items[items.length - 1].code : null });
    }
    if (req.method === "GET" && endpoint.length === 3 && endpoint[0] === "engine" && endpoint[1] === "snapshot") {
      if (!canEngine(role)) return json({ error: "forbidden" }, 403);
      const code = endpoint[2];
      if (!validCode(code)) return json({ error: "invalid_code" }, 400);
      const rows = await sql`
        SELECT question_id, question_version_id, rubric_version_id,
          code, version, locale, prompt, primary_competency, difficulty,
          family, category_code, question_type
        FROM question_bank.published_questions_safe
        WHERE code = ${code} AND locale = ${locale} LIMIT 1
      `;
      return rows.length ? json({ snapshot: rows[0] }) : json({ error: "not_found" }, 404);
    }

    // Session orchestration is restricted to an authenticated S2-04 engine.
    // SQL functions write versioned snapshots atomically; never store expected answers.
    if (req.method === "POST" && endpoint.join("/") === "engine/sessions") {
      if (!canEngine(role)) return json({ error: "forbidden" }, 403);
      const input = await readSmallJson(req);
      const candidateId = input?.candidate_user_id;
      const requestedLocale = input?.locale ?? "fr";
      if (!validUuid(candidateId) || !validLocale(requestedLocale))
        return json({ error: "invalid_session" }, 400);
      const rows = await sql`
        SELECT question_bank.open_interview_session(
          ${candidateId}::uuid, ${data.user.id}::uuid,
          ${requestedLocale}::text
        ) AS session_id
      `;
      return json({ session_id: rows[0].session_id, locale: requestedLocale }, 201);
    }
    if (req.method === "POST" && endpoint.length === 5 &&
        endpoint[0] === "engine" && endpoint[1] === "sessions" &&
        endpoint[3] === "questions" && endpoint[4] === "next") {
      if (!canEngine(role)) return json({ error: "forbidden" }, 403);
      const sessionId = endpoint[2];
      if (!validUuid(sessionId)) return json({ error: "invalid_session" }, 400);
      const input = await readSmallJson(req);
      if (!input) return json({ error: "invalid_selection" }, 400);
      const rawFamily = input.family ?? null;
      const rawCategory = input.category ?? null;
      const rawDifficulty = input.difficulty ?? null;
      if ((rawFamily !== null && (typeof rawFamily !== "string" || !["rh","transversal","technical"].includes(rawFamily))) ||
          (rawCategory !== null && (typeof rawCategory !== "string" || !/^[a-z_]{1,64}$/.test(rawCategory))) ||
          (rawDifficulty !== null && (typeof rawDifficulty !== "number" || !Number.isInteger(rawDifficulty) || ![1,2,3,4].includes(rawDifficulty)))) {
        return json({ error: "invalid_selection" }, 400);
      }
      const requestedFamily: string | null = typeof rawFamily === "string" ? rawFamily : null;
      const requestedCategory: string | null = typeof rawCategory === "string" ? rawCategory : null;
      const requestedDifficulty: number | null = typeof rawDifficulty === "number" ? rawDifficulty : null;
      const rows = await sql`
        SELECT * FROM question_bank.next_interview_question(
          ${sessionId}::uuid, ${data.user.id}::uuid,
          ${requestedFamily}::text, ${requestedCategory}::text,
          ${requestedDifficulty}::smallint
        )
      `;
      return rows.length ? json({ snapshot: rows[0] }, 201) : json({ error: "no_question" }, 404);
    }
    if (req.method === "POST" && endpoint.length === 4 &&
        endpoint[0] === "engine" && endpoint[1] === "sessions" && endpoint[3] === "questions") {
      if (!canEngine(role)) return json({ error: "forbidden" }, 403);
      const sessionId = endpoint[2];
      if (!validUuid(sessionId)) return json({ error: "invalid_session" }, 400);
      const input = await readSmallJson(req);
      const code = input?.code;
      if (typeof code !== "string" || !validCode(code))
        return json({ error: "invalid_code" }, 400);
      const rows = await sql`
        SELECT * FROM question_bank.append_published_question(
          ${sessionId}::uuid, ${code}::text, ${data.user.id}::uuid
        )
      `;
      return rows.length ? json({ snapshot: rows[0] }, 201) : json({ error: "not_found" }, 404);
    }

    if (req.method === "POST" && endpoint.length === 4 &&
        endpoint[0] === "engine" && endpoint[1] === "sessions" && endpoint[3] === "complete") {
      if (!canEngine(role)) return json({ error: "forbidden" }, 403);
      const sessionId = endpoint[2];
      if (!validUuid(sessionId)) return json({ error: "invalid_session" }, 400);
      await sql`SELECT question_bank.complete_interview_session(
        ${sessionId}::uuid, ${data.user.id}::uuid
      )`;
      return json({ session_id: sessionId, status: "completed" });
    }
    if (req.method === "GET" && endpoint.length === 4 &&
        endpoint[1] === "sessions" && endpoint[3] === "questions" &&
        (endpoint[0] === "engine" || endpoint[0] === "candidate")) {
      const sessionId = endpoint[2];
      if (!validUuid(sessionId)) return json({ error: "invalid_session" }, 400);
      if (endpoint[0] === "engine") {
        if (!canEngine(role)) return json({ error: "forbidden" }, 403);
        const rows = await sql`
          SELECT s.id AS session_id, s.status, q.turn_index, q.question_code,
                 q.question_version_id, q.rubric_version_id, q.locale,
                 q.prompt_text, q.selected_at
          FROM question_bank.interview_sessions s
          JOIN question_bank.interview_question_snapshots q ON q.session_id=s.id
          WHERE s.id=${sessionId}::uuid AND s.engine_actor_id=${data.user.id}::uuid
          ORDER BY q.turn_index
        `;
        return json({ items: rows });
      }
      // Candidate route returns only their own question text, not private IDs.
      const rows = await sql`
        SELECT q.turn_index, q.question_code, q.locale, q.prompt_text
        FROM question_bank.interview_sessions s
        JOIN question_bank.interview_question_snapshots q ON q.session_id=s.id
        WHERE s.id=${sessionId}::uuid AND s.candidate_user_id=${data.user.id}::uuid
        ORDER BY q.turn_index
      `;
      return json({ items: rows.map(safeCandidateTurn) });
    }

    if (req.method === "GET" && endpoint.length === 3 && endpoint[0] === "evaluator" && endpoint[1] === "questions") {
      if (!canEvaluate(role)) return json({ error: "forbidden" }, 403);
      const code = endpoint[2];
      if (!validCode(code)) return json({ error: "invalid_code" }, 400);
      // Sensitive fields are only returned after trusted evaluator authorization.
      const rows = await sql`
        SELECT s.question_id, s.question_version_id, s.rubric_version_id,
          s.code, s.version, s.locale, s.prompt,
          v.expected_elements, v.acceptable_variations, v.red_flags,
          v.evaluation_notes, rv.weights, rv.scale
        FROM question_bank.published_questions_safe s
        JOIN question_bank.question_versions v ON v.id=s.question_version_id
        JOIN question_bank.rubric_versions rv ON rv.id=s.rubric_version_id
        WHERE s.code=${code} AND s.locale=${locale} LIMIT 1
      `;
      return rows.length ? json({ reference: rows[0] }) : json({ error: "not_found" }, 404);
    }
    return json({ error: "not_found" }, 404);
  } catch (e) {
    console.error("question-bank bridge query failed", e instanceof Error ? e.name : "unknown");
    return json({ error: "service_unavailable" }, 503);
  }
});
