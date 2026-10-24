import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Client « compatible Supabase » adossé aux comptes de la plateforme (/api/auth/*, /api/web/doc/*).
 * Il ne couvre que ce que l'application utilise : auth (connexion, inscription, session, déconnexion)
 * et les tables app_user_roles, candidate_profiles, candidate_interview_results.
 * Même code côté navigateur (fetch) et côté serveur (liaison PLATFORM / laboratoire local).
 */
export type PlatformCall = (path: string, init?: { method?: string; body?: unknown }) => Promise<{ status: number; data: unknown }>;

type PlatformUser = { id: string; email: string; name?: string; role?: string; isAdmin?: boolean };
type Row = Record<string, unknown>;

export class PlatformAuthError extends Error {
  status: number; code: string;
  constructor(message: string, status: number, code: string) { super(message); this.name = "AuthError"; this.status = status; this.code = code; }
}

const CODES: Record<string, string> = { bad_credentials: "invalid_credentials", email_taken: "user_already_exists", weak_password: "weak_password", too_many_attempts: "over_request_rate_limit" };
const asObject = (v: unknown): Row => (v && typeof v === "object" ? (v as Row) : {});
const errorFrom = (status: number, data: unknown, fallback: string) => {
  const d = asObject(data), code = typeof d.error === "string" ? d.error : "unknown";
  return new PlatformAuthError(typeof d.message === "string" ? d.message : fallback, status, CODES[code] ?? code);
};
const toUser = (u: PlatformUser) => ({ id: u.id, email: u.email, user_metadata: { name: u.name ?? "" }, app_metadata: { role: u.role ?? "candidate" } });
const appRole = (u: PlatformUser) => (u.isAdmin ? "admin" : u.role === "coach" ? "coach" : "user");
const unsupported = (what: string) => ({ data: null, error: new PlatformAuthError(`${what} n’est pas disponible avec les comptes de la plateforme.`, 501, "unsupported") });

export function createPlatformClient(call: PlatformCall): SupabaseClient {
  async function me(): Promise<PlatformUser | null> {
    try {
      const { status, data } = await call("/api/auth/me");
      const u = asObject(data).user;
      return status === 200 && u && typeof u === "object" ? (u as PlatformUser) : null;
    } catch { return null; }
  }
  async function session(path: string, payload: unknown, failure: string) {
    let res;
    try { res = await call(path, { method: "POST", body: payload }); }
    catch { return { data: { user: null, session: null }, error: new PlatformAuthError("Impossible de joindre le service de connexion (network).", 0, "network") }; }
    const user = asObject(res.data).user;
    if (res.status >= 400 || !user) return { data: { user: null, session: null }, error: errorFrom(res.status, res.data, failure) };
    return { data: { user: toUser(user as PlatformUser), session: { user: toUser(user as PlatformUser) } }, error: null };
  }
  const auth = {
    async getUser() {
      const u = await me();
      return u ? { data: { user: toUser(u) }, error: null } : { data: { user: null }, error: new PlatformAuthError("Auth session missing!", 400, "session_missing") };
    },
    signInWithPassword: ({ email, password }: { email: string; password: string }) =>
      session("/api/auth/login", { email, password }, "Connexion refusée"),
    signUp: ({ email, password, options }: { email: string; password: string; options?: { data?: Row } }) => {
      const local = email.split("@")[0] || "candidat";
      const given = typeof options?.data?.name === "string" ? options.data.name : local;
      return session("/api/auth/register", { email, password, name: given.length >= 2 ? given : `${given}-user`, role: "candidate", consent: true }, "Création du compte impossible");
    },
    async signOut() { try { await call("/api/auth/logout", { method: "POST", body: {} }); } catch { /* session déjà perdue */ } return { error: null }; },
    resetPasswordForEmail: async () => unsupported("La réinitialisation par e-mail"),
    signInWithOAuth: async () => unsupported("La connexion Google"),
    exchangeCodeForSession: async () => unsupported("L’échange de code"),
    updateUser: async () => unsupported("Le changement de mot de passe"),
  };

  function from(table: string) {
    const st: { op: "select" | "upsert"; row?: Row } = { op: "select" };
    async function run(single: boolean): Promise<{ data: unknown; error: unknown }> {
      try {
        if (table === "app_user_roles") {
          const u = await me();
          return { data: u ? (single ? { role: appRole(u) } : [{ role: appRole(u) }]) : (single ? null : []), error: null };
        }
        if (table === "candidate_profiles") {
          if (st.op === "upsert") {
            const r = await call("/api/web/doc/profile", { method: "PUT", body: { data: st.row ?? {} } });
            return { data: null, error: r.status >= 400 ? errorFrom(r.status, r.data, "Enregistrement du profil impossible") : null };
          }
          const r = await call("/api/web/doc/profile");
          const doc = r.status === 200 ? asObject(r.data).data ?? null : null;
          return { data: single ? doc : doc ? [doc] : [], error: r.status >= 500 ? errorFrom(r.status, r.data, "Lecture du profil impossible") : null };
        }
        if (table === "candidate_interview_results") {
          const r = await call("/api/web/doc/results");
          const rows = r.status === 200 && Array.isArray(asObject(r.data).data) ? (asObject(r.data).data as unknown[]) : [];
          return { data: single ? rows[0] ?? null : rows, error: null };
        }
        return { data: null, error: new PlatformAuthError(`Table inconnue : ${table}`, 400, "unknown_table") };
      } catch { return { data: null, error: new PlatformAuthError("Service indisponible (network).", 0, "network") }; }
    }
    const b = {
      select: () => b, eq: () => b, order: () => b, limit: () => b,
      upsert: (row: Row) => { st.op = "upsert"; st.row = row; return b; },
      maybeSingle: () => run(true), single: () => run(true),
      then: (ok: (v: { data: unknown; error: unknown }) => unknown, ko?: (e: unknown) => unknown) => run(false).then(ok, ko),
    };
    return b;
  }
  return { auth, from } as unknown as SupabaseClient;
}

/** Appel depuis le navigateur : même origine, cookie de session « sid » envoyé automatiquement. */
export const browserCall: PlatformCall = async (path, init) => {
  const res = await fetch(path, {
    method: init?.method ?? "GET", credentials: "same-origin", cache: "no-store",
    headers: init?.body !== undefined ? { "content-type": "application/json" } : undefined,
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  let data: unknown = null; try { data = await res.json(); } catch { /* corps vide */ }
  return { status: res.status, data };
};
