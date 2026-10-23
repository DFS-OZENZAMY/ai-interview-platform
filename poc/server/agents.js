/**
 * Recruteurs virtuels (« agents ») proposés au candidat. Chacun a une voix ElevenLabs, un style de relance
 * et une phrase d'accueil. Les identifiants de voix peuvent être remplacés par configuration
 * (ELEVENLABS_VOICE_<ID> ou AGENTS_JSON) pour utiliser les voix de votre propre compte ElevenLabs.
 */
export const DEFAULT_AGENTS = [
  { id: "lina", name: "Lina", title: "Recruteuse RH bienveillante", color: "#2E6B64",
    description: "Ton chaleureux, relances douces. Idéale pour un premier entraînement ou pour gagner en confiance.",
    style: "Tu es chaleureuse et encourageante. Tes relances sont douces et invitent à développer.",
    greeting: { fr: "Bonjour, je suis Lina. Prenez votre temps, nous sommes là pour nous entraîner.", en: "Hello, I'm Lina. Take your time, this is practice." },
    strictness: 1, voice: "EXAVITQu4vr4xnSDxMaL" },
  { id: "karim", name: "Karim", title: "Manager technique exigeant", color: "#3B5BA9",
    description: "Va droit au but et demande des précisions concrètes : outils, choix techniques, résultats mesurés.",
    style: "Tu es un manager technique direct et exigeant. Tes relances demandent des précisions concrètes et techniques, sans agressivité.",
    greeting: { fr: "Bonjour, Karim, je dirige l'équipe. Allons droit au but.", en: "Hi, I'm Karim, I lead the team. Let's get straight to it." },
    strictness: 3, voice: "JBFqnCBsd6RMkjVDRZzb" },
  { id: "sofia", name: "Sofia", title: "DRH pressée, entretien sous tension", color: "#8A4B6E",
    description: "Peu de temps, questions courtes, attend des réponses chiffrées. Pour s'entraîner à la pression.",
    style: "Tu es une DRH pressée. Tes relances sont très courtes et exigent des résultats chiffrés.",
    greeting: { fr: "Bonjour. Sofia, DRH. J'ai peu de temps, soyez concis.", en: "Hello. Sofia, HR director. I'm short on time, so be concise." },
    strictness: 3, voice: "21m00Tcm4TlvDq8ikWAM" },
  { id: "adam", name: "Adam", title: "Coach d'entraînement pédagogue", color: "#B07A1E",
    description: "Pose les questions comme un recruteur, mais relance pour vous faire structurer vos réponses (méthode STAR).",
    style: "Tu es un coach pédagogue. Tes relances aident le candidat à structurer sa réponse : contexte, action, résultat.",
    greeting: { fr: "Bonjour, je suis Adam, votre coach. Je vais vous aider à structurer vos réponses.", en: "Hello, I'm Adam, your coach. I'll help you structure your answers." },
    strictness: 2, voice: "pNInz6obpgDQGcFmaJgB" },
];

export function loadAgents(cfg = {}) {
  let agents = DEFAULT_AGENTS.map((a) => ({ ...a }));
  if (cfg.AGENTS_JSON) {
    try {
      const extra = JSON.parse(cfg.AGENTS_JSON);
      for (const x of Array.isArray(extra) ? extra : []) {
        if (!/^[a-z][a-z0-9_-]{1,30}$/.test(x.id || "")) continue;
        const i = agents.findIndex((a) => a.id === x.id);
        if (i >= 0) agents[i] = { ...agents[i], ...x }; else agents.push({ strictness: 2, color: "#2E6B64", greeting: {}, ...x });
      }
    } catch { console.error("AGENTS_JSON invalide : ignoré"); }
  }
  for (const a of agents) { const v = cfg["ELEVENLABS_VOICE_" + a.id.toUpperCase()]; if (v) a.voice = v; }
  return agents.filter((a) => /^[A-Za-z0-9]{8,40}$/.test(a.voice || ""));
}
/** Styles de relance proposés pour les recruteurs créés depuis l'écran « Voix ». */
export const STYLE_PRESETS = {
  lina: { label: "Bienveillant", style: DEFAULT_AGENTS[0].style, strictness: 1 },
  karim: { label: "Exigeant et technique", style: DEFAULT_AGENTS[1].style, strictness: 3 },
  sofia: { label: "Pressé, sous tension", style: DEFAULT_AGENTS[2].style, strictness: 3 },
  adam: { label: "Pédagogue (méthode STAR)", style: DEFAULT_AGENTS[3].style, strictness: 2 },
};
/** Informations publiques (sans identifiant de voix) pour l'interface. */
export const publicAgent = (a, voices = {}) => ({ id: a.id, name: a.name, title: a.title, description: a.description, color: a.color, greeting: a.greeting, strictness: a.strictness,
  followupStyle: a.followupStyle || a.id, custom: !!a.custom, voices });
