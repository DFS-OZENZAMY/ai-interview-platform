// Préparation du texte pour la voix de Lina. Usage : node poc/tests/speech_prep_test.mjs
import assert from "node:assert/strict";
import { prepareForSpeech as p } from "../server/tts/speech-prep.js";
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; console.log("PASS " + m); };
ok(p("Parlez-moi d’un projet RH (en stage) — 1re étape ?").includes("R H, en stage,"), "sigles dits lettre à lettre, parenthèses en incises");
ok(p("Vous avez noté 3/5 😊 **bien** https://x.io ?") === "Vous avez noté 3 sur 5 bien?", "notation, émojis, markdown et liens nettoyés");
ok(p("Hmm, intéressant !").startsWith("Hmm…"), "respiration après une interjection");
ok(p("Merci, c’est clair.") === "Merci, c'est clair.", "une réponse normale n'est pas déformée");
ok(!/,\s*$/.test(p("Un exemple (concret)")), "pas de virgule finale parasite");
ok(p("Tell me about an HR project (3/5)", "en") === "Tell me about an H R project, 3 out of 5.", "anglais : sigles et notation");
const long = "Quand une équipe traverse une période difficile, avec beaucoup de pression, des délais serrés et des désaccords fréquents, comment faites-vous pour garder le groupe motivé et avancer ensemble ?";
ok(p(long).includes("… "), "phrase longue coupée à la virgule la plus proche du milieu");
console.log(`${n}/${n}`);
