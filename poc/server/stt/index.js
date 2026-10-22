/**
 * Port « transcription vocale » (STT), plug and play.
 *  - browser : dictée du navigateur (Web Speech API), comportement historique — aucun serveur ;
 *  - kyutai  : Kyutai STT (moshi-server, modèle stt-1b-en_fr), relayé par NOTRE serveur.
 * Le navigateur parle un protocole neutre : trames binaires PCM float32 mono 24 kHz → ; ← JSON {type: ready|word|vad|done|error}.
 * La clé Kyutai reste côté serveur ; seul un candidat connecté peut ouvrir un flux ; rien n'est enregistré.
 */
import { encode, decode } from "./msgpack.js";

export const SAMPLE_RATE = 24000, FRAME = 1920;            // 80 ms, comme les clients officiels Kyutai
const PAUSE_HEAD = 2;                                       // tête « pause de 2 s » du VAD sémantique (choix d'Unmute)
const MAX_SECONDS = 15 * 60, MAX_FRAME_BYTES = FRAME * 4 * 4;

export function createSttProvider(cfg = {}) {
  const kind = (cfg.STT_PROVIDER || "browser").toLowerCase();
  if (kind === "browser") return null;
  if (kind !== "kyutai") throw new Error(`STT_PROVIDER inconnu : ${kind}`);
  if (!cfg.KYUTAI_STT_URL) throw new Error("STT_PROVIDER=kyutai exige KYUTAI_STT_URL (ex. wss://stt.exemple.ma)");
  let url = cfg.KYUTAI_STT_URL.replace(/\/+$/, ""); if (!/\/api\/asr-streaming$/.test(url)) url += "/api/asr-streaming";
  return { name: "kyutai", url, apiKey: cfg.KYUTAI_STT_API_KEY || "public_token", languages: ["fr", "en"] };
}

/**
 * Relie un client navigateur à Kyutai. Indépendant de l'hôte : l'hôte fournit l'ouverture de la connexion amont
 * (`connectUpstream(url, headers)` → {send, close, onMessage(cb), onClose(cb)}) et l'envoi vers le client.
 */
export async function openSttSession({ provider, connectUpstream, sendToClient, closeClient, log = () => {} }) {
  let closed = false, samples = 0, paused = true, markerResolve = null, stopping = false;
  const finish = (reason) => { if (closed) return; closed = true; try { up && up.close(); } catch {} try { closeClient(); } catch {} log("stt_closed", reason, Math.round(samples / SAMPLE_RATE) + "s"); };
  const up = await connectUpstream(provider.url, { "kyutai-api-key": provider.apiKey });
  up.onMessage((data) => {
    let m; try { m = decode(data); } catch { return; }
    if (m.type === "Ready") sendToClient({ type: "ready" });
    else if (m.type === "Word") { paused = false; sendToClient({ type: "word", text: String(m.text || ""), start: m.start_time ?? null }); }
    else if (m.type === "Step" && Array.isArray(m.prs)) {
      const p = m.prs[PAUSE_HEAD]; if (p > 0.5 && !paused) { paused = true; sendToClient({ type: "vad", endOfSpeech: true }); }
    } else if (m.type === "Marker") { markerResolve && markerResolve(); }
    else if (m.type === "Error") sendToClient({ type: "error", message: "Le service de transcription a signalé une erreur." });
  });
  up.onClose(() => { if (!stopping) sendToClient({ type: "error", message: "Service de transcription interrompu." }); finish("upstream_closed"); });
  return {
    onClientBinary(buf) {
      if (closed || stopping) return;
      // Accepte ArrayBuffer, Buffer, Uint8Array… quel que soit l'environnement (Node, Workers).
      const u8 = ArrayBuffer.isView(buf) ? new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength) : new Uint8Array(buf);
      const bytes = u8.byteLength;
      if (!bytes || bytes % 4 || bytes > MAX_FRAME_BYTES) return;               // trames malformées ignorées
      const pcm = new Float32Array(u8.slice().buffer);
      samples += pcm.length;
      if (samples > MAX_SECONDS * SAMPLE_RATE) { sendToClient({ type: "error", message: "Durée maximale de dictée atteinte." }); return finish("max_duration"); }
      for (let i = 0; i < pcm.length; i++) { const v = pcm[i]; pcm[i] = v > 1 ? 1 : v < -1 ? -1 : (v === v ? v : 0); }
      up.send(encode({ type: "Audio", pcm }));
    },
    async onClientText(txt) {
      let m; try { m = JSON.parse(txt); } catch { return; }
      if (m.type !== "stop" || stopping || closed) return;
      // Vider le modèle comme le client officiel Kyutai : silence, marqueur, puis silence EN CONTINU
      // jusqu'au retour du marqueur (le modèle a 0,5 s de retard) — borné à 4 s.
      stopping = true;
      const silence = new Float32Array(FRAME), frame = () => up.send(encode({ type: "Audio", pcm: silence }));
      for (let i = 0; i < Math.ceil(SAMPLE_RATE / FRAME); i++) frame();
      up.send(encode({ type: "Marker", id: 1 }));
      let got = false; const marker = new Promise((r) => (markerResolve = () => { got = true; r(); }));
      const pump = setInterval(() => { if (!got && !closed) frame(); }, 20);    // ~4× le temps réel
      await Promise.race([marker, new Promise((r) => setTimeout(r, 4000))]);
      clearInterval(pump);
      sendToClient({ type: "done" }); finish("stopped");
    },
    close: () => finish("client_closed"),
  };
}
