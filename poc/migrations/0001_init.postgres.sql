-- Schéma PostgreSQL (Supabase, Neon, RDS, Docker…). Appliqué automatiquement par le serveur au premier appel.
-- Tables dans un schéma dédié, séparé de question_bank et de public.
CREATE SCHEMA IF NOT EXISTS app;
SET search_path TO app;
CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL, role TEXT NOT NULL CHECK (role IN ('candidate','coach')), pw_hash TEXT NOT NULL, pw_salt TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS auth_sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS consents (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, purpose TEXT NOT NULL, version TEXT NOT NULL, granted_at TEXT NOT NULL, revoked_at TEXT);
CREATE TABLE IF NOT EXISTS interview_sessions (id TEXT PRIMARY KEY, candidate_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, status TEXT NOT NULL, overall INTEGER, data TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_sessions_candidate ON interview_sessions(candidate_id, created_at);
CREATE TABLE IF NOT EXISTS coach_profiles (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, bio TEXT NOT NULL DEFAULT '', specialties TEXT NOT NULL DEFAULT '[]', slots TEXT NOT NULL DEFAULT '[]', updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS coaching_requests (id TEXT PRIMARY KEY, candidate_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, coach_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, session_id TEXT REFERENCES interview_sessions(id) ON DELETE SET NULL, slot TEXT, message TEXT NOT NULL DEFAULT '', share_consent INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL CHECK (status IN ('pending','accepted','declined','cancelled','done')), created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_requests_coach ON coaching_requests(coach_id, status);
CREATE INDEX IF NOT EXISTS idx_requests_candidate ON coaching_requests(candidate_id);
CREATE TABLE IF NOT EXISTS coach_notes (id TEXT PRIMARY KEY, request_id TEXT NOT NULL REFERENCES coaching_requests(id) ON DELETE CASCADE, coach_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, content TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS login_attempts (email TEXT NOT NULL, at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_login_attempts ON login_attempts(email, at);
CREATE TABLE IF NOT EXISTS onboarding_drafts (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, step INTEGER NOT NULL, data TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS candidate_profiles (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, version TEXT NOT NULL, data TEXT NOT NULL, seniority TEXT NOT NULL, target_job TEXT NOT NULL, completed_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS audit_events (id TEXT PRIMARY KEY, actor_user_id TEXT, action TEXT NOT NULL, entity_type TEXT, entity_id TEXT, occurred_at TEXT NOT NULL);
-- Aucun accès client direct (anon, authenticated, PUBLIC) ; RLS activée sans politique.
-- Voir server/stores/postgres.js (ensureSchema) pour le bloc exact exécuté au démarrage.
