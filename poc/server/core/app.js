/**
 * Répétition — cœur applicatif indépendant de l'hébergeur (« plug and play »).
 *
 * Ce module ne connaît ni Cloudflare, ni Node, ni Supabase. Il reçoit des ports :
 * - env.DB : base SQL (interface D1 : prepare().bind().first/all/run, batch, dialect) ;
 * - env.AI : fournisseur d'IA facultatif ({ name, complete({system,user,maxTokens}) }) ;
 * - env.COACH_INVITE_CODE, env.COOKIE_SECURE : configuration.
 * Il n'utilise que des API Web standard (Request, Response, crypto.subtle).
 * Authentification candidat / coach : mot de passe PBKDF2-SHA256, cookie de session HttpOnly.
 * L'IA est facultative : relances et commentaire ; elle ne note jamais.
 *
 * Règles d'accès (cf. docs/architecture/DATA_MODEL.md) :
 * - un candidat n'accède qu'à ses propres données ;
 * - un coach n'accède qu'aux demandes qui lui sont adressées, et à la simulation liée
 *   uniquement si le candidat a consenti au partage et que la demande n'est ni refusée ni annulée.
 * Aucun contenu de réponse n'est journalisé.
 */

import { validateProfile, suggestedSkills, PROFILE_VERSION } from "./profile-contract.js";
import { planSlots, relaxations, candidateUuid, CATEGORY_LABELS } from "../questions/index.js";
import { publicAgent, STYLE_PRESETS } from "../agents.js";

const SESSION_DAYS = 7;
const PBKDF2_ITER = 100000;
const MAX_FIELD = 4000;
const MAX_SESSION_BYTES = 200_000;

/* Schéma (créé au premier appel ; voir aussi poc/migrations/0001_init.sql) */
export const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL, role TEXT NOT NULL CHECK (role IN ('candidate','coach')), pw_hash TEXT NOT NULL, pw_salt TEXT NOT NULL, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS auth_sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS consents (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, purpose TEXT NOT NULL, version TEXT NOT NULL, granted_at TEXT NOT NULL, revoked_at TEXT)`,
  `CREATE TABLE IF NOT EXISTS interview_sessions (id TEXT PRIMARY KEY, candidate_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, status TEXT NOT NULL, overall INTEGER, data TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_candidate ON interview_sessions(candidate_id, created_at)`,
  `CREATE TABLE IF NOT EXISTS coach_profiles (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, bio TEXT NOT NULL DEFAULT '', specialties TEXT NOT NULL DEFAULT '[]', slots TEXT NOT NULL DEFAULT '[]', updated_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS coaching_requests (id TEXT PRIMARY KEY, candidate_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, coach_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, session_id TEXT REFERENCES interview_sessions(id) ON DELETE SET NULL, slot TEXT, message TEXT NOT NULL DEFAULT '', share_consent INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL CHECK (status IN ('pending','accepted','declined','cancelled','done')), created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_requests_coach ON coaching_requests(coach_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_requests_candidate ON coaching_requests(candidate_id)`,
  `CREATE TABLE IF NOT EXISTS coach_notes (id TEXT PRIMARY KEY, request_id TEXT NOT NULL REFERENCES coaching_requests(id) ON DELETE CASCADE, coach_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, content TEXT NOT NULL, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS login_attempts (email TEXT NOT NULL, at TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_login_attempts ON login_attempts(email, at)`,
  `CREATE TABLE IF NOT EXISTS onboarding_drafts (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, step INTEGER NOT NULL, data TEXT NOT NULL, updated_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS candidate_profiles (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, version TEXT NOT NULL, data TEXT NOT NULL, seniority TEXT NOT NULL, target_job TEXT NOT NULL, completed_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS catalog_links (session_id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, source TEXT NOT NULL, catalog_ref TEXT NOT NULL, slots TEXT NOT NULL, asked INTEGER NOT NULL DEFAULT 0, turns TEXT NOT NULL DEFAULT '[]', status TEXT NOT NULL CHECK (status IN ('active','done')), created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS agent_voices (agent_id TEXT PRIMARY KEY, voice_id TEXT NOT NULL, voice_name TEXT NOT NULL, source TEXT NOT NULL, updated_by TEXT, updated_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS agent_voice_map (agent_id TEXT NOT NULL, lang TEXT NOT NULL, voice_id TEXT NOT NULL, voice_name TEXT NOT NULL, accent TEXT NOT NULL DEFAULT '', source TEXT NOT NULL, updated_by TEXT, updated_at TEXT NOT NULL, PRIMARY KEY (agent_id, lang))`,
  `INSERT INTO agent_voice_map (agent_id, lang, voice_id, voice_name, accent, source, updated_by, updated_at) SELECT agent_id, 'fr', voice_id, voice_name, '', source, updated_by, updated_at FROM agent_voices WHERE true ON CONFLICT DO NOTHING`,
  `DELETE FROM agent_voices`,   // migration faite une seule fois : une voix retirée ne doit pas revenir au redémarrage
  `CREATE TABLE IF NOT EXISTS custom_agents (id TEXT PRIMARY KEY, name TEXT NOT NULL, title TEXT NOT NULL, description TEXT NOT NULL, color TEXT NOT NULL, preset TEXT NOT NULL, greeting_fr TEXT NOT NULL, greeting_en TEXT NOT NULL, created_by TEXT, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS audit_events (id TEXT PRIMARY KEY, actor_user_id TEXT, action TEXT NOT NULL, entity_type TEXT, entity_id TEXT, occurred_at TEXT NOT NULL)`,
];
let schemaReady = null;
function ensureSchema(env) {
  if (!schemaReady) schemaReady = env.DB.ensureSchema(SCHEMA).catch((e) => { schemaReady = null; throw e; });
  return schemaReady;
}

/* Utilitaires */
const now = () => new Date().toISOString();
const uid = (p) => `${p}_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
const clip = (t, n = MAX_FIELD) => String(t ?? "").slice(0, n);
const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const fromB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

class HttpError extends Error { constructor(status, code, message) { super(message || code); this.status = status; this.code = code; } }
const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers } });

async function hashPassword(password, saltB64) {
  const salt = saltB64 ? fromB64(saltB64) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: PBKDF2_ITER }, key, 256);
  return { hash: b64(bits), salt: b64(salt) };
}
function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
const sha256 = async (s) => hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));

function cookie(req, name) {
  const m = (req.headers.get("cookie") || "").match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}
let COOKIE_SECURE = true;
const sessionCookie = (value, maxAge) => `sid=${value}; Path=/; HttpOnly;${COOKIE_SECURE ? " Secure;" : ""} SameSite=Lax; Max-Age=${maxAge}`;

async function audit(env, actor, action, type, id) {
  await env.DB.prepare("INSERT INTO audit_events (id, actor_user_id, action, entity_type, entity_id, occurred_at) VALUES (?,?,?,?,?,?)")
    .bind(uid("ev"), actor, action, type, id, now()).run();
}

async function currentUser(req, env) {
  const token = cookie(req, "sid");
  if (!token) return null;
  const row = await env.DB.prepare(
    "SELECT u.id, u.email, u.name, u.role, s.expires_at FROM auth_sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?"
  ).bind(await sha256(token)).first();
  if (!row || row.expires_at < now()) return null;
  return { id: row.id, email: row.email, name: row.name, role: row.role };
}
function need(user, role) {
  if (!user) throw new HttpError(401, "unauthenticated", "Connectez-vous pour continuer.");
  if (role && user.role !== role) throw new HttpError(403, "forbidden", "Cette action n’est pas autorisée pour votre profil.");
  return user;
}
async function body(req) {
  try { return await req.json(); } catch { throw new HttpError(400, "bad_json", "Requête invalide."); }
}

/* Authentification */
async function register(req, env) {
  const b = await body(req);
  const email = clip(b.email, 200).trim().toLowerCase();
  const name = clip(b.name, 80).trim();
  const role = b.role === "coach" ? "coach" : "candidate";
  const password = String(b.password ?? "");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new HttpError(400, "invalid_email", "Adresse e-mail invalide.");
  if (name.length < 2) throw new HttpError(400, "invalid_name", "Indiquez votre nom (2 caractères minimum).");
  if (password.length < 8) throw new HttpError(400, "weak_password", "Le mot de passe doit contenir au moins 8 caractères.");
  if (role === "coach") {
    if (!env.COACH_INVITE_CODE) throw new HttpError(403, "coach_signup_closed", "L’inscription des coachs n’est pas encore ouverte sur cet environnement.");
    if (!safeEqual(String(b.inviteCode ?? ""), env.COACH_INVITE_CODE)) throw new HttpError(403, "bad_invite", "Code d’invitation coach incorrect.");
  } else if (!b.consent) {
    throw new HttpError(400, "consent_required", "Le consentement au traitement de vos réponses est nécessaire.");
  }
  if (await env.DB.prepare("SELECT 1 FROM users WHERE email = ?").bind(email).first()) throw new HttpError(409, "email_taken", "Un compte existe déjà avec cette adresse.");

  const id = uid("u");
  const { hash, salt } = await hashPassword(password);
  const t = now();
  const stmts = [env.DB.prepare("INSERT INTO users (id, email, name, role, pw_hash, pw_salt, created_at) VALUES (?,?,?,?,?,?,?)").bind(id, email, name, role, hash, salt, t)];
  if (role === "candidate") stmts.push(env.DB.prepare("INSERT INTO consents (id, user_id, purpose, version, granted_at) VALUES (?,?,?,?,?)").bind(uid("c"), id, "processing", "consent-v0.1", t));
  else stmts.push(env.DB.prepare("INSERT INTO coach_profiles (user_id, updated_at) VALUES (?,?)").bind(id, t));
  await env.DB.batch(stmts);
  await audit(env, id, "register", "user", id);
  return startSession(env, { id, email, name, role }, 201);
}

async function login(req, env) {
  const b = await body(req);
  const email = clip(b.email, 200).trim().toLowerCase();
  const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const { n } = await env.DB.prepare("SELECT COUNT(*) AS n FROM login_attempts WHERE email = ? AND at > ?").bind(email, since).first();
  if (Number(n) >= 8) throw new HttpError(429, "too_many_attempts", "Trop de tentatives. Réessayez dans 15 minutes.");
  const u = await env.DB.prepare("SELECT id, email, name, role, pw_hash, pw_salt FROM users WHERE email = ?").bind(email).first();
  const check = await hashPassword(String(b.password ?? ""), u ? u.pw_salt : undefined);
  if (!u || !safeEqual(check.hash, u.pw_hash)) {
    await env.DB.prepare("INSERT INTO login_attempts (email, at) VALUES (?,?)").bind(email, now()).run();
    throw new HttpError(401, "bad_credentials", "E-mail ou mot de passe incorrect.");
  }
  await env.DB.prepare("DELETE FROM login_attempts WHERE email = ?").bind(email).run();
  return startSession(env, { id: u.id, email: u.email, name: u.name, role: u.role });
}

async function startSession(env, user, status = 200) {
  const token = b64(crypto.getRandomValues(new Uint8Array(32))).replace(/[+/=]/g, "");
  const expires = new Date(Date.now() + SESSION_DAYS * 864e5).toISOString();
  await env.DB.batch([
    env.DB.prepare("INSERT INTO auth_sessions (token_hash, user_id, expires_at) VALUES (?,?,?)").bind(await sha256(token), user.id, expires),
    env.DB.prepare("DELETE FROM auth_sessions WHERE expires_at < ?").bind(now()),
  ]);
  return json({ user: { ...user, isAdmin: isAdmin(user, env) } }, status, { "set-cookie": sessionCookie(token, SESSION_DAYS * 86400) });
}

async function logout(req, env) {
  const token = cookie(req, "sid");
  if (token) await env.DB.prepare("DELETE FROM auth_sessions WHERE token_hash = ?").bind(await sha256(token)).run();
  return json({ ok: true }, 200, { "set-cookie": sessionCookie("", 0) });
}

async function deleteAccount(user, env) {
  await audit(env, user.id, "delete_account", "user", user.id);
  await env.DB.batch([
    env.DB.prepare("DELETE FROM coach_notes WHERE request_id IN (SELECT id FROM coaching_requests WHERE candidate_id = ? OR coach_id = ?)").bind(user.id, user.id),
    env.DB.prepare("DELETE FROM coaching_requests WHERE candidate_id = ? OR coach_id = ?").bind(user.id, user.id),
    env.DB.prepare("DELETE FROM catalog_links WHERE user_id = ?").bind(user.id),
    env.DB.prepare("DELETE FROM interview_sessions WHERE candidate_id = ?").bind(user.id),
    env.DB.prepare("DELETE FROM consents WHERE user_id = ?").bind(user.id),
    env.DB.prepare("DELETE FROM onboarding_drafts WHERE user_id = ?").bind(user.id),
    env.DB.prepare("DELETE FROM candidate_profiles WHERE user_id = ?").bind(user.id),
    env.DB.prepare("DELETE FROM coach_profiles WHERE user_id = ?").bind(user.id),
    env.DB.prepare("DELETE FROM auth_sessions WHERE user_id = ?").bind(user.id),
    env.DB.prepare("DELETE FROM users WHERE id = ?").bind(user.id),
  ]);
  return json({ ok: true }, 200, { "set-cookie": sessionCookie("", 0) });
}

/* Simulations (candidat) */
async function listSessions(user, env) {
  const { results } = await env.DB.prepare("SELECT data FROM interview_sessions WHERE candidate_id = ? ORDER BY created_at").bind(user.id).all();
  return json({ sessions: results.map((r) => JSON.parse(r.data)) });
}
async function saveSession(req, user, env, id) {
  const raw = await req.text();
  if (raw.length > MAX_SESSION_BYTES) throw new HttpError(413, "too_large", "Simulation trop volumineuse.");
  let s; try { s = JSON.parse(raw); } catch { throw new HttpError(400, "bad_json", "Requête invalide."); }
  if (!/^s_[a-z0-9]{4,32}$/i.test(id) || s.id !== id) throw new HttpError(400, "bad_id", "Identifiant de simulation invalide.");
  if (!["in_progress", "interrupted", "processing", "evaluated", "not_evaluable"].includes(s.status)) throw new HttpError(400, "bad_status", "Statut invalide.");
  const owner = await env.DB.prepare("SELECT candidate_id FROM interview_sessions WHERE id = ?").bind(id).first();
  if (owner && owner.candidate_id !== user.id) throw new HttpError(404, "not_found", "Simulation introuvable.");
  const overall = s.evaluation && Number.isFinite(s.evaluation.overall) ? Math.round(s.evaluation.overall) : null;
  const t = now();
  await env.DB.prepare(
    `INSERT INTO interview_sessions (id, candidate_id, status, overall, data, created_at, updated_at) VALUES (?,?,?,?,?,?,?)
     ON CONFLICT(id) DO UPDATE SET status = excluded.status, overall = excluded.overall, data = excluded.data, updated_at = excluded.updated_at`
  ).bind(id, user.id, s.status, overall, raw, t, t).run();
  return json({ ok: true });
}

/* Coachs */
const parseList = (s) => { try { const v = JSON.parse(s); return Array.isArray(v) ? v : []; } catch { return []; } };
async function listCoaches(env) {
  const { results } = await env.DB.prepare(
    "SELECT u.id, u.name, p.bio, p.specialties, p.slots FROM users u JOIN coach_profiles p ON p.user_id = u.id WHERE u.role = 'coach' ORDER BY u.name"
  ).all();
  const t = now();
  return json({ coaches: results.map((c) => ({ id: c.id, name: c.name, bio: c.bio, specialties: parseList(c.specialties), slots: parseList(c.slots).filter((s) => s > t).sort() })) });
}
async function getCoachProfile(user, env) {
  const p = await env.DB.prepare("SELECT bio, specialties, slots FROM coach_profiles WHERE user_id = ?").bind(user.id).first();
  return json({ profile: { bio: p?.bio || "", specialties: parseList(p?.specialties), slots: parseList(p?.slots).sort() } });
}
async function saveCoachProfile(req, user, env) {
  const b = await body(req);
  const specialties = (Array.isArray(b.specialties) ? b.specialties : []).map((s) => clip(s, 40)).slice(0, 10);
  const slots = (Array.isArray(b.slots) ? b.slots : []).filter((s) => !Number.isNaN(Date.parse(s))).map((s) => new Date(s).toISOString()).slice(0, 50);
  await env.DB.prepare(
    `INSERT INTO coach_profiles (user_id, bio, specialties, slots, updated_at) VALUES (?,?,?,?,?)
     ON CONFLICT(user_id) DO UPDATE SET bio = excluded.bio, specialties = excluded.specialties, slots = excluded.slots, updated_at = excluded.updated_at`
  ).bind(user.id, clip(b.bio, 600), JSON.stringify(specialties), JSON.stringify(slots), now()).run();
  return getCoachProfile(user, env);
}

/* Demandes de coaching */
async function createRequest(req, user, env) {
  const b = await body(req);
  if (!b.share) throw new HttpError(400, "share_required", "Autorisez le partage de la simulation pour que le coach puisse la préparer.");
  const coach = await env.DB.prepare("SELECT id FROM users WHERE id = ? AND role = 'coach'").bind(String(b.coachId ?? "")).first();
  if (!coach) throw new HttpError(404, "coach_not_found", "Coach introuvable.");
  const sess = await env.DB.prepare("SELECT id FROM interview_sessions WHERE id = ? AND candidate_id = ?").bind(String(b.sessionId ?? ""), user.id).first();
  if (!sess) throw new HttpError(404, "session_not_found", "Simulation introuvable.");
  if (await env.DB.prepare("SELECT 1 FROM coaching_requests WHERE session_id = ? AND coach_id = ? AND status IN ('pending','accepted')").bind(sess.id, coach.id).first())
    throw new HttpError(409, "duplicate", "Une demande est déjà en cours avec ce coach pour cette simulation.");
  const id = uid("r"), t = now();
  await env.DB.prepare("INSERT INTO coaching_requests (id, candidate_id, coach_id, session_id, slot, message, share_consent, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)")
    .bind(id, user.id, coach.id, sess.id, b.slot ? clip(b.slot, 40) : null, clip(b.message, 1000), 1, "pending", t, t).run();
  await audit(env, user.id, "request_coach", "coaching_request", id);
  return json({ id }, 201);
}

async function listRequests(user, env) {
  const col = user.role === "coach" ? "r.coach_id" : "r.candidate_id";
  const { results } = await env.DB.prepare(
    `SELECT r.id, r.status, r.slot, r.message, r.share_consent, r.created_at, r.updated_at, r.session_id,
            c.name AS candidate_name, k.name AS coach_name, s.overall, s.data
       FROM coaching_requests r
       JOIN users c ON c.id = r.candidate_id
       JOIN users k ON k.id = r.coach_id
       LEFT JOIN interview_sessions s ON s.id = r.session_id
      WHERE ${col} = ? ORDER BY r.created_at DESC`
  ).bind(user.id).all();
  const ids = results.map((r) => r.id);
  let notes = [];
  if (ids.length) notes = (await env.DB.prepare(`SELECT request_id, content, created_at FROM coach_notes WHERE request_id IN (${ids.map(() => "?").join(",")}) ORDER BY created_at`).bind(...ids).all()).results;
  return json({
    requests: results.map((r) => {
      let session = null;
      try { const d = JSON.parse(r.data || "null"); if (d) session = { role: d.role, level: d.level, type: d.type, startedAt: d.startedAt, overall: r.overall }; } catch {}
      return {
        id: r.id, status: r.status, slot: r.slot, message: r.message, shared: !!r.share_consent, createdAt: r.created_at, updatedAt: r.updated_at,
        sessionId: r.session_id, candidateName: r.candidate_name, coachName: r.coach_name, session,
        notes: notes.filter((n) => n.request_id === r.id).map((n) => ({ content: n.content, createdAt: n.created_at })),
      };
    }),
  });
}

const TRANSITIONS = { coach: { pending: ["accepted", "declined"], accepted: ["done"] }, candidate: { pending: ["cancelled"], accepted: ["cancelled"] } };
async function setRequestStatus(req, user, env, id) {
  const { status } = await body(req);
  const r = await env.DB.prepare("SELECT candidate_id, coach_id, status FROM coaching_requests WHERE id = ?").bind(id).first();
  if (!r || (user.role === "coach" ? r.coach_id : r.candidate_id) !== user.id) throw new HttpError(404, "not_found", "Demande introuvable.");
  if (!(TRANSITIONS[user.role][r.status] || []).includes(status)) throw new HttpError(409, "bad_transition", "Ce changement de statut n’est pas possible.");
  const share = ["cancelled", "declined"].includes(status) ? 0 : 1; // refus ou annulation : le partage est révoqué
  await env.DB.prepare("UPDATE coaching_requests SET status = ?, share_consent = ?, updated_at = ? WHERE id = ?").bind(status, share, now(), id).run();
  await audit(env, user.id, `request_${status}`, "coaching_request", id);
  return json({ ok: true, status });
}

async function sharedSession(user, env, id) {
  const r = await env.DB.prepare(
    "SELECT r.share_consent, r.status, s.data FROM coaching_requests r JOIN interview_sessions s ON s.id = r.session_id WHERE r.id = ? AND r.coach_id = ?"
  ).bind(id, user.id).first();
  if (!r || !r.share_consent || !["pending", "accepted", "done"].includes(r.status)) throw new HttpError(404, "not_found", "Simulation non partagée.");
  await audit(env, user.id, "view_shared_session", "coaching_request", id);
  return json({ session: JSON.parse(r.data) });
}

async function addNote(req, user, env, id) {
  const { content } = await body(req);
  const text = clip(content, 4000).trim();
  if (text.length < 10) throw new HttpError(400, "too_short", "Le compte rendu doit contenir au moins 10 caractères.");
  const r = await env.DB.prepare("SELECT status FROM coaching_requests WHERE id = ? AND coach_id = ?").bind(id, user.id).first();
  if (!r) throw new HttpError(404, "not_found", "Demande introuvable.");
  if (!["accepted", "done"].includes(r.status)) throw new HttpError(409, "not_accepted", "Acceptez la demande avant d’écrire un compte rendu.");
  await env.DB.prepare("INSERT INTO coach_notes (id, request_id, coach_id, content, created_at) VALUES (?,?,?,?,?)").bind(uid("n"), id, user.id, text, now()).run();
  return json({ ok: true }, 201);
}


/* Onboarding adaptatif (S2-01) et profil candidat (contrat S2-02) */
const MAX_DRAFT_BYTES = 60_000;
async function getOnboarding(user, env) {
  const [p, d] = await env.DB.batch([
    env.DB.prepare("SELECT data, completed_at FROM candidate_profiles WHERE user_id = ?").bind(user.id),
    env.DB.prepare("SELECT step, data, updated_at FROM onboarding_drafts WHERE user_id = ?").bind(user.id),
  ]);
  const prof = p.results[0], draft = d.results[0];
  return json({
    completed: !!prof, profile: prof ? JSON.parse(prof.data) : null, completedAt: prof ? prof.completed_at : null,
    draft: draft ? { step: draft.step, data: JSON.parse(draft.data), updatedAt: draft.updated_at } : null,
  });
}
async function saveDraft(req, user, env) {
  const raw = await req.text();
  if (raw.length > MAX_DRAFT_BYTES) throw new HttpError(413, "too_large", "Brouillon trop volumineux.");
  let b; try { b = JSON.parse(raw); } catch { throw new HttpError(400, "bad_json", "Requête invalide."); }
  const step = Math.max(1, Math.min(6, parseInt(b.step, 10) || 1));
  if (!b.data || typeof b.data !== "object") throw new HttpError(400, "bad_data", "Brouillon invalide.");
  if (await env.DB.prepare("SELECT 1 FROM candidate_profiles WHERE user_id = ?").bind(user.id).first()) throw new HttpError(409, "already_completed", "Votre profil est déjà enregistré.");
  const t = now();
  await env.DB.prepare(`INSERT INTO onboarding_drafts (user_id, step, data, updated_at) VALUES (?,?,?,?)
    ON CONFLICT(user_id) DO UPDATE SET step = excluded.step, data = excluded.data, updated_at = excluded.updated_at`).bind(user.id, step, JSON.stringify(b.data), t).run();
  return json({ ok: true, savedAt: t });
}
async function completeOnboarding(req, user, env) {
  const b = await body(req);
  const v = validateProfile(b.data, "all");
  if (!v.ok) return json({ error: "invalid_profile", message: "Certaines réponses sont incomplètes.", errors: v.errors }, 400);
  const t = now();
  // Enregistrement initial unique (critère d'acceptation) : un second appel ne modifie rien.
  const res = await env.DB.prepare(`INSERT INTO candidate_profiles (user_id, version, data, seniority, target_job, completed_at, updated_at) VALUES (?,?,?,?,?,?,?)
    ON CONFLICT(user_id) DO NOTHING`).bind(user.id, PROFILE_VERSION, JSON.stringify(v.value), v.value.seniority.level, v.value.situation.targetJob, t, t).run();
  const created = (res.meta && res.meta.changes) > 0;
  if (created) {
    await env.DB.prepare("DELETE FROM onboarding_drafts WHERE user_id = ?").bind(user.id).run();
    await audit(env, user.id, "onboarding_completed", "candidate_profile", user.id);
  }
  const row = await env.DB.prepare("SELECT data FROM candidate_profiles WHERE user_id = ?").bind(user.id).first();
  return json({ created, profile: JSON.parse(row.data) }, created ? 201 : 200);
}
async function updateProfile(req, user, env) {
  const b = await body(req);
  const v = validateProfile(b.data, "all");
  if (!v.ok) return json({ error: "invalid_profile", message: "Certaines réponses sont incomplètes.", errors: v.errors }, 400);
  const r = await env.DB.prepare("UPDATE candidate_profiles SET data = ?, seniority = ?, target_job = ?, updated_at = ? WHERE user_id = ?")
    .bind(JSON.stringify(v.value), v.value.seniority.level, v.value.situation.targetJob, now(), user.id).run();
  if (!(r.meta && r.meta.changes)) throw new HttpError(404, "no_profile", "Terminez d’abord votre onboarding.");
  return json({ profile: v.value });
}
async function aiSuggestSkills(req, env) {
  const b = await body(req);
  const job = clip(b.job, 80);
  const system = "Tu aides un candidat à compléter son profil. Pour le métier donné, propose 8 compétences ou sujets professionnels courts (2 à 4 mots chacun), en français. Réponds UNIQUEMENT par un tableau JSON de chaînes, sans texte autour.";
  const out = await ask(env, system, `Métier visé : ${job}`, 160);
  let arr = [];
  try { arr = JSON.parse(out.slice(out.indexOf("["), out.lastIndexOf("]") + 1)); } catch {}
  arr = (Array.isArray(arr) ? arr : []).map((s) => clip(s, 40).trim()).filter((s) => s.length > 1).slice(0, 10);
  return json({ skills: arr });
}


/* Entretien piloté par le catalogue S2-03 (source de questions branchée) */
const ROLES_OK = ["dev", "data", "rh", "sales", "pm"], LEVELS_OK = ["junior", "mid", "senior"], TYPES_OK = ["rh", "tech", "mix"];
/** Toute panne du catalogue (réseau, authentification moteur…) devient une erreur 503 explicite, jamais un 500. */
async function catalogCall(fn) {
  try { return await fn(); }
  catch (e) {
    if (e instanceof HttpError) throw e;
    console.error("catalog_error", e && (e.code || e.message));
    throw new HttpError(503, "catalog_unavailable", "Le catalogue officiel de questions est momentanément indisponible.");
  }
}
async function pickTurn(env, link, slots) {
  for (let i = link.asked; i < slots.length; i++) {
    for (const f of relaxations(slots[i])) {
      const t = await env.QUESTIONS.next(link.catalog_ref, f);
      if (t) return { t, slotIndex: i };
    }
  }
  return null;
}
function publicTurn(t, total) {
  // Seule la question posée part vers le navigateur : ni liste, ni versions internes, ni attendus.
  return { code: t.code, prompt: t.prompt, turn: t.turn, total, kind: t.family === "technical" ? "tech" : "rh", comp: CATEGORY_LABELS[t.category] || (t.family === "technical" ? "Question technique" : "Question RH") };
}
async function advance(env, user, link) {
  const slots = JSON.parse(link.slots);
  const picked = link.asked < slots.length ? await catalogCall(() => pickTurn(env, link, slots)) : null;
  const t = now();
  if (!picked) {
    await catalogCall(() => env.QUESTIONS.complete(link.catalog_ref));
    await env.DB.prepare("UPDATE catalog_links SET status = 'done', updated_at = ? WHERE session_id = ?").bind(t, link.session_id).run();
    return { done: true, asked: link.asked };
  }
  const turns = JSON.parse(link.turns);
  turns.push({ turn: picked.t.turn, code: picked.t.code, questionVersionId: picked.t.questionVersionId, rubricVersionId: picked.t.rubricVersionId });
  const upd = await env.DB.prepare("UPDATE catalog_links SET asked = ?, turns = ?, updated_at = ? WHERE session_id = ? AND asked = ?")
    .bind(link.asked + 1, JSON.stringify(turns), t, link.session_id, link.asked).run();
  if (!(upd.meta && upd.meta.changes)) throw new HttpError(409, "concurrent_request", "Requête déjà en cours pour cette simulation.");
  return { done: false, question: publicTurn(picked.t, slots.length) };
}
async function startCatalogInterview(req, user, env) {
  if (!env.QUESTIONS) throw new HttpError(409, "builtin_source", "Aucun catalogue de questions n’est branché : l’interface utilise sa banque intégrée.");
  const b = await body(req);
  if (!/^s_[a-z0-9]{4,32}$/i.test(String(b.sessionId || ""))) throw new HttpError(400, "bad_id", "Identifiant de simulation invalide.");
  if (!ROLES_OK.includes(b.role) || !LEVELS_OK.includes(b.level) || !TYPES_OK.includes(b.type)) throw new HttpError(400, "bad_plan", "Paramètres de simulation invalides.");
  const locale = b.lang === "en" ? "en" : "fr";
  if (await env.DB.prepare("SELECT 1 FROM catalog_links WHERE session_id = ?").bind(b.sessionId).first()) throw new HttpError(409, "exists", "Cette simulation a déjà démarré.");
  const slots = planSlots({ role: b.role, level: b.level, type: b.type, length: b.length === "short" ? "short" : "std" });
  const ref = await catalogCall(async () => env.QUESTIONS.open({ candidateKey: await candidateUuid(user.id), locale }));
  const t = now();
  await env.DB.prepare("INSERT INTO catalog_links (session_id, user_id, source, catalog_ref, slots, asked, turns, status, created_at, updated_at) VALUES (?,?,?,?,?,0,'[]','active',?,?)")
    .bind(b.sessionId, user.id, env.QUESTIONS.name, String(ref), JSON.stringify(slots), t, t).run();
  const link = await env.DB.prepare("SELECT * FROM catalog_links WHERE session_id = ?").bind(b.sessionId).first();
  const r = await advance(env, user, link);
  if (r.done) throw new HttpError(409, "catalog_empty", "Le catalogue officiel ne contient encore aucune question publiée pour ce profil.");
  await audit(env, user.id, "catalog_interview_started", "interview_session", b.sessionId);
  return json({ source: env.QUESTIONS.name, ...r });
}
async function nextCatalogQuestion(req, user, env) {
  const b = await body(req);
  const link = await env.DB.prepare("SELECT * FROM catalog_links WHERE session_id = ? AND user_id = ?").bind(String(b.sessionId || ""), user.id).first();
  if (!link) throw new HttpError(404, "not_found", "Simulation introuvable.");
  if (link.status !== "active") return json({ done: true });
  return json(await advance(env, user, link));
}
async function finishCatalogInterview(req, user, env) {
  const b = await body(req);
  const link = await env.DB.prepare("SELECT * FROM catalog_links WHERE session_id = ? AND user_id = ?").bind(String(b.sessionId || ""), user.id).first();
  if (!link) throw new HttpError(404, "not_found", "Simulation introuvable.");
  if (link.status === "active") {
    await catalogCall(() => env.QUESTIONS.complete(link.catalog_ref));
    await env.DB.prepare("UPDATE catalog_links SET status = 'done', updated_at = ? WHERE session_id = ?").bind(now(), link.session_id).run();
  }
  return json({ done: true });
}

/* Administration : comptes listés dans ADMIN_EMAILS */
const isAdmin = (user, env) => !!user && String(env.ADMIN_EMAILS || "").split(",").map((x) => x.trim().toLowerCase()).filter(Boolean).includes(user.email);
function needAdmin(user, env) { need(user); if (!isAdmin(user, env)) throw new HttpError(403, "forbidden", "Réservé à l’administrateur de la plateforme."); return user; }
let voiceMemo = { at: 0, map: new Map(), custom: [] };
/** Voix attribuées (clé « agent|langue ») et recruteurs créés, relus au plus toutes les 30 s. */
async function voiceState(env) {
  if (Date.now() - voiceMemo.at < 30000) return voiceMemo;
  const [v, c] = await env.DB.batch([
    env.DB.prepare("SELECT agent_id, lang, voice_id, voice_name, accent FROM agent_voice_map"),
    env.DB.prepare("SELECT * FROM custom_agents ORDER BY created_at"),
  ]);
  voiceMemo = { at: Date.now(), map: new Map(v.results.map((r) => [r.agent_id + "|" + r.lang, r])), custom: c.results };
  return voiceMemo;
}
const agentVoiceMap = async (env) => (await voiceState(env)).map;
/** Catalogue complet : recruteurs intégrés + recruteurs créés par l'administrateur. */
async function allAgents(env) {
  const base = env.AGENTS || [], st = env.DB ? await voiceState(env) : { custom: [] };
  return [...base, ...st.custom.map((c) => {
    const preset = STYLE_PRESETS[c.preset] || STYLE_PRESETS.lina, model = base.find((a) => a.id === c.preset) || base[0] || {};
    return { id: c.id, name: c.name, title: c.title, description: c.description, color: c.color, custom: true, followupStyle: c.preset,
      style: preset.style, strictness: preset.strictness, greeting: { fr: c.greeting_fr, en: c.greeting_en }, voice: model.voice };
  })];
}
/** Voix d'un recruteur pour une langue : voix attribuée pour cette langue, sinon celle du français, sinon voix par défaut. */
function voiceFor(map, agent, lang) {
  const m = map.get(agent.id + "|" + lang) || map.get(agent.id + "|fr");
  return m ? { id: m.voice_id, name: m.voice_name, accent: m.accent } : { id: agent.voice, name: "Voix par défaut", accent: "" };
}
const voicesSummary = (map, agent) => Object.fromEntries(["fr", "en"].map((l) => { const m = map.get(agent.id + "|" + l); return [l, m ? { name: m.voice_name, accent: m.accent } : null]; }));
const accentCache = new Map();
async function adminVoices(url, user, env) {
  needAdmin(user, env);
  if (!env.TTS || !env.TTS.library) throw new HttpError(409, "elevenlabs_required", "Configurez ElevenLabs (TTS_PROVIDER=elevenlabs et ELEVENLABS_API_KEY).");
  const map = await agentVoiceMap(env);
  const language = /^[a-z]{2}$/.test(url.searchParams.get("language") || "") ? url.searchParams.get("language") : "fr";
  const agents = (await allAgents(env)).map((a) => ({ id: a.id, name: a.name, title: a.title, color: a.color, custom: !!a.custom, voices: voicesSummary(map, a) }));
  try {
    let accents = accentCache.get(language);
    if (!accents || Date.now() - accents.at > 3600000) { accents = { at: Date.now(), list: await env.TTS.accents(language) }; accentCache.set(language, accents); }
    const lib = await env.TTS.library({ language, accent: url.searchParams.get("accent") || "", gender: url.searchParams.get("gender"), search: url.searchParams.get("search"), page: Math.max(0, parseInt(url.searchParams.get("page") || "0", 10) || 0) });
    return json({ agents, model: env.TTS.model, language, accents: accents.list, presets: Object.fromEntries(Object.entries(STYLE_PRESETS).map(([k, v]) => [k, v.label])), ...lib });
  } catch (e) { console.error("library_error", e && e.message); throw new HttpError(503, "library_unavailable", "Bibliothèque ElevenLabs indisponible (clé, quota ou réseau)."); }
}
async function assignVoice(req, user, env, agentId) {
  needAdmin(user, env);
  const agent = (await allAgents(env)).find((a) => a.id === agentId);
  if (!agent) throw new HttpError(404, "not_found", "Recruteur introuvable.");
  const b = await body(req);
  const lang = b.lang === "en" ? "en" : "fr";
  if (b.reset) { await env.DB.prepare("DELETE FROM agent_voice_map WHERE agent_id = ? AND lang = ?").bind(agentId, lang).run(); voiceMemo.at = 0; return json({ ok: true }); }
  const name = String(b.name || "Voix").slice(0, 50), accent = String(b.accent || "").slice(0, 40);
  let voiceId;
  try { voiceId = await env.TTS.addShared(String(b.ownerId || ""), String(b.voiceId || ""), `Répétition · ${agent.name} · ${lang.toUpperCase()} · ${name}`); }
  catch (e) { console.error("add_voice_error", e && e.message); throw new HttpError(503, "add_voice_failed", "ElevenLabs a refusé l’ajout de cette voix (limite de voix du forfait ?)."); }
  await env.DB.prepare(`INSERT INTO agent_voice_map (agent_id, lang, voice_id, voice_name, accent, source, updated_by, updated_at) VALUES (?,?,?,?,?,?,?,?)
    ON CONFLICT(agent_id, lang) DO UPDATE SET voice_id = excluded.voice_id, voice_name = excluded.voice_name, accent = excluded.accent, source = excluded.source, updated_by = excluded.updated_by, updated_at = excluded.updated_at`)
    .bind(agentId, lang, voiceId, name, accent, "library", user.id, now()).run();
  voiceMemo.at = 0;
  await audit(env, user.id, "assign_agent_voice", "agent", agentId);
  return json({ ok: true, voiceName: name, lang, accent });
}
const COLOR_OK = /^#[0-9a-fA-F]{6}$/;
async function createAgent(req, user, env) {
  needAdmin(user, env);
  const b = await body(req);
  const name = clip(b.name, 30).trim(), title = clip(b.title, 60).trim(), description = clip(b.description, 200).trim();
  if (name.length < 2 || title.length < 3) throw new HttpError(400, "invalid_agent", "Indiquez au moins un prénom et un rôle.");
  const preset = STYLE_PRESETS[b.preset] ? b.preset : "lina";
  const color = COLOR_OK.test(b.color || "") ? b.color : "#2E6B64";
  const all = await allAgents(env);
  if (all.length >= 24) throw new HttpError(409, "too_many_agents", "24 recruteurs au maximum.");
  let id = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 20) || "agent";
  while (all.some((a) => a.id === id)) id = id.slice(0, 16) + "-" + Math.random().toString(36).slice(2, 5);
  const fr = clip(b.greetingFr, 200).trim() || `Bonjour, je suis ${name}, ${title.charAt(0).toLowerCase() + title.slice(1)}. Commençons.`;
  const en = clip(b.greetingEn, 200).trim() || `Hello, I'm ${name}. Let's begin.`;
  await env.DB.prepare("INSERT INTO custom_agents (id, name, title, description, color, preset, greeting_fr, greeting_en, created_by, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)")
    .bind(id, name, title, description || STYLE_PRESETS[preset].label, color, preset, fr, en, user.id, now()).run();
  voiceMemo.at = 0;
  await audit(env, user.id, "create_agent", "agent", id);
  return json({ ok: true, id }, 201);
}
async function deleteAgent(user, env, id) {
  needAdmin(user, env);
  const r = await env.DB.prepare("DELETE FROM custom_agents WHERE id = ?").bind(id).run();
  if (!(r.meta && r.meta.changes)) throw new HttpError(404, "not_found", "Seuls les recruteurs créés peuvent être supprimés.");
  await env.DB.prepare("DELETE FROM agent_voice_map WHERE agent_id = ?").bind(id).run();
  voiceMemo.at = 0;
  return json({ ok: true });
}

/* Voix de Lina : synthèse Pocket TTS relayée, avec cache et limite de débit */
const TTS_MAX_CHARS = 500, TTS_WINDOW_MS = 5 * 60 * 1000, TTS_MAX_PER_WINDOW = 60, TTS_CACHE_MAX = 120, TTS_CACHE_BYTES = 3 * 1024 * 1024;
const ttsCache = new Map(), ttsHits = new Map();
async function textToSpeech(url, user, env, ctx) {
  if (!env.TTS) throw new HttpError(404, "tts_unavailable", "Synthèse vocale serveur non configurée.");
  const lang = url.searchParams.get("lang") === "en" ? "en" : "fr";
  if (!env.TTS.languages.includes(lang)) throw new HttpError(404, "tts_unavailable", "Langue non disponible pour la voix serveur.");
  const text = String(url.searchParams.get("text") || "").replace(/\s+/g, " ").trim();
  if (!text || text.length > TTS_MAX_CHARS) throw new HttpError(400, "bad_text", "Texte vide ou trop long.");
  const t = Date.now(), recent = (ttsHits.get(user.id) || []).filter((x) => t - x < TTS_WINDOW_MS);
  if (recent.length >= TTS_MAX_PER_WINDOW) throw new HttpError(429, "too_many_requests", "Trop de demandes de voix. Réessayez dans quelques minutes.");
  recent.push(t); ttsHits.set(user.id, recent);
  const headers = { "content-type": "audio/wav", "cache-control": "private, max-age=3600", "x-content-type-options": "nosniff" };
  // Voix de l'agent choisi : identifiant validé contre le catalogue serveur (le navigateur ne fournit jamais d'ID de voix).
  const agents = await allAgents(env), agent = agents.find((a) => a.id === url.searchParams.get("agent")) || agents[0] || null;
  if (env.TTS.perAgentVoice && !agent) throw new HttpError(503, "tts_unavailable", "Aucun agent vocal configuré.");
  headers["content-type"] = env.TTS.contentType || "audio/wav";
  const voice = env.TTS.perAgentVoice ? voiceFor(await agentVoiceMap(env), agent, lang).id : null;
  const key = (env.TTS.perAgentVoice ? agent.id + ":" + voice + "|" : "") + lang + "|" + text, hit = ttsCache.get(key);
  if (hit) { ttsCache.delete(key); ttsCache.set(key, hit); return new Response(hit, { headers: { ...headers, "x-tts-cache": "hit" } }); }
  let up;
  try { up = await env.TTS.synthesize(text, lang, env.TTS.perAgentVoice ? { voice } : {}); }
  catch (e) { console.error("tts_error", e && e.message); throw new HttpError(503, "tts_unavailable", "La voix de Lina est momentanément indisponible."); }
  // Streaming vers le navigateur (la lecture démarre pendant la génération) + copie pour le cache.
  const [toClient, toCache] = up.body.tee();
  const filling = (async () => {
    const reader = toCache.getReader(), parts = []; let size = 0;
    for (;;) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength; if (size > TTS_CACHE_BYTES) { reader.cancel(); return; } parts.push(value); }
    const all = new Uint8Array(size); let o = 0; for (const p of parts) { all.set(p, o); o += p.byteLength; }
    ttsCache.set(key, all); while (ttsCache.size > TTS_CACHE_MAX) ttsCache.delete(ttsCache.keys().next().value);
  })().catch(() => {});
  if (ctx && typeof ctx.waitUntil === "function") ctx.waitUntil(filling);   // Workers : garder la mise en cache vivante
  return new Response(toClient, { headers: { ...headers, "x-tts-cache": "miss" } });
}

/* Transcription ElevenLabs : jeton à usage unique (15 min), la clé reste sur le serveur */
const sttHits = new Map();
async function sttToken(req, user, env) {
  if (!env.STT || env.STT.mode !== "token") throw new HttpError(404, "stt_unavailable", "Transcription serveur non configurée.");
  const b = await body(req);
  const t = Date.now(), recent = (sttHits.get(user.id) || []).filter((x) => t - x < 10 * 60 * 1000);
  if (recent.length >= 30) throw new HttpError(429, "too_many_requests", "Trop de demandes de dictée. Réessayez dans quelques minutes.");
  recent.push(t); sttHits.set(user.id, recent);
  try { return json(await env.STT.token(b.lang === "en" ? "en" : "fr")); }
  catch (e) { console.error("stt_token_error", e && e.message); throw new HttpError(503, "stt_unavailable", "La dictée est momentanément indisponible."); }
}

/* IA */
async function ask(env, system, user, maxTokens) {
  return String((await env.AI.complete({ system, user, maxTokens, temperature: 0.4 })) || "").trim();
}
async function aiFollowup(req, env) {
  const b = await body(req); const en = b.lang === "en";
  const system = en
    ? "You are a professional recruiter running a practice interview. Given a question and the candidate's answer, decide if ONE short follow-up is useful (missing concrete example, personal action, or measurable result). Reply ONLY with the follow-up question (max 25 words), or exactly NONE if the answer is complete. Never evaluate or score."
    : "Tu es une recruteuse professionnelle qui mène un entretien d'entraînement. À partir de la question et de la réponse du candidat, décide si UNE courte relance est utile (exemple concret, action personnelle ou résultat mesurable manquant). Réponds UNIQUEMENT par la question de relance (25 mots max), ou exactement AUCUNE si la réponse est complète. Ne note jamais le candidat.";
  const agent = (await allAgents(env)).find((a) => a.id === b.agent);
  const out = await ask(env, (agent ? agent.style + " " : "") + system, `Poste: ${clip(b.role)}\nQuestion: ${clip(b.question)}\nRéponse: ${clip(b.answer)}`, 80);
  return json({ followup: !out || /^(none|aucune)\b/i.test(out) ? null : out.replace(/^["«\s]+|["»\s]+$/g, "") });
}
async function aiFeedback(req, env) {
  const b = await body(req); const en = b.lang === "en";
  const turns = (Array.isArray(b.turns) ? b.turns : []).slice(0, 10).map((t, i) => `Q${i + 1}: ${clip(t.q)}\nR${i + 1}: ${clip(t.a)}`).join("\n\n");
  const scores = (Array.isArray(b.scores) ? b.scores : []).map((s) => `${clip(s.label, 40)}: ${Number(s.level)}/5`).join(", ");
  const system = en
    ? "You are a supportive interview coach. Write 3 to 4 sentences of personalised feedback in English, addressing the candidate as 'you'. Mention one concrete strength and one concrete improvement, referring to their answers. Do not give a score, do not invent facts, do not make hiring decisions."
    : "Tu es une coach d'entretien bienveillante. Rédige 3 à 4 phrases de retour personnalisé en français, en vouvoyant le candidat. Cite un point fort concret et un axe d'amélioration concret, en t'appuyant sur ses réponses. Ne donne pas de note, n'invente rien, ne prends aucune décision de recrutement.";
  return json({ summary: await ask(env, system, `Poste: ${clip(b.role)} (${clip(b.level)})\nNotes de la grille: ${scores}\n\n${turns}`, 260) });
}

/* Routeur */
async function route(req, env, url, ctx) {
  const p = url.pathname, m = req.method;
  if (p === "/api/health") return json({ ok: true, ai: !!env.AI, db: !!env.DB, coachSignup: !!env.COACH_INVITE_CODE, runtime: env.RUNTIME || "unknown", store: env.DB ? env.DB.name : null, aiProvider: env.AI ? env.AI.name : null, questionSource: env.QUESTIONS ? env.QUESTIONS.name : "builtin", stt: env.STT ? env.STT.name : "browser", sttMode: env.STT ? env.STT.mode || "relay" : null, tts: env.TTS ? env.TTS.name : "browser", ttsLanguages: env.TTS ? env.TTS.languages : [], agentVoices: !!(env.TTS && env.TTS.perAgentVoice), ttsModel: env.TTS && env.TTS.model ? env.TTS.model : null });

  // Protection CSRF : écritures uniquement depuis la même origine, en JSON.
  if (m !== "GET") {
    const origin = req.headers.get("origin");
    if (origin && origin !== url.origin) throw new HttpError(403, "bad_origin", "Origine non autorisée.");
    if (!(req.headers.get("content-type") || "").includes("application/json")) throw new HttpError(415, "json_only", "JSON attendu.");
  }
  if (!env.DB) throw new HttpError(503, "db_unavailable", "Base de données non configurée.");
  await ensureSchema(env);

  if (p === "/api/auth/register" && m === "POST") return register(req, env);
  if (p === "/api/auth/login" && m === "POST") return login(req, env);
  if (p === "/api/auth/logout" && m === "POST") return logout(req, env);

  const user = await currentUser(req, env);
  if (p === "/api/auth/me" && m === "GET") return json({ user: user ? { ...user, isAdmin: isAdmin(user, env) } : null });
  if (p === "/api/me" && m === "DELETE") return deleteAccount(need(user), env);

  let mm;
  if (p === "/api/onboarding" && m === "GET") return getOnboarding(need(user, "candidate"), env);
  if (p === "/api/onboarding/draft" && m === "PUT") return saveDraft(req, need(user, "candidate"), env);
  if (p === "/api/onboarding/complete" && m === "POST") return completeOnboarding(req, need(user, "candidate"), env);
  if (p === "/api/profile" && m === "PUT") return updateProfile(req, need(user, "candidate"), env);
  if (p === "/api/ai/suggest-skills" && m === "POST") { need(user, "candidate"); if (!env.AI) throw new HttpError(503, "ai_unavailable"); return aiSuggestSkills(req, env); }
  if (p === "/api/tts" && m === "GET") return textToSpeech(url, need(user, "candidate"), env, ctx);
  if (p === "/api/admin/voices" && m === "GET") return adminVoices(url, user, env);
  if ((mm = p.match(/^\/api\/admin\/agents\/([a-z0-9_-]+)\/voice$/)) && m === "POST") return assignVoice(req, user, env, mm[1]);
  if (p === "/api/agents" && m === "GET") { need(user); const map = await agentVoiceMap(env); return json({ agents: (await allAgents(env)).map((a) => publicAgent(a, voicesSummary(map, a))), voices: !!(env.TTS && env.TTS.perAgentVoice) }); }
  if (p === "/api/admin/agents" && m === "POST") return createAgent(req, user, env);
  if ((mm = p.match(/^\/api\/admin\/agents\/([a-z0-9_-]+)$/)) && m === "DELETE") return deleteAgent(user, env, mm[1]);
  if (p === "/api/stt/token" && m === "POST") return sttToken(req, need(user, "candidate"), env);
  if (p === "/api/tts/warmup" && m === "POST") {
    need(user, "candidate");
    if (env.TTS && env.TTS.warmup) { const w = env.TTS.warmup().catch(() => false); if (ctx && ctx.waitUntil) ctx.waitUntil(w); }
    return json({ ok: true }, 202);
  }
  if (p === "/api/interview/start" && m === "POST") return startCatalogInterview(req, need(user, "candidate"), env);
  if (p === "/api/interview/next" && m === "POST") return nextCatalogQuestion(req, need(user, "candidate"), env);
  if (p === "/api/interview/finish" && m === "POST") return finishCatalogInterview(req, need(user, "candidate"), env);
  if (p === "/api/sessions" && m === "GET") return listSessions(need(user, "candidate"), env);
  if ((mm = p.match(/^\/api\/sessions\/([\w-]+)$/)) && m === "PUT") return saveSession(req, need(user, "candidate"), env, mm[1]);

  if (p === "/api/coaches" && m === "GET") { need(user); return listCoaches(env); }
  if (p === "/api/coach/profile" && m === "GET") return getCoachProfile(need(user, "coach"), env);
  if (p === "/api/coach/profile" && m === "PUT") return saveCoachProfile(req, need(user, "coach"), env);

  if (p === "/api/requests" && m === "GET") return listRequests(need(user), env);
  if (p === "/api/requests" && m === "POST") return createRequest(req, need(user, "candidate"), env);
  if ((mm = p.match(/^\/api\/requests\/([\w-]+)\/status$/)) && m === "POST") return setRequestStatus(req, need(user), env, mm[1]);
  if ((mm = p.match(/^\/api\/requests\/([\w-]+)\/session$/)) && m === "GET") return sharedSession(need(user, "coach"), env, mm[1]);
  if ((mm = p.match(/^\/api\/requests\/([\w-]+)\/notes$/)) && m === "POST") return addNote(req, need(user, "coach"), env, mm[1]);

  if (p === "/api/ai/followup" && m === "POST") { need(user); if (!env.AI) throw new HttpError(503, "ai_unavailable"); return aiFollowup(req, env); }
  if (p === "/api/ai/feedback" && m === "POST") { need(user); if (!env.AI) throw new HttpError(503, "ai_unavailable"); return aiFeedback(req, env); }

  throw new HttpError(404, "not_found", "Ressource introuvable.");
}

/**
 * Crée le gestionnaire HTTP de l'API.
 * @param {object} env  { DB, AI, COACH_INVITE_CODE, COOKIE_SECURE, RUNTIME }
 * @returns {(req: Request) => Promise<Response>}  à appeler pour les chemins /api/*
 */
export function createApp(env) {
  COOKIE_SECURE = env.COOKIE_SECURE !== false;
  const handleApi = async function handleApi(req, ctx) {
    const url = new URL(req.url);
    try {
      return await route(req, env, url, ctx);
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.code, message: e.message }, e.status);
      console.error("api_error", url.pathname, e && e.message);
      return json({ error: "server_error", message: "Erreur serveur. Réessayez." }, 500);
    }
  };
  /** Pour les hôtes (WebSocket de transcription) : identifie l'utilisateur à partir du cookie de session. */
  handleApi.authenticate = async (req) => { if (!env.DB) return null; await ensureSchema(env); return currentUser(req, env); };
  return handleApi;
}
