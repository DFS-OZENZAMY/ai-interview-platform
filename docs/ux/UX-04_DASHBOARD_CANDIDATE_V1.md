# UX-04 — Dashboard candidat V1 · Prototype interactif

**Statut : implémenté pour revue UX, non connecté à Supabase.** Date : 23 octobre 2026.  
**Emplacement :** `web/src/app/dashboard/page.tsx` ; préparation initiale `web/src/app/preparation/page.tsx`.

## Intention

Le dashboard ne doit pas être une fiche administrative ni un tableau de chiffres inventés. Il répond à trois questions :
1. Où en sommes-nous dans **notre** préparation ?
2. Quel est **notre objectif commun** ?
3. Quel est le **prochain geste utile** ?

## Navigation réelle du prototype

`/onboarding` → récapitulatif → « Découvrir mon espace » → `/dashboard` → « Préparer notre entretien » → `/preparation`.

Dans `/dashboard`, « Mon profil » revient à l'onboarding avec les préférences préremplies ; la navigation client garde le récapitulatif, et la sidebar ou « Précédent » permet de modifier les données. Les réponses sont transmises via `sessionStorage` pour la démonstration **dans cet onglet seulement**. Aucune donnée n'est écrite dans Supabase, aucun compte n'est créé.

Le dashboard donne la priorité à une **grande carte d'action principale**. Deux surfaces secondaires affichent l'objectif professionnel et les sujets sélectionnés. Une carte « Nos entraînements » affiche un **état vide réel** : pas de score, pas de série, pas de « 75 % de progression » fabriqué.

Si le dashboard est ouvert directement sans avoir terminé l'onboarding, un écran explicite invite à créer son parcours. Une session ne doit pas être déduite d'une valeur fictive.

## Préparation : limite honnête du laboratoire

La page `/preparation` offre un premier choix interactif RH/technique, mais elle ne lance pas encore Groq depuis ce frontend. Un lien explicite « Tester le simulateur existant » ouvre le **laboratoire séparé** `http://127.0.0.1:8765/e2e` dans un nouvel onglet. Le choix RH/technique doit encore être reconfirmé dans ce laboratoire et aucun résultat n'est persisté dans le nouveau frontend.

Étapes suivantes : raccord Auth + profil Supabase (prénom/nom, RLS), référentiel de préférences, sessions persistantes, composant de préparation métier (jusqu'à 6 thèmes utiles selon RH/tech), entretien intégré, bilan et historique réels.

## Direction éditoriale

« Bonjour, [prénom]. On prépare la suite ? » ; « Notre prochaine étape » ; « Notre objectif » ; « Ce qu'on va travailler ensemble ». Le candidat reste maître de ses choix ; nous sommes son partenaire de préparation et non un recruteur qui rend un verdict. Les éventuelles erreurs doivent rester transparentes.

## Tests

- Next.js : `npx tsc --noEmit && npm run lint && npm run build`.
- Browser Chromium/Google Chrome : `python3 web/tests/test_onboarding_v2_browser.py` vérifie désormais le trajet onboarding → dashboard → préparation RH/tech → profil, à 1440 et 390 px, sans débordement horizontal.
- URLs : `http://localhost:3000/dashboard`, `http://localhost:3000/preparation`.

## Réserves de sécurité

Les dépendances npm signalent des vulnérabilités à corriger avant exposition publique. `sessionStorage` ici est une aide à la démonstration, **pas** une forme d'authentification ou de stockage sécurisé de données candidats. L'application de production devra lire/écrire via un serveur Supabase authentifié, avec droits RLS contrôlés et politique de conservation explicite.


## Évolution UX V3 (inspiration aiApply, sans reprendre son périmètre)

L'onboarding permet désormais de connaître le **point de départ** du candidat : situation professionnelle, tranche d'expérience facultative. Le dashboard affiche une ligne dédiée au contexte seulement si le candidat l'a renseigné. Cette donnée ne devient pas un scoring automatique ou un jugement d'adéquation. La progression est segmentée en cinq étapes. Pas d'import de CV, pas de salaire ou de préférence de travail, pas de chiffre non vérifié.
