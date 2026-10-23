/** Hôte Cloudflare Workers : D1 + Workers AI (ou autre fournisseur IA par variables). */
import { createApp } from "../core/app.js";
import { d1Store } from "../stores/d1.js";
import { createAI } from "../ai/index.js";
import { createQuestionSource } from "../questions/index.js";
import { createSttProvider, openSttSession } from "../stt/index.js";
import { createTtsProvider } from "../tts/index.js";
export { LinaVoice } from "./lina-voice.js";   // Durable Object du conteneur Pocket TTS (Cloudflare Containers)

let api;
/** Workers peut livrer les trames binaires en Blob : conversion asynchrone, dans l'ordre d'arrivée. */
function orderedBinary(handler) {
  let chain = Promise.resolve();
  return (data) => {
    chain = chain.then(async () => {
      const d = typeof data === "string" ? data : data instanceof Blob || (data && typeof data.arrayBuffer === "function" && !ArrayBuffer.isView(data)) ? new Uint8Array(await data.arrayBuffer()) : ArrayBuffer.isView(data) ? data : new Uint8Array(data);
      handler(d);
    }).catch(() => {});
  };
}
/* Transcription Kyutai : WebSocket relayé ; la clé ne quitte jamais le Worker. */
async function sttStream(req, env, url) {
  const provider = createSttProvider(env);
  if (!provider) return new Response("Transcription serveur non configurée", { status: 404 });
  if ((req.headers.get("upgrade") || "").toLowerCase() !== "websocket") return new Response("WebSocket attendu", { status: 426 });
  const origin = req.headers.get("origin"); if (origin && origin !== url.origin) return new Response("Origine refusée", { status: 403 });
  const user = await api.authenticate(req);
  if (!user || user.role !== "candidate") return new Response("Non authentifié", { status: 401 });
  const [client, server] = Object.values(new WebSocketPair());
  server.accept();
  const pending = []; let session = null;
  const fromClient = orderedBinary((d) => typeof d === "string" ? session.onClientText(d) : session.onClientBinary(d));
  server.addEventListener("message", (e) => { if (!session) return pending.push(e.data); fromClient(e.data); });
  server.addEventListener("close", () => session && session.close());
  (async () => {
    try {
      session = await openSttSession({
        provider,
        connectUpstream: async (u, h) => {
          const r = await fetch(u.replace(/^ws/, "http"), { headers: { ...h, Upgrade: "websocket" } });
          const ws = r.webSocket; if (!ws) throw new Error("upstream_refused_" + r.status);
          // Écouteurs posés AVANT accept() et file d'attente : aucun message de Kyutai (ex. « Ready ») ne se perd.
          const queue = []; let onMsg = null, onCl = null, closedEarly = false;
          const deliver = orderedBinary((d) => { const u = typeof d === "string" ? new TextEncoder().encode(d) : d; onMsg ? onMsg(u) : queue.push(u); });
          ws.addEventListener("message", (e) => deliver(e.data));
          ws.addEventListener("close", () => { onCl ? onCl() : (closedEarly = true); });
          ws.accept();
          return { send: (d) => ws.send(d), close: () => { try { ws.close(); } catch {} },
            onMessage: (cb) => { onMsg = cb; queue.splice(0).forEach(cb); }, onClose: (cb) => { onCl = cb; if (closedEarly) cb(); } };
        },
        sendToClient: (m) => { try { server.send(JSON.stringify(m)); } catch {} },
        closeClient: () => { try { server.close(1000, "fin"); } catch {} },
      });
      for (const d of pending) fromClient(d);
    } catch (e) {
      server.send(JSON.stringify({ type: "error", message: "Service de transcription indisponible." })); server.close(1011, "upstream");
    }
  })();
  return new Response(null, { status: 101, webSocket: client });
}
export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(req);
    // Sur Cloudflare, le catalogue S2-03 se branche par HTTP (QUESTION_SOURCE=catalog-http).
    api ||= createApp({
      DB: env.DB ? d1Store(env.DB) : null,
      AI: createAI(env, { AI: env.AI }),
      QUESTIONS: await createQuestionSource(env),
      STT: createSttProvider(env),
      TTS: createTtsProvider(env, env.LINA_VOICE ? { container: (r) => env.LINA_VOICE.get(env.LINA_VOICE.idFromName("lina-fr")).fetch(r) } : {}),
      COACH_INVITE_CODE: env.COACH_INVITE_CODE,
      COOKIE_SECURE: env.COOKIE_SECURE !== "false",
      RUNTIME: "cloudflare-workers",
    });
    if (url.pathname === "/api/stt/stream") return sttStream(req, env, url);
    return api(req, ctx);
  },
};
