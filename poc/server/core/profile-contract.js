/* ==========================================================================
   Contrat de profil candidat — candidate-profile-v1 (S2-01 → S2-02)
   Source unique : utilisée par le Worker (validation serveur) et intégrée
   telle quelle dans l'interface (validation client et mode démo).
   ========================================================================== */
const PROFILE_VERSION = "candidate-profile-v1";

const PC = {
  STATUSES: {
    student: "Étudiant·e",
    graduate: "Jeune diplômé·e",
    employed: "Salarié·e ou en poste",
    jobseeker: "En recherche d’emploi",
    reconversion: "En reconversion",
    other: "Autre situation",
  },
  DEGREES: { bac: "Baccalauréat", bac2: "Bac+2 (BTS, DUT, DEUG…)", bac3: "Licence / Bac+3", bac5: "Master / Ingénieur / Bac+5", phd: "Doctorat", other: "Autre formation" },
  GOALS: { first_job: "Décrocher un premier emploi", change_job: "Changer de poste ou d’entreprise", promotion: "Évoluer (promotion, nouvelles responsabilités)", general: "M’entraîner de façon générale" },
  REASONS: ["Gagner en confiance avant un vrai entretien", "Préparer un entretien précis", "Changer de secteur", "Progresser à l’oral", "Mieux valoriser mon parcours", "Préparer un retour à l’emploi"],
  AXES: { communication: "Communication", confidence: "Confiance en soi", structure: "Structurer mes réponses", knowledge: "Connaissances métier", stress: "Gestion du stress" },
  SECTORS: ["Technologies et logiciels", "Banque, finance, assurance", "Industrie", "Commerce et distribution", "Conseil", "Télécoms", "Santé", "Éducation et formation", "Administration publique", "Énergie", "Transport et logistique", "Tourisme et hôtellerie", "BTP et immobilier", "Médias et communication", "Agroalimentaire", "Associatif"],
  LANGUAGES: ["Français", "Anglais", "Arabe", "Amazigh", "Espagnol", "Allemand", "Italien", "Portugais", "Néerlandais", "Turc", "Chinois", "Japonais"],
  CEFR: {
    A1: ["Débutant", "Je comprends et utilise quelques expressions très simples."],
    A2: ["Élémentaire", "Je peux échanger sur des sujets simples et familiers."],
    B1: ["Intermédiaire", "Je peux converser sur des sujets courants et décrire mes expériences."],
    B2: ["Intermédiaire avancé", "Je peux participer à des discussions professionnelles et expliquer mes idées clairement."],
    C1: ["Avancé", "Je m’exprime avec aisance sur des sujets complexes."],
    C2: ["Maîtrise", "Je comprends presque tout et m’exprime avec précision et nuance."],
  },
  UI_LANGS: { fr: "Français", en: "English" },
  JOBS: ["Développeur·se web", "Développeur·se full-stack", "Développeur·se mobile", "Ingénieur·e logiciel", "Ingénieur·e DevOps", "Data analyst", "Data scientist", "Data engineer", "Chef·fe de projet", "Product manager", "Product owner", "Scrum master", "Chargé·e RH", "Chargé·e de recrutement", "Responsable RH", "Commercial·e", "Business developer", "Account manager", "Chargé·e de clientèle", "Chargé·e de marketing", "Community manager", "Contrôleur·se de gestion", "Comptable", "Analyste financier·ère", "Auditeur·rice", "Designer UX/UI", "Consultant·e", "Juriste", "Assistant·e de direction", "Technicien·ne support", "Administrateur·rice systèmes et réseaux", "Ingénieur·e cybersécurité", "Acheteur·se", "Logisticien·ne", "Ingénieur·e industriel·le", "Enseignant·e", "Infirmier·ère"],
  // Familles de métiers : mots-clés → suggestions déterministes (fallback sans IA)
  FAMILIES: {
    dev: { kw: ["dévelop", "develop", "logiciel", "software", "web", "front", "back", "full", "mobile", "devops", "programm"], role: "dev",
      skills: ["JavaScript", "Python", "Java", "SQL", "Git", "API REST", "Tests automatisés", "React", "Node.js", "Docker", "Architecture logicielle", "Sécurité applicative", "Revue de code", "Méthodes agiles"] },
    data: { kw: ["data", "donnée", "analyst", "analyste", "bi ", "business intelligence", "scien", "statisti"], role: "data",
      skills: ["SQL", "Python", "Excel avancé", "Power BI", "Tableau", "Statistiques", "Machine learning", "Nettoyage de données", "Visualisation", "Storytelling avec les données", "Modélisation", "A/B testing"] },
    rh: { kw: ["rh", "ressources humaines", "recrut", "talent", "paie", "human"], role: "rh",
      skills: ["Recrutement", "Conduite d’entretien", "Droit du travail", "Onboarding", "Gestion de la paie", "SIRH", "Marque employeur", "Relations sociales", "Gestion des compétences", "Formation"] },
    sales: { kw: ["commercial", "vente", "sales", "business dev", "account", "clientèle", "client"], role: "sales",
      skills: ["Prospection", "Négociation", "Découverte des besoins", "Traitement des objections", "CRM", "Closing", "Fidélisation", "Gestion de portefeuille", "Pitch", "Prévisions de ventes"] },
    pm: { kw: ["projet", "project", "product", "scrum", "pmo", "owner"], role: "pm",
      skills: ["Planification", "Gestion des risques", "Gestion budgétaire", "Méthodes agiles", "Animation d’équipe", "Gestion des parties prenantes", "Priorisation", "Jira", "Rédaction de spécifications", "Reporting"] },
    finance: { kw: ["compta", "financ", "gestion", "audit", "contrôl"], role: null,
      skills: ["Comptabilité générale", "Analyse financière", "Excel avancé", "Contrôle de gestion", "Normes IFRS", "Fiscalité", "Audit", "Reporting financier", "ERP (SAP…)", "Budget et prévisions"] },
    marketing: { kw: ["marketing", "communication", "community", "brand", "contenu"], role: null,
      skills: ["Stratégie de contenu", "Réseaux sociaux", "SEO", "Google Analytics", "Rédaction", "Gestion de campagnes", "Marketing automation", "Étude de marché", "Événementiel", "Relations presse"] },
    design: { kw: ["design", "ux", "ui", "graph"], role: null,
      skills: ["Figma", "Recherche utilisateur", "Prototypage", "Design system", "Accessibilité", "Tests utilisateurs", "Architecture de l’information", "Design d’interface"] },
  },
  SOFT_SKILLS: ["Communication orale", "Travail en équipe", "Organisation", "Résolution de problèmes", "Adaptabilité", "Esprit d’analyse", "Leadership", "Gestion du stress", "Prise de parole en public", "Anglais professionnel"],
};

function jobFamily(job) {
  const j = ` ${String(job || "").toLowerCase()} `;
  for (const [k, f] of Object.entries(PC.FAMILIES)) if (f.kw.some((w) => j.includes(w))) return k;
  return null;
}
function suggestedSkills(job) {
  const f = jobFamily(job);
  return [...(f ? PC.FAMILIES[f].skills : []), ...PC.SOFT_SKILLS];
}
/** Séniorité initiale : uniquement d'après l'expérience déclarée (décision Q8). */
function deriveSeniority(status, years) {
  const y = Number(years) || 0;
  let level;
  if (status === "student" && y < 2) level = "student";
  else if (y < 2) level = "junior";
  else if (y < 5) level = "mid";
  else level = "senior";
  return { level, years: y, basis: "declared_experience" };
}
const SENIORITY_LABEL = { student: "Étudiant·e", junior: "Junior (0 à 2 ans)", mid: "Confirmé·e (2 à 5 ans)", senior: "Senior (5 ans et plus)" };

const isProStatus = (s) => s === "employed" || s === "jobseeker";
const isEduStatus = (s) => s === "student" || s === "graduate";
const txt = (v, max) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const list = (v, max, n) => (Array.isArray(v) ? v : []).map((x) => txt(x, max)).filter(Boolean).filter((x, i, a) => a.indexOf(x) === i).slice(0, n);
const num = (v) => (v === "" || v === null || v === undefined ? NaN : Number(String(v).replace(",", ".")));

/**
 * Valide une étape (1 à 5) ou le profil complet (step = "all").
 * Retourne { ok, errors: {champ: message}, warnings: {champ: message}, value } ; value = profil normalisé.
 * Règles : seules les questions secondaires sont facultatives (Q10) ; rien d'inventé pour une question ignorée.
 */
function validateProfile(d, step = "all") {
  d = d || {};
  const E = {}, W = {}, all = step === "all", at = (n) => all || step === n;
  const sit = d.situation || {}, bg = d.background || {}, mo = d.motivation || {}, la = d.languages || {}, sk = d.skills || {};
  const status = Object.keys(PC.STATUSES).includes(sit.status) ? sit.status : null;
  const out = { version: PROFILE_VERSION };

  // Écran 1 — Situation et métier
  out.situation = { status, targetJob: txt(sit.targetJob, 80), currentJob: txt(sit.currentJob, 80) || null, specialization: txt(sit.specialization, 80) || null };
  if (at(1)) {
    if (!status) E["situation.status"] = "Choisissez votre situation actuelle.";
    if (out.situation.targetJob.length < 2) E["situation.targetJob"] = "Indiquez le métier que vous visez.";
    if ((isProStatus(status) || status === "reconversion") && (!out.situation.currentJob || out.situation.currentJob.length < 2))
      E["situation.currentJob"] = status === "reconversion" ? "Indiquez votre métier d’origine." : status === "jobseeker" ? "Indiquez votre dernier poste." : "Indiquez votre poste actuel.";
  }
  if (!(isProStatus(status) || status === "reconversion")) out.situation.currentJob = null;

  // Écran 2 — Parcours et expérience
  const years = num(bg.yearsExperience);
  out.background = { yearsExperience: Number.isFinite(years) ? Math.round(years * 2) / 2 : null };
  if (isEduStatus(status)) {
    const ed = bg.education || {};
    out.background.education = {
      degree: Object.keys(PC.DEGREES).includes(ed.degree) ? ed.degree : null, field: txt(ed.field, 100),
      institution: txt(ed.institution, 120) || null, internships: list(ed.internships, 160, 6), projects: list(ed.projects, 160, 6),
      firstExperiences: status === "graduate" ? list(ed.firstExperiences, 160, 6) : [],
    };
  }
  if (isProStatus(status)) {
    const pr = bg.professional || {}; const yr = num(pr.yearsInRole);
    out.background.professional = { yearsInRole: Number.isFinite(yr) ? Math.round(yr * 2) / 2 : null, sectors: list(pr.sectors, 60, 6), responsibilities: txt(pr.responsibilities, 600) || null };
  }
  if (status === "reconversion") {
    const rc = bg.reconversion || {};
    out.background.reconversion = { transferable: txt(rc.transferable, 600) || null, reason: txt(rc.reason, 300) || null };
  }
  if (status === "other") out.background.description = txt(bg.description, 400) || null;
  if (at(2) && status) {
    if (!Number.isFinite(years)) E["background.yearsExperience"] = "Indiquez votre nombre d’années d’expérience (0 si aucune).";
    else if (years < 0 || years > 50) E["background.yearsExperience"] = "Indiquez un nombre entre 0 et 50.";
    else if (isEduStatus(status) && years > 8) W["background.yearsExperience"] = `${years} ans d’expérience pour un statut ${status === "student" ? "étudiant" : "jeune diplômé"} : vérifiez la valeur ou votre situation.`;
    else if (isProStatus(status) && years === 0) W["background.yearsExperience"] = "0 an d’expérience pour une personne en poste : vérifiez la valeur.";
    if (isEduStatus(status)) {
      if (!out.background.education.degree) E["background.education.degree"] = "Choisissez votre niveau de diplôme (en cours ou obtenu).";
      if (out.background.education.field.length < 2) E["background.education.field"] = "Indiquez votre formation ou spécialité.";
    }
    if (isProStatus(status)) {
      const yr = out.background.professional.yearsInRole;
      if (yr !== null && (yr < 0 || (Number.isFinite(years) && yr > years))) E["background.professional.yearsInRole"] = "Les années dans ce poste ne peuvent pas dépasser votre expérience totale.";
      if (!out.background.professional.sectors.length) E["background.professional.sectors"] = "Choisissez au moins un secteur.";
    }
  }

  // Écran 3 — Motivations et objectifs
  out.motivation = { goal: Object.keys(PC.GOALS).includes(mo.goal) ? mo.goal : null, reasons: list(mo.reasons, 120, 8), reasonText: txt(mo.reasonText, 200) || null, axes: list(mo.axes, 20, 5).filter((a) => a in PC.AXES) };
  if (at(3) && status) {
    if (!out.motivation.goal) E["motivation.goal"] = "Choisissez votre objectif principal.";
    if (!out.motivation.reasons.length && !out.motivation.reasonText) E["motivation.reasons"] = "Choisissez une motivation ou écrivez-la en quelques mots.";
    if (!out.motivation.axes.length) E["motivation.axes"] = "Choisissez au moins un axe de progression.";
  }

  // Écran 4 — Langues
  const seen = new Set();
  out.languages = {
    spoken: (Array.isArray(la.spoken) ? la.spoken : []).map((l) => ({ language: txt(l && l.language, 40), level: l && l.level in PC.CEFR ? l.level : null, selfDeclared: true }))
      .filter((l) => l.language && !seen.has(l.language.toLowerCase()) && seen.add(l.language.toLowerCase())).slice(0, 8),
    preferredInterface: la.preferredInterface in PC.UI_LANGS ? la.preferredInterface : null,
  };
  if (at(4) && status) {
    if (!out.languages.spoken.length) E["languages.spoken"] = "Ajoutez au moins une langue.";
    else if (out.languages.spoken.some((l) => !l.level)) E["languages.spoken"] = "Choisissez un niveau pour chaque langue.";
    if (!out.languages.preferredInterface) E["languages.preferredInterface"] = "Choisissez votre langue préférée pour l’interface.";
  }

  // Écran 5 — Compétences et intérêts (acquises ≠ à développer)
  const skill = (s) => ({ label: txt(s && s.label, 60), source: ["catalog", "ai", "free"].includes(s && s.source) ? s.source : "free" });
  const uniq = (arr) => { const k = new Set(); return arr.filter((s) => s.label && !k.has(s.label.toLowerCase()) && k.add(s.label.toLowerCase())); };
  const acquired = uniq((Array.isArray(sk.acquired) ? sk.acquired : []).map(skill)).slice(0, 20);
  const acqKeys = new Set(acquired.map((s) => s.label.toLowerCase()));
  out.skills = { acquired, toDevelop: uniq((Array.isArray(sk.toDevelop) ? sk.toDevelop : []).map(skill)).filter((s) => !acqKeys.has(s.label.toLowerCase())).slice(0, 20) };
  if (at(5) && status && !out.skills.toDevelop.length) E["skills.toDevelop"] = "Choisissez au moins un sujet à développer.";

  out.seniority = deriveSeniority(status, out.background.yearsExperience);
  return { ok: !Object.keys(E).length, errors: E, warnings: W, value: out };
}

export { PROFILE_VERSION, PC, jobFamily, suggestedSkills, deriveSeniority, SENIORITY_LABEL, validateProfile };
