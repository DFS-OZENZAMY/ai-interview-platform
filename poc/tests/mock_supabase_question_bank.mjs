/**
 * Faux Supabase pour tester l'adaptateur catalog-http SANS accès au vrai projet :
 *  - /auth/v1/token?grant_type=password : connexion du compte moteur (rôle interview_engine) ;
 *  - /functions/v1/question-bank/engine/... : mêmes routes et codes que l'Edge Function d'Achraf,
 *    qui appellent ses VRAIES fonctions SQL question_bank.* sur une base PostgreSQL locale.
 * Usage : DATABASE_URL=… CERT=cert.pem KEY=key.pem PORT=9443 node mock_supabase_question_bank.mjs
 */
import { createServer } from "node:https";
import { readFileSync } from "node:fs";
import pg from "pg";
const { DATABASE_URL, CERT, KEY, PORT = 9443 } = process.env;
const pool = new pg.Pool({ connectionString: DATABASE_URL });
const PUBLISHABLE = "sb_publishable_test", ENGINE = { email: "engine@test.local", password: "engine-pass", id: "22222222-3333-4444-8555-666666666666", token: "tok-engine" };
const CANDIDATE_TOKEN = "tok-candidate";
const json = (res, status, data) => { res.writeHead(status, { "content-type": "application/json" }); res.end(JSON.stringify(data)); };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
createServer({ cert: readFileSync(CERT), key: readFileSync(KEY) }, async (req, res) => {
  const chunks = []; for await (const c of req) chunks.push(c);
  const input = chunks.length ? JSON.parse(Buffer.concat(chunks).toString() || "{}") : {};
  const url = new URL(req.url, "https://localhost");
  try {
    if (url.pathname === "/auth/v1/token") {
      if (req.headers.apikey !== PUBLISHABLE) return json(res, 401, { error: "invalid_apikey" });
      if (input.email === ENGINE.email && input.password === ENGINE.password) return json(res, 200, { access_token: ENGINE.token, expires_in: 3600 });
      return json(res, 400, { error: "invalid_grant" });
    }
    const m = url.pathname.match(/^\/functions\/v1\/question-bank\/(.*)$/); if (!m) return json(res, 404, { error: "not_found" });
    const auth = /^Bearer (\S+)$/.exec(req.headers.authorization || ""); if (!auth) return json(res, 401, { error: "unauthorized" });
    const isEngine = auth[1] === ENGINE.token; if (!isEngine && auth[1] !== CANDIDATE_TOKEN) return json(res, 401, { error: "unauthorized" });
    const ep = m[1].split("/").filter(Boolean);
    if (!isEngine) return json(res, 403, { error: "forbidden" });   // comme canEngine(role) côté Edge
    if (req.method === "POST" && ep.join("/") === "engine/sessions") {
      if (!UUID.test(input.candidate_user_id || "") || !["fr", "en"].includes(input.locale)) return json(res, 400, { error: "invalid_session" });
      const r = await pool.query("SELECT question_bank.open_interview_session($1::uuid,$2::uuid,$3::text) AS session_id", [input.candidate_user_id, ENGINE.id, input.locale]);
      return json(res, 201, { session_id: r.rows[0].session_id, locale: input.locale });
    }
    if (req.method === "POST" && ep.length === 5 && ep[0] === "engine" && ep[3] === "questions" && ep[4] === "next") {
      try {
        const r = await pool.query("SELECT * FROM question_bank.next_interview_question($1::uuid,$2::uuid,$3::text,$4::text,$5::smallint)", [ep[2], ENGINE.id, input.family ?? null, input.category ?? null, input.difficulty ?? null]);
        return r.rows.length ? json(res, 201, { snapshot: r.rows[0] }) : json(res, 404, { error: "no_question" });
      } catch (e) { return /No eligible/.test(e.message) ? json(res, 404, { error: "no_question" }) : json(res, 409, { error: "conflict" }); }
    }
    if (req.method === "POST" && ep.length === 4 && ep[0] === "engine" && ep[3] === "complete") {
      await pool.query("SELECT question_bank.complete_interview_session($1::uuid,$2::uuid)", [ep[2], ENGINE.id]);
      return json(res, 200, { session_id: ep[2], status: "completed" });
    }
    return json(res, 404, { error: "not_found" });
  } catch (e) { return json(res, 500, { error: "server_error" }); }
}).listen(PORT, "127.0.0.1", () => console.log("faux Supabase prêt sur https://localhost:" + PORT));
