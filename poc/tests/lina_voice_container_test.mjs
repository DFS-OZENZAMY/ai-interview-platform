/** Teste le Durable Object LinaVoice et le fournisseur TTS « conteneur intégré » avec un faux ctx.container
 * qui simule le démarrage à froid puis relaie vers un faux pocket-tts serve.
 * Usage : POCKET=http://127.0.0.1:8096 node lina_voice_container_test.mjs */
import { LinaVoice } from "../server/hosts/lina-voice.js";
import { createTtsProvider } from "../server/tts/index.js";
const ok = (c, m) => console.log((c ? "PASS " : "FAIL ") + m);
const POCKET = process.env.POCKET;
function fakeContainer({ bootMs = 1500 } = {}) {
  const st = { running: false, starts: 0, bootUntil: 0, idle: null, crashed: false, startOpts: null };
  return {
    st,
    get running() { return st.running; },
    start(opts) { st.running = true; st.starts++; st.startOpts = opts; st.bootUntil = Date.now() + bootMs; },
    async setInactivityTimeout(ms) { st.idle = ms; },
    getTcpPort(port) {
      return { fetch: async (url, init) => {
        if (port !== 8000) throw new Error("mauvais port");
        if (!st.running || Date.now() < st.bootUntil || st.crashed) throw new Error("connexion refusée");
        return fetch(POCKET + new URL(url).pathname, { ...init, duplex: "half" });
      } };
    },
  };
}
// 1. Démarrage à froid, attente, relais
const c = fakeContainer(); const lv = new LinaVoice({ container: c }, {});
const form = () => { const f = new FormData(); f.set("text", "Bonjour, je suis Lina."); f.set("voice_url", "estelle"); return f; };
let t0 = Date.now(); let r = await lv.fetch(new Request("http://lina-voice/tts", { method: "POST", body: form() }));
const wav = new Uint8Array(await r.arrayBuffer()); const cold = Date.now() - t0;
ok(r.status === 200 && new TextDecoder().decode(wav.slice(0, 4)) === "RIFF", `démarrage à froid : conteneur lancé puis WAV relayé (${(cold / 1000).toFixed(1)} s)`);
ok(c.st.starts === 1 && c.st.startOpts.enableInternet === false && c.st.startOpts.env.HF_HUB_OFFLINE === "1", "conteneur démarré une fois, sans Internet, modèle hors ligne");
ok(c.st.idle === 600000, "extinction automatique après 10 min d'inactivité");
t0 = Date.now(); r = await lv.fetch(new Request("http://lina-voice/tts", { method: "POST", body: form() })); await r.arrayBuffer();
ok(c.st.starts === 1 && Date.now() - t0 < cold, `conteneur chaud : réutilisé (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
// 2. Requêtes simultanées au démarrage : un seul démarrage
const c2 = fakeContainer(); const lv2 = new LinaVoice({ container: c2 }, {});
const rs = await Promise.all([1, 2, 3].map(() => lv2.fetch(new Request("http://lina-voice/health"))));
ok(rs.every((x) => x.status === 200) && c2.st.starts === 1, "3 requêtes simultanées au démarrage : un seul conteneur lancé");
// 3. Panne puis reprise
c.st.crashed = true; r = await lv.fetch(new Request("http://lina-voice/tts", { method: "POST", body: form() }));
ok(r.status === 503 && lv.ready === false, "conteneur en panne : 503 propre (la plateforme reprend la voix du navigateur)");
c.st.crashed = false; r = await lv.fetch(new Request("http://lina-voice/health")); ok(r.status === 200, "reprise automatique quand le conteneur répond de nouveau");
// 4. Routes non prévues refusées, absence de conteneur
ok((await lv.fetch(new Request("http://lina-voice/docs"))).status === 404, "seules /tts et /health sont relayées");
ok((await new LinaVoice({}, {}).fetch(new Request("http://lina-voice/health"))).status === 503, "sans conteneur configuré : 503");
// 5. Fournisseur TTS de la plateforme branché sur le conteneur intégré
const c3 = fakeContainer({ bootMs: 300 }); const lv3 = new LinaVoice({ container: c3 }, {});
const tts = createTtsProvider({ TTS_PROVIDER: "pocket-tts", POCKET_TTS_VOICE_FR: "estelle" }, { container: (req) => lv3.fetch(req) });
ok(tts.embedded && tts.languages.join() === "fr", "fournisseur : conteneur intégré pour le français");
ok(await tts.warmup(), "pré-chauffage : conteneur prêt avant la première question");
const up = await tts.synthesize("Pour commencer, présentez-vous en deux minutes.", "fr"); const b = new Uint8Array(await up.arrayBuffer());
ok(up.ok && b.length > 10000, `synthèse via le conteneur : ${Math.round(b.length / 1024)} Ko de WAV`);
