/**
 * Préparation du texte pour la voix de Lina : on écrit pour l'œil, on parle pour l'oreille.
 * Objectif : une diction naturelle, avec des respirations aux bons endroits, sans changer le sens.
 *  - nettoie ce qui se lit mal à voix haute (markdown, émojis, URL, guillemets typographiques) ;
 *  - dit les sigles et les notations (« RH », « 1re », « 3/5 ») comme une personne ;
 *  - ajoute de petites pauses (virgules, points de suspension) après les interjections et avant les questions ;
 *  - découpe les phrases trop longues pour que l'intonation reste vivante.
 */
const FR_ACRONYMS = [[/\bRH\b/g, "R H"], [/\bDRH\b/g, "D R H"], [/\bCDI\b/g, "C D I"], [/\bCDD\b/g, "C D D"], [/\bKPI\b/g, "K P I"], [/\bSQL\b/g, "S Q L"], [/\bAPI\b/g, "A P I"], [/\bIA\b/g, "I A"], [/\bCV\b/g, "C V"]];
const EN_ACRONYMS = [[/\bHR\b/g, "H R"], [/\bKPIs?\b/g, "K P I"], [/\bSQL\b/g, "sequel"], [/\bAPI\b/g, "A P I"], [/\bAI\b/g, "A I"], [/\bCV\b/g, "C V"]];
const ORDINALS_FR = [[/\b1re\b/g, "première"], [/\b1er\b/g, "premier"], [/\b2e\b/g, "deuxième"], [/\b2nde\b/g, "seconde"], [/\b3e\b/g, "troisième"]];
const FILLERS_FR = /^(hmm+|euh|ah|oh)\b[,.]?\s+/i;

export function prepareForSpeech(input, lang = "fr") {
  let t = String(input || "");
  t = t.replace(/https?:\/\/\S+/g, "").replace(/[*_`#>~]+/g, "");                 // markdown, liens
  t = t.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, "");            // émojis
  t = t.replace(/[“”«»]/g, "\"").replace(/[‘’`]/g, "'").replace(/[–—]/g, ", ");    // guillemets, tirets
  t = t.replace(/\s*\(([^)]{1,60})\)/g, ", $1,");                                  // parenthèses → incise
  t = t.replace(/(\d+)\s*\/\s*(\d+)/g, lang === "en" ? "$1 out of $2" : "$1 sur $2");
  for (const [rx, to] of (lang === "en" ? EN_ACRONYMS : FR_ACRONYMS)) t = t.replace(rx, to);
  if (lang !== "en") for (const [rx, to] of ORDINALS_FR) t = t.replace(rx, to);
  t = t.replace(/\s+/g, " ").replace(/\s+([,.;:!?])/g, "$1").replace(/,\s*,/g, ",").replace(/,\s*([.!?])/g, "$1").trim();
  // Respiration après une interjection d'ouverture (« Merci. » → « Merci, »), sans toucher aux vraies phrases.
  if (lang !== "en") t = t.replace(FILLERS_FR, (m) => m.replace(/[,.]?\s+$/, "") + "… ");
  t = t.replace(/[,;:]\s*$/, ".");
  // Phrases longues : on coupe à la virgule la plus proche du milieu pour garder une intonation naturelle.
  t = t.split(/(?<=[.!?])\s+/).map((s) => {
    if (s.length < 170) return s;
    const mid = s.length / 2, commas = [...s.matchAll(/, /g)].map((m) => m.index);
    if (!commas.length) return s;
    const c = commas.reduce((a, b) => (Math.abs(b - mid) < Math.abs(a - mid) ? b : a));
    return s.slice(0, c) + "… " + s.slice(c + 2);
  }).join(" ");
  return t.slice(0, 1200);
}
