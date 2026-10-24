/**
 * Moteur d'authentification, choisi au déploiement (aucun code à changer) :
 *  - « supabase » : Supabase Auth (+ tables profil/résultats) ;
 *  - « platform » : comptes de la plateforme (base D1 sur Cloudflare, SQLite/Postgres sur Node) — rien d'externe à configurer.
 * Priorité : NEXT_PUBLIC_AUTH_PROVIDER explicite › build Cloudflare (= « platform ») › Supabase s'il est configuré › « platform ».
 * Les variables NEXT_PUBLIC_* sont figées à la construction : changer de moteur = relancer le build.
 */
export type AuthProvider = "supabase" | "platform";

const explicit = process.env.NEXT_PUBLIC_AUTH_PROVIDER;
const buildDefault = process.env.NEXT_PUBLIC_AUTH_DEFAULT;
export const supabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
);

export const AUTH_PROVIDER: AuthProvider =
  explicit === "supabase" || explicit === "platform" ? explicit
  : buildDefault === "platform" ? "platform"
  : supabaseConfigured ? "supabase"
  : "platform";
