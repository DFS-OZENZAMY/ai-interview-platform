/** Objectifs de préparation et spécialités — repris du moteur S2-04 d'Achraf (dev/local-preview/ai_interview.py). */
export const RH_GOALS = {
  rh_motivation: "Motivation et projet", rh_parcours: "Présenter mon parcours", rh_teamwork: "Travail en équipe",
  rh_leadership: "Leadership", rh_behavioral: "Mises en situation", rh_conflict: "Gestion des conflits",
  communication: "Communication", answer_structure: "Structurer mes réponses", confidence: "Confiance en soi", stress_management: "Gestion du stress",
};
export const TECH_GOALS_GENERAL = {
  tech_fundamentals: "Fondamentaux", tech_problem_solving: "Résolution de problèmes", tech_architecture: "Architecture",
  tech_debugging: "Débogage", tech_practices: "Bonnes pratiques", tech_reasoning: "Raisonnement",
  tech_explain: "Expliquer clairement", tech_incident: "Gestion d’incident",
};
export const TECH_DOMAINS = {
  software: { label: "Développement logiciel", goals: { tech_api: "API / backend", tech_system_design: "Architecture système" } },
  data_ai: { label: "Data & IA", goals: { tech_sql: "SQL", tech_data_pipelines: "Pipelines et qualité des données", tech_ml: "Machine learning" } },
  cloud_devops: { label: "Cloud & DevOps", goals: { tech_cloud: "Cloud / infrastructure", tech_cicd: "CI/CD", tech_observability: "Observabilité" } },
  cybersecurity: { label: "Cybersécurité", goals: { tech_security: "Vulnérabilités", tech_threat_model: "Modèles de menace", tech_iam: "Gestion des identités (IAM)" } },
  testing_qa: { label: "Tests & qualité", goals: { tech_automation: "Automatisation", tech_quality: "Qualité", tech_test_strategy: "Stratégie de test" } },
  business_analysis: { label: "Business analysis", goals: { tech_requirements: "Cadrage des besoins", tech_user_stories: "User stories", tech_stakeholders: "Parties prenantes" } },
};
export const ALL_TECH_GOALS = new Set([...Object.keys(TECH_GOALS_GENERAL), ...Object.values(TECH_DOMAINS).flatMap((d) => Object.keys(d.goals))]);
/** Objectifs RH → catégories de questions à privilégier (RH_CATEGORIES d'Achraf). */
export const RH_GOAL_CATEGORIES = {
  rh_motivation: ["motivation", "projection"], rh_parcours: ["parcours", "realisation"], rh_teamwork: ["collaboration"],
  rh_leadership: ["influence"], rh_behavioral: ["mises_en_situation", "resolution"], rh_conflict: ["collaboration", "influence"],
  communication: ["communication"], answer_structure: ["parcours", "mises_en_situation"], stress_management: ["priorisation", "mises_en_situation"],
};
/** Valide les objectifs pour un type d'entretien ; retourne la liste nettoyée (8 au maximum). */
export function cleanGoals(goals, type) {
  const okRh = type !== "tech", okTech = type !== "rh";
  return [...new Set((Array.isArray(goals) ? goals : []).filter((g) => (okRh && g in RH_GOALS) || (okTech && ALL_TECH_GOALS.has(g))))].slice(0, 8);
}
