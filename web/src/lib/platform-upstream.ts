/* Accès serveur à la plateforme (simulateur, voix de Lina, comptes) : sur Cloudflare, liaison PLATFORM (même Worker) ;
   ailleurs, le serveur indiqué par LAB_UPSTREAM_URL (laboratoire local d'Achraf, ou l'hôte Node de la plateforme). */
import type { NextRequest } from "next/server";
import type { PlatformCall } from "@/lib/platform-auth";

const LOCAL_UPSTREAM = process.env.LAB_UPSTREAM_URL || "http://127.0.0.1:8765";
type Platform = { fetch: (input: Request | string, init?: RequestInit) => Promise<Response> };

export async function upstream(path: string, init: RequestInit): Promise<Response> {
  let platform: Platform | undefined, secret = process.env.BRIDGE_SECRET || "";
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const env = getCloudflareContext().env as unknown as { PLATFORM?: Platform; BRIDGE_SECRET?: string };
    platform = env.PLATFORM; secret = env.BRIDGE_SECRET || secret;
  } catch { /* hors Cloudflare */ }
  const headers = new Headers(init.headers); if (secret) headers.set("x-bridge-secret", secret);
  if (platform) return platform.fetch("https://platform.internal" + path, { ...init, headers });
  return fetch(LOCAL_UPSTREAM + path, { ...init, headers });
}

/** Appel authentifié au nom de l'utilisateur : on relaie son cookie de session. */
export const serverCall = (cookieHeader: string): PlatformCall => async (path, init) => {
  const headers: Record<string, string> = { cookie: cookieHeader };
  if (init?.body !== undefined) headers["content-type"] = "application/json";
  const res = await upstream(path, {
    method: init?.method ?? "GET", headers, cache: "no-store", signal: AbortSignal.timeout(10000),
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  let data: unknown = null; try { data = await res.json(); } catch { /* corps vide */ }
  return { status: res.status, data };
};

/** Écriture autorisée seulement depuis ce site : l'en-tête Origin doit correspondre à l'hôte réellement demandé
    (nextUrl.origin vaut « localhost » derrière certains serveurs, d'où la comparaison avec Host / X-Forwarded-Host). */
export function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? request.nextUrl.host;
  try { return new URL(origin).host === host; } catch { return false; }
}
