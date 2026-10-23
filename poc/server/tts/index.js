/**
 * Port « synthèse vocale » (TTS), plug and play.
 *  - browser    : voix du navigateur (speechSynthesis), comportement historique ;
 *  - pocket-tts : Kyutai Pocket TTS (100 M de paramètres, tourne sur CPU), un serveur `pocket-tts serve` par langue.
 * La voix est fixée par la configuration du serveur : le navigateur ne choisit ni la voix ni l'URL (pas de SSRF).
 */
const VOICE_OK = /^([a-z][a-z0-9_-]{1,40}|https:\/\/[^\s]{8,300})$/;

/**
 * @param deps.container  facultatif : (request) => Response — conteneur Pocket TTS intégré (Cloudflare Containers).
 *                        Utilisé pour le français quand aucune URL POCKET_TTS_URL_FR n'est fournie.
 */
export function createTtsProvider(cfg = {}, deps = {}) {
  const kind = (cfg.TTS_PROVIDER || "browser").toLowerCase();
  if (kind === "browser") return null;
  if (kind === "elevenlabs") return elevenLabsTts(cfg);
  if (kind !== "pocket-tts") throw new Error(`TTS_PROVIDER inconnu : ${kind}`);
  const urls = { fr: cfg.POCKET_TTS_URL_FR || (deps.container ? "container://lina-voice" : null), en: cfg.POCKET_TTS_URL_EN };
  const voices = { fr: cfg.POCKET_TTS_VOICE_FR || null, en: cfg.POCKET_TTS_VOICE_EN || null };
  const languages = Object.keys(urls).filter((l) => urls[l]);
  if (!languages.length) throw new Error("TTS_PROVIDER=pocket-tts exige POCKET_TTS_URL_FR et/ou POCKET_TTS_URL_EN");
  for (const l of languages) if (voices[l] && !VOICE_OK.test(voices[l])) throw new Error(`POCKET_TTS_VOICE_${l.toUpperCase()} invalide`);
  return {
    name: "pocket-tts", languages, embedded: urls.fr === "container://lina-voice",
    /** Démarre le conteneur à l'avance (évite d'attendre au moment de la première question). */
    async warmup() { if (deps.container && urls.fr === "container://lina-voice") { const r = await deps.container(new Request("http://lina-voice/health")); return r.ok; } return true; },
    /** Renvoie la Response amont (corps WAV en streaming). */
    async synthesize(text, lang) {
      const form = new FormData(); form.set("text", text); if (voices[lang]) form.set("voice_url", voices[lang]);
      const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), urls[lang].startsWith("container://") ? 100000 : 30000);   // démarrage à froid du conteneur
      try {
        const target = urls[lang].replace(/\/+$/, "") + "/tts";
        const r = target.startsWith("container://")
          ? await deps.container(new Request("http://lina-voice/tts", { method: "POST", body: form, signal: ctl.signal }))
          : await fetch(target, { method: "POST", body: form, signal: ctl.signal });
        if (!r.ok || !r.body) throw new Error("tts_http_" + r.status);
        return r;
      } finally { clearTimeout(t); }
    },
  };
}

/**
 * ElevenLabs. Modèle par défaut : Eleven v4 Turbo (le plus réaliste en temps réel, ~100 ms d'inférence).
 * Repli automatique si le compte n'y a pas accès : Multilingual v2 (très naturel) puis Flash v2.5.
 * La voix est choisie par le serveur à partir de l'agent (jamais fournie par le navigateur). Clé uniquement côté serveur.
 */
const MODEL_CHAIN = ["eleven_v4_turbo", "eleven_multilingual_v2", "eleven_flash_v2_5"];
const NO_LANGUAGE_CODE = new Set(["eleven_multilingual_v2"]);   // paramètre non pris en charge par ce modèle
function elevenLabsTts(cfg) {
  if (!cfg.ELEVENLABS_API_KEY) { console.warn("TTS_PROVIDER=elevenlabs sans ELEVENLABS_API_KEY : voix du navigateur"); return null; }
  const base = (cfg.ELEVENLABS_BASE_URL || "https://api.elevenlabs.io").replace(/\/+$/, "");
  const key = cfg.ELEVENLABS_API_KEY;
  const chain = cfg.ELEVENLABS_TTS_MODEL ? [cfg.ELEVENLABS_TTS_MODEL, ...MODEL_CHAIN.filter((m) => m !== cfg.ELEVENLABS_TTS_MODEL)] : MODEL_CHAIN;
  let working = null;                                            // premier modèle accepté par le compte, mémorisé
  const api = async (path, init = {}) => {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 30000);
    try { return await fetch(base + path, { ...init, signal: ctl.signal, headers: { "xi-api-key": key, ...(init.headers || {}) } }); }
    finally { clearTimeout(t); }
  };
  const provider = {
    name: "elevenlabs", languages: ["fr", "en"], perAgentVoice: true, contentType: "audio/mpeg",
    get model() { return working || chain[0]; },
    async warmup() { return true; },
    async synthesize(text, lang, { voice } = {}) {
      if (!/^[A-Za-z0-9]{8,40}$/.test(voice || "")) throw new Error("tts_bad_voice");
      const models = working ? [working] : chain;
      let last = null;
      for (const model of models) {
        const body = { text, model_id: model, voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.15, use_speaker_boost: true } };
        if (!NO_LANGUAGE_CODE.has(model)) body.language_code = lang === "en" ? "en" : "fr";
        const r = await api(`/v1/text-to-speech/${voice}/stream?output_format=mp3_44100_128`, { method: "POST", headers: { "content-type": "application/json", accept: "audio/mpeg" }, body: JSON.stringify(body) });
        if (r.ok && r.body) { if (working !== model) { working = model; console.log("elevenlabs_model", model); } return r; }
        last = r.status;
        if (![400, 403, 404, 422].includes(r.status)) break;      // erreur non liée au modèle (clé, quota…) : inutile d'essayer les autres
      }
      throw new Error("tts_http_" + last);
    },
    /* Administration des voix (écran « Voix des recruteurs ») */
    /** Accents réellement présents dans la bibliothèque pour une langue (liste découverte chez ElevenLabs). */
    async accents(language = "fr") {
      const q = new URLSearchParams({ language, page_size: "100" });
      const r = await api(`/v1/shared-voices?${q}`);
      if (!r.ok) throw new Error("library_http_" + r.status);
      const count = {};
      for (const v of (await r.json()).voices || []) if (v.accent) count[v.accent] = (count[v.accent] || 0) + 1;
      return Object.entries(count).sort((a, b) => b[1] - a[1]).map(([accent, n]) => ({ accent, n }));
    },
    async library({ gender, search, page = 0, language = "fr", accent } = {}) {
      const q = new URLSearchParams({ language, page_size: "24", page: String(page) });
      if (accent) q.set("accent", String(accent).slice(0, 40));
      if (gender === "male" || gender === "female") q.set("gender", gender);
      if (search) q.set("search", String(search).slice(0, 60));
      const r = await api(`/v1/shared-voices?${q}`);
      if (!r.ok) throw new Error("library_http_" + r.status);
      const j = await r.json();
      return { hasMore: !!j.has_more, voices: (j.voices || []).map((v) => ({ voiceId: v.voice_id, ownerId: v.public_owner_id, name: v.name, gender: v.gender, age: v.age, accent: v.accent, useCase: v.use_case, description: (v.description || "").slice(0, 240), previewUrl: v.preview_url, language: v.language })) };
    },
    async addShared(ownerId, voiceId, name) {
      if (!/^[A-Za-z0-9]{8,80}$/.test(ownerId || "") || !/^[A-Za-z0-9]{8,40}$/.test(voiceId || "")) throw new Error("bad_voice_ref");
      const r = await api(`/v1/voices/add/${ownerId}/${voiceId}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ new_name: String(name).slice(0, 60) }) });
      if (!r.ok) throw new Error("add_voice_http_" + r.status);
      const j = await r.json(); return j.voice_id;
    },
  };
  return provider;
}
