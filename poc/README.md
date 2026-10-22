# POC « Répétition » — simulateur d’entretien IA

Prototype du parcours candidat **et** coach de l’AI Interview Platform. **Ce n’est pas une décision de stack** (ADR-001 à 003 restent ouverts) : il sert à tester l’expérience et à garder l’application portable d’un hébergeur à l’autre.

## Deux espaces, avec comptes
| Espace | Ce qu’on peut faire | Tickets liés |
| --- | --- | --- |
| **Candidat·e** | Inscription (consentement obligatoire et versionné), connexion, profil adaptatif, entretien avec « Lina » (voix, dictée, caméra locale, relances, pause), rapport sur grille v1.0 avec preuves, plan de coaching, demande de coach avec partage explicite de la simulation, suivi des demandes et comptes rendus, historique, suppression du compte | S1-04, S1-06, S2-01 à S2-07, S3-01 à S3-05, S3-07, S4-01, S4-04 |
| **Coach** | Inscription sur code d’invitation, profil (présentation, spécialités, créneaux), tableau des demandes (à traiter, en cours, terminées, archivées), accepter ou refuser, dossier du candidat (rapport et transcription partagés), aide à la préparation, compte rendu et plan d’action, clôture de séance | S1-04, S3-06, S3-07, S3-08 |

## Onboarding adaptatif (S2-01)
Après inscription, le candidat remplit 6 écrans en 3 à 5 minutes : situation et métier, parcours (branches étudiant, jeune diplômé, professionnel, reconversion, autre), motivations, langues avec niveaux CECRL expliqués, compétences acquises et sujets à développer (suggestions du catalogue métier, plus suggestions IA marquées « IA » si Workers AI est actif), puis récapitulatif modifiable, message de bienvenue et tableau de bord. Autosauvegarde serveur à chaque changement, avec reprise à la bonne étape après fermeture. Séniorité initiale calculée uniquement d’après l’expérience déclarée et affichée comme « estimée / déclarée ». Contrat de données : `poc/contracts/candidate-profile-v1.md`.

## Sécurité et règles d’accès
- Mots de passe : PBKDF2-SHA256 (100 000 itérations, sel aléatoire). Session : cookie `HttpOnly; Secure; SameSite=Lax`, jeton stocké haché, 7 jours.
- Limitation : 8 tentatives de connexion par e-mail et par 15 minutes. Écritures acceptées uniquement en JSON et depuis la même origine.
- Un candidat n’accède qu’à ses propres simulations. Un coach ne voit que les demandes qui lui sont adressées, et la simulation liée **seulement** si le candidat a consenti au partage. Refus ou annulation : l’accès est retiré.
- Inscription coach fermée tant que le secret `COACH_INVITE_CODE` n’est pas défini.
- Suppression de compte : simulations, demandes, comptes rendus et sessions supprimés. Journal d’audit minimal sans contenu (`audit_events`).
- Aucune réponse de candidat n’est écrite dans les logs.

## Architecture « plug and play »
Le serveur est découpé en un **cœur indépendant de l’hébergeur** (`server/core/`) et des **adaptateurs** : hôtes (`server/hosts/` : Cloudflare Workers, Node.js), bases (`server/stores/` : Cloudflare D1, SQLite, PostgreSQL dont Supabase) et IA (`server/ai/` : Workers AI, API compatibles OpenAI, Anthropic, aucune). Détails, preuves et recettes : **[DEPLOIEMENT.md](DEPLOIEMENT.md)**.

```text
poc/
├── public/index.html        interface (mode démo intégré si aucune API)
├── server/core/             logique, sécurité, contrat de profil (aucune dépendance d’hébergeur)
├── server/hosts/            cloudflare.js · node.js
├── server/stores/           d1.js · sqlite-node.js · postgres.js
├── server/ai/               workers-ai · openai-compatible · anthropic
├── migrations/              schéma SQLite/D1 et PostgreSQL (appliqués automatiquement)
├── tests/                   contrat, API, onboarding, adaptateurs IA
├── Dockerfile · docker-compose.yml · .env.example · wrangler.jsonc · deploy/
```

Sans serveur (fichier ouvert seul ou préversion), l’application passe en **mode démo** : comptes et données dans le navigateur, compte coach d’essai `coach@demo.local` / `demo1234`, code d’invitation `COACH-DEMO`.

## IA
L’IA rédige les relances, un commentaire personnalisé et des suggestions de compétences. **Elle ne note jamais** : les notes viennent de règles fixes (même réponse + même grille = même note). Fournisseur au choix, ou aucun.

## Démarrage rapide
```bash
cd poc/server && npm install && COACH_INVITE_CODE=dev-invite npm start     # http://localhost:8080, SQLite
DATABASE_URL=postgres://… npm start                                         # PostgreSQL / Supabase
cd poc && npx wrangler dev                                                   # Cloudflare Workers en local
```

## Tests réalisés
Les mêmes suites passent à l’identique sur **Cloudflare Workers + D1, Node.js + SQLite et Node.js + PostgreSQL 16** (34 tests d’accès + 16 tests d’onboarding sur chacun), plus le parcours navigateur complet sur Node + PostgreSQL, et les adaptateurs OpenAI et Anthropic contre de faux fournisseurs. Rejouer : `BASE=http://127.0.0.1:8080 sh tests/run_api_tests.sh`.
34 tests d’API (inscription, connexion, droits candidat / coach, partage et révocation, CSRF, limitation, suppression en cascade) et 2 parcours navigateur complets (mode Cloudflare local et mode démo), sans erreur.
