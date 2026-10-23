/**
 * Port « source de questions » (plug and play).
 *  - builtin      : null → l'interface utilise sa banque intégrée (comportement historique du POC) ;
 *  - catalog-http : API Edge Function S2-03 d'Achraf (Supabase), via son client S2-04 ;
 *  - catalog-sql  : fonctions SQL question_bank.* sur un PostgreSQL qui contient le schéma S2-03.
 * Interface commune : { name, open({candidateKey, locale}) → ref, next(ref, filters) → turn|null, complete(ref) }.
 * Seules des questions PUBLIÉES après revue humaine peuvent sortir ; le navigateur ne reçoit que la question posée.
 */
export const CATEGORY_LABELS = {
  adaptabilite: "Adaptabilité", apprentissage: "Apprentissage", collaboration: "Collaboration", communication: "Communication",
  influence: "Influence", mises_en_situation: "Mise en situation", motivation: "Motivation", parcours: "Parcours",
  priorisation: "Priorisation", projection: "Projection", realisation: "Réalisations", resolution: "Résolution de problèmes",
  business_analysis: "Analyse métier", cloud_devops: "Cloud et DevOps", cybersecurity: "Cybersécurité", data_ai: "Data et IA",
  software: "Développement logiciel", testing_qa: "Tests et qualité",
};
const RH_MIDDLE = ["mises_en_situation", "resolution", "collaboration", "priorisation", "influence", "adaptabilite", "communication", "apprentissage", "realisation"];
const TECH_BY_ROLE = {
  dev: [["technical", "software"], ["technical", "testing_qa"], ["technical", "cloud_devops"], ["technical", "cybersecurity"]],
  data: [["technical", "data_ai"], ["technical", "business_analysis"], ["technical", "data_ai"]],
  pm: [["technical", "business_analysis"], ["rh", "priorisation"], ["rh", "influence"]],
  rh: [["rh", "mises_en_situation"], ["rh", "resolution"], ["rh", "communication"]],
  sales: [["rh", "influence"], ["rh", "communication"], ["rh", "mises_en_situation"]],
};

/** Plan d'entretien sous forme de filtres (pas de questions) : la sélection réelle est faite tour par tour par le catalogue. */
export function planSlots({ role, level, type, length }) {
  const n = length === "short" ? 5 : 7;
  const base = { junior: 1, mid: 2, senior: 3 }[level] || 1;
  const tech = TECH_BY_ROLE[role] || TECH_BY_ROLE.dev;
  const middle = []; let ri = 0, ti = 0;
  while (middle.length < n - 2) {
    const takeTech = type === "tech" || (type !== "rh" && middle.length % 2 === 1);
    middle.push(takeTech ? tech[ti++ % tech.length] : ["rh", RH_MIDDLE[ri++ % RH_MIDDLE.length]]);
  }
  const slots = [["rh", "parcours"], ...middle, ["rh", "projection"]];
  const half = Math.ceil(middle.length / 2);
  return slots.map(([family, category], i) => ({
    family, category,
    difficulty: i === 0 ? Math.max(1, base - 1) : i === slots.length - 1 ? base : Math.min(3, i <= half ? base : base + 1),
  }));
}
/** Filtres de repli si le catalogue publié ne contient rien pour un créneau précis. */
export function relaxations(slot) {
  return [
    { family: slot.family, category: slot.category, difficulty: slot.difficulty },
    { family: slot.family, category: slot.category },
    { family: slot.family, difficulty: slot.difficulty },
    { family: slot.family },
    {},
  ];
}

/** Identifiant candidat (UUID) stable dérivé de l'identifiant du POC, sans exposer celui-ci au catalogue. */
export async function candidateUuid(userId) {
  const h = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode("repetition:candidate:" + userId)));
  h[6] = (h[6] & 0x0f) | 0x50; h[8] = (h[8] & 0x3f) | 0x80;
  const x = [...h.slice(0, 16)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20, 32)}`;
}

export async function createQuestionSource(cfg = {}, deps = {}) {
  const kind = (cfg.QUESTION_SOURCE || "builtin").toLowerCase();
  if (kind === "builtin") return null;
  if (kind === "catalog-sql") {
    if (!deps.pgPool) throw new Error("QUESTION_SOURCE=catalog-sql exige une base PostgreSQL (DATABASE_URL) contenant le schéma question_bank");
    const { catalogSql } = await import("./catalog-sql.js");
    return catalogSql(deps.pgPool, { engineActorId: cfg.QB_ENGINE_ACTOR_ID });
  }
  if (kind === "catalog-http") {
    const { catalogHttp } = await import("./catalog-http.js");
    return catalogHttp({
      supabaseUrl: cfg.QB_SUPABASE_URL, publishableKey: cfg.QB_PUBLISHABLE_KEY,
      functionUrl: cfg.QB_FUNCTION_URL, email: cfg.QB_ENGINE_EMAIL, password: cfg.QB_ENGINE_PASSWORD,
    });
  }
  throw new Error(`QUESTION_SOURCE inconnu : ${kind}`);
}
