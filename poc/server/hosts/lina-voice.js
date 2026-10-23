/**
 * Durable Object « LinaVoice » : pilote le conteneur Pocket TTS (Cloudflare Containers, API native ctx.container).
 * - démarre le conteneur à la demande, attend qu'il réponde, puis relaie /tts et /health ;
 * - l'éteint après 10 minutes sans activité (aucun coût quand personne ne s'entraîne) ;
 * - aucune URL publique : seul le Worker de la plateforme peut l'appeler.
 */
const PORT = 8000, READY_TIMEOUT_MS = 120_000, IDLE_MS = 10 * 60 * 1000;
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export class LinaVoice {
  constructor(ctx, env) { this.ctx = ctx; this.env = env; this.ready = false; this.waiting = null; }

  async ensureReady(port) {
    if (this.ready) return true;
    this.waiting ||= (async () => {
      const until = Date.now() + READY_TIMEOUT_MS;
      while (Date.now() < until) {
        try { const r = await port.fetch("http://container/health"); if (r.ok) { this.ready = true; return true; } } catch {}
        await sleep(1000);
      }
      return false;
    })().finally(() => { this.waiting = null; });
    return this.waiting;
  }

  async fetch(req) {
    const c = this.ctx.container;
    if (!c) return json({ error: "no_container" }, 503);
    if (!c.running) { this.ready = false; c.start({ enableInternet: false, env: { HF_HUB_OFFLINE: "1" } }); }
    if (typeof c.setInactivityTimeout === "function") { try { await c.setInactivityTimeout(IDLE_MS); } catch {} }
    const port = c.getTcpPort(PORT);
    if (!(await this.ensureReady(port))) return json({ error: "voice_starting" }, 503);
    const path = new URL(req.url).pathname;
    if (path === "/health") return json({ status: "ready" });
    if (path !== "/tts" || req.method !== "POST") return json({ error: "not_found" }, 404);
    try {
      const body = await req.arrayBuffer();                       // formulaire de quelques centaines d'octets : envoyé d'un bloc
      if (body.byteLength > 16 * 1024) return json({ error: "too_large" }, 413);
      return await port.fetch("http://container/tts", { method: "POST", headers: { "content-type": req.headers.get("content-type") || "" }, body });
    } catch {
      this.ready = false;
      return json({ error: "voice_unavailable" }, 503);
    }
  }
}
