/**
 * Worker unique « ai-interview-platform » : l'application Next.js d'Achraf (OpenNext) + la plateforme
 * (simulateur, Lina, voix ElevenLabs, comptes, base D1) dans le même déploiement Cloudflare.
 *  - pages et /api/interview/* (pont d'Achraf, authentification Supabase)  → Next.js
 *  - autres /api/* (moteur, Lina, voix, transcription…)                    → plateforme (poc/server)
 * Le pont d'Achraf appelle la plateforme par la liaison PLATFORM, qui pointe sur ce même Worker.
 */
// @ts-expect-error — fichier généré par « opennextjs-cloudflare build »
import nextWorker from "./.open-next/worker.js";
import platform from "../poc/server/hosts/cloudflare.js";

// Classe exigée par le Durable Object existant du Worker de la plateforme (voix Pocket TTS, désormais inutilisée).
export { LinaVoice } from "../poc/server/hosts/lina-voice.js";
// Durable Objects internes d'OpenNext (file d'attente, cache), si présents dans la configuration.
// @ts-expect-error — fichier généré
export * from "./.open-next/worker.js";

const toPlatform = (path: string) => path.startsWith("/api/") && !path.startsWith("/api/interview/");

export default {
  async fetch(request: Request, env: Record<string, unknown>, ctx: ExecutionContext) {
    const { pathname } = new URL(request.url);
    if (toPlatform(pathname)) return platform.fetch(request, env, ctx);
    return nextWorker.fetch(request, env, ctx);
  },
};
