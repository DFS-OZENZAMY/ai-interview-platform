// Adaptateur « compatible Supabase » sur les comptes de la plateforme.
// Usage : BASE=http://127.0.0.1:3000 node --experimental-strip-types poc/tests/web_platform_auth_test.mts
import { createPlatformClient, type PlatformCall } from "../../web/src/lib/platform-auth.ts";
const BASE = process.env.BASE ?? "http://127.0.0.1:3000";
let cookie = "", n = 0, bad = 0;
const ok = (c: unknown, m: string) => { n++; if (!c) bad++; console.log((c ? "PASS " : "FAIL ") + m); };
const call: PlatformCall = async (path, init) => {
  const res = await fetch(BASE + path, { method: init?.method ?? "GET", headers: { ...(cookie ? { cookie } : {}), ...(init?.body !== undefined ? { "content-type": "application/json", origin: BASE } : {}) }, body: init?.body !== undefined ? JSON.stringify(init.body) : undefined });
  const sc = res.headers.getSetCookie?.()[0]; if (sc) cookie = sc.startsWith("sid=;") || /Max-Age=0/.test(sc) ? "" : sc.split(";")[0];
  let data: unknown = null; try { data = await res.json(); } catch {}
  return { status: res.status, data };
};
const c = createPlatformClient(call);
const email = `u${Date.now()}@example.com`;
let r: any = await c.auth.getUser(); ok(!r.data.user && r.error, "sans session : pas d'utilisateur, erreur de session");
r = await c.auth.signUp({ email, password: "motdepasse123" }); ok(r.data.session && !r.error, "inscription : session ouverte");
r = await c.auth.getUser(); ok(r.data.user?.email === email, "getUser renvoie le compte");
r = await c.from("app_user_roles").select("role").eq("user_id", "x").maybeSingle(); ok(r.data?.role === "user", "rôle candidat = « user »");
r = await c.from("candidate_profiles").select("first_name").eq("user_id", "x").maybeSingle(); ok(r.data === null, "profil absent au départ");
r = await c.from("candidate_profiles").upsert({ user_id: "x", first_name: "Salma", last_name: "B" }, { onConflict: "user_id" }); ok(!r.error, "profil enregistré");
r = await c.from("candidate_profiles").select("first_name").eq("user_id", "x").maybeSingle(); ok(r.data?.first_name === "Salma", "profil relu (prénom pour Lina)");
r = await c.from("candidate_interview_results").select("id").eq("user_id", "x").order("completed_at", { ascending: false }).limit(50); ok(Array.isArray(r.data) && r.data.length === 0, "résultats : liste vide, sans erreur");
await c.auth.signOut(); r = await c.auth.getUser(); ok(!r.data.user, "déconnexion effective");
r = await c.auth.signInWithPassword({ email, password: "faux-faux-1" }); ok(r.error?.code === "invalid_credentials", "mauvais mot de passe → invalid_credentials");
r = await c.auth.signInWithPassword({ email, password: "motdepasse123" }); ok(r.data.user && !r.error, "reconnexion");
r = await c.auth.signUp({ email, password: "motdepasse123" }); ok(r.error?.code === "user_already_exists", "doublon refusé");
r = await c.auth.signUp({ email: `b${Date.now()}@example.com`, password: "court" }); ok(r.error?.code === "weak_password", "mot de passe trop court refusé");
console.log(`${n - bad}/${n}`); process.exit(bad ? 1 : 0);
