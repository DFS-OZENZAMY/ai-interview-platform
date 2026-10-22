/**
 * Port « synthèse vocale » (TTS), plug and play.
 *  - browser    : voix du navigateur (speechSynthesis), comportement historique ;
 *  - pocket-tts : Kyutai Pocket TTS (100 M de paramètres, tourne sur CPU), un serveur `pocket-tts serve` par langue.
 * La voix est fixée par la configuration du serveur : le navigateur ne choisit ni la voix ni l'URL (pas de SSRF).
 */
const VOICE_OK = /^([a-z][a-z0-9_-]{1,40}|https:\/\/[^\s]{8,300})$/;

export function createTtsProvider(cfg = {}) {
  const kind = (cfg.TTS_PROVIDER || "browser").toLowerCase();
  if (kind === "browser") return null;
  if (kind !== "pocket-tts") throw new Error(`TTS_PROVIDER inconnu : ${kind}`);
  const urls = { fr: cfg.POCKET_TTS_URL_FR, en: cfg.POCKET_TTS_URL_EN };
  const voices = { fr: cfg.POCKET_TTS_VOICE_FR || null, en: cfg.POCKET_TTS_VOICE_EN || null };
  const languages = Object.keys(urls).filter((l) => urls[l]);
  if (!languages.length) throw new Error("TTS_PROVIDER=pocket-tts exige POCKET_TTS_URL_FR et/ou POCKET_TTS_URL_EN");
  for (const l of languages) if (voices[l] && !VOICE_OK.test(voices[l])) throw new Error(`POCKET_TTS_VOICE_${l.toUpperCase()} invalide`);
  return {
    name: "pocket-tts", languages,
    /** Renvoie la Response amont (corps WAV en streaming). */
    async synthesize(text, lang) {
      const form = new FormData(); form.set("text", text); if (voices[lang]) form.set("voice_url", voices[lang]);
      const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 30000);
      try {
        const r = await fetch(urls[lang].replace(/\/+$/, "") + "/tts", { method: "POST", body: form, signal: ctl.signal });
        if (!r.ok || !r.body) throw new Error("tts_http_" + r.status);
        return r;
      } finally { clearTimeout(t); }
    },
  };
}
