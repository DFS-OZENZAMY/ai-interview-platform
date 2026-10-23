# Déployer Répétition sur n’importe quel hébergement

**Statut : proposition technique (POC).** Ce document ne tranche pas l’ADR-001 (stack) ni l’ADR-002 (hébergement et base) : il rend l’application **portable** pour que ces décisions puissent être prises, et changées, sans réécrire le code.

## Principe : un cœur, des adaptateurs

```text
                 ┌────────────── public/index.html (interface, aucune dépendance d’hébergeur)
Navigateur ──────┤
                 └── /api/* ──► HÔTE ──► server/core/app.js  (logique, sécurité, contrat de profil)
                                 │            │          │
                     cloudflare.js │      env.DB      env.AI
                     node.js       │        │          │
                                   ▼        ▼          ▼
                              (fichiers)  STORE        IA
                                         d1 · sqlite   workers-ai · openai-compatible
                                         · postgres    · anthropic · aucune
```

Le cœur n’utilise que des API Web standard (`Request`, `Response`, `crypto.subtle`). Il ne sait pas où il tourne. Chaque adaptateur respecte une petite interface :

| Port | Interface | Adaptateurs livrés |
| --- | --- | --- |
| Hôte | reçoit une requête HTTP, sert `public/`, passe `/api/*` à `createApp(env)` | `server/hosts/cloudflare.js`, `server/hosts/node.js` |
| Base (`env.DB`) | `prepare(sql).bind(…).first/all/run`, `batch([…])` transactionnel, `ensureSchema(ddl)`, `name`, `dialect` | `stores/d1.js`, `stores/sqlite-node.js`, `stores/postgres.js` |
| IA (`env.AI`) | `{ name, complete({system, user, maxTokens}) → texte }` ou `null` | `ai/index.js` : Workers AI, API compatibles OpenAI, Anthropic, aucune |

Ajouter une cible (Deno, Bun, Vercel, une autre base…) revient à écrire un adaptateur de quelques dizaines de lignes, sans toucher au cœur ni à l’interface.

## Cibles et preuves

| Cible | Comment | Testé dans ce POC |
| --- | --- | --- |
| **Cloudflare Workers + D1** | `wrangler.jsonc`, répertoire racine du build : `poc` | Oui, en local avec Wrangler (50/50 tests d’API) |
| **Node.js + SQLite** (VPS, serveur sur site, une seule instance) | `cd server && npm start` | Oui (50/50) |
| **Node.js + PostgreSQL** (Supabase, Neon, RDS, Azure, Scaleway, OVH…) | `DATABASE_URL=… npm start` | Oui sur PostgreSQL 16, **à côté du schéma `question_bank` d’Achraf** et avec les rôles `anon` / `authenticated` de Supabase (50/50, parcours navigateur complet) |
| **Docker** (Render, Railway, Fly.io, Koyeb, Cloud Run, Azure Container Apps, AWS App Runner/ECS, Kubernetes) | `Dockerfile` ou `docker compose up` | **Non** : Docker n’est pas disponible dans l’environnement de test. Image à construire et valider |
| IA : API compatible OpenAI | `AI_PROVIDER=openai`, `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL` | Oui, contre un faux fournisseur qui vérifie le format |
| IA : Anthropic | `AI_PROVIDER=anthropic`, `AI_API_KEY`, `AI_MODEL` | Oui, contre un faux fournisseur |
| IA : Workers AI | binding `AI` sur Cloudflare | Non (nécessite un compte Cloudflare) |

Les mêmes suites de tests (`tests/`) passent à l’identique sur chaque hôte : c’est la preuve de portabilité.

## Recettes

### Cloudflare
Workers & Pages › Import a repository › répertoire racine `poc`, commande de déploiement `npx wrangler deploy`. Ajouter le secret `COACH_INVITE_CODE`. La base D1 est créée au premier déploiement.

### Un serveur (VPS, machine sur site)
```bash
cd poc/server && npm install          # pg n’est installé que si besoin
cp ../.env.example ../.env            # puis renseigner les valeurs
set -a && . ../.env && set +a && npm start
```
Exemple de service : `deploy/repetition.service`. Mettre un proxy HTTPS devant (Nginx, Caddy) avec `PUBLIC_URL` et `TRUST_PROXY=true`.

### Docker
```bash
cd poc && cp .env.example .env && docker compose up -d     # application + PostgreSQL 16
```
Ou image seule avec SQLite : `docker build -t repetition . && docker run -p 8080:8080 -v repetition-data:/data repetition`.

### Supabase comme base
1. Dans le projet Supabase : Connect › chaîne de connexion **Session pooler** (port 5432) ou **Transaction pooler** (6543). Les deux fonctionnent : chaque requête fixe son `search_path` dans une transaction courte.
2. Sur l’hôte choisi (Node, Docker…) : `DATABASE_URL=<chaîne>` ; le SSL est activé automatiquement.
3. Au premier appel, le serveur crée le schéma **`app`**, active RLS sans politique sur toutes ses tables et retire tout droit à `anon`, `authenticated` et `PUBLIC`. Ce schéma n’est pas exposé par l’API REST de Supabase. Le schéma `question_bank` n’est jamais modifié.
4. La chaîne de connexion est un secret serveur, au même titre que `service_role` : jamais dans l’interface, jamais dans Git.

Le jeton personnel Supabase (`sbp_…`) n’est **pas** nécessaire au fonctionnement de l’application.

## Nouvelle application d’Achraf (`web/`, Next.js) et Lina humaine

**Application candidat** : la nouvelle interface d’Achraf (PR #51, branche `feat/UX-01-design-system-and-journey`, intégrée jusqu’à `3b121ed`) : accueil, connexion Supabase, onboarding, tableau de bord, préparation, entretien immersif (orbe vocale, introduction parlée, mains libres, Whisper). Elle est déployée comme **second Worker** (`ai-interview-web`) grâce à l’adaptateur officiel OpenNext, et appelle le Worker de la plateforme (`ai-interview-platform`) par une **liaison interne** `PLATFORM` : aucune URL publique ni appel au Mac d’Achraf.

Adaptations, volontairement minimales :
1. `web/src/app/api/interview/[action]/route.ts` : le pont appelle la plateforme (liaison `PLATFORM`, ou son labo local `127.0.0.1:8765` hors Cloudflare), avec un secret partagé `BRIDGE_SECRET`, et transmet le prénom du profil pour que Lina s’adresse au candidat.
2. `web/src/app/interview/page.tsx` : l’introduction parlée utilise la voix de Lina (l’enregistrement d’origine reste en secours).
3. `web/next.config.ts` : `cacheComponents` désactivé **uniquement** pour les builds Cloudflare (`OPENNEXT_CLOUDFLARE=1`), car non garanti sur le runtime Workers (pages bloquées) ; son code n’utilise aucune API « use cache ».
4. `web/src/app/page.tsx` : correction d’un bogue de son dernier commit (`new Date()` dans le pied de page interdit au pré-rendu, qui empêchait tout build).
5. Fichiers ajoutés : `open-next.config.ts` (cache servi depuis les fichiers statiques), `wrangler.jsonc`, scripts `cf:build`, `cf:preview`, `cf:deploy`.

**Lina humaine** (`poc/server/lina.js`, utilisée par le simulateur pour les deux interfaces) : avant de traiter un message comme une réponse, Lina comprend l’intention — répondre, faire répéter, faire reformuler, poser une question (salaire, durée, entreprise, « tu es une IA ? »), ne pas savoir, politesse, texte incompréhensible, impolitesse, manipulation, passer, arrêter — et réagit comme une recruteuse : elle répète, reformule, répond honnêtement (elle n’invente aucune information sur l’entreprise), rassure, propose de passer, pose une limite calmement, garde son rôle, puis ramène l’entretien vers la question. Escalade progressive (2e « je ne sais pas » → question suivante ; 3e message incompréhensible → suite ; impolitesse répétée → fin courtoise avec bilan). Avec IA, le modèle tranche les cas ambigus et rédige une réplique sur mesure (sortie JSON contrôlée, jamais de note) ; les intentions évidentes restent décidées par les règles. Une manipulation glissée dans une vraie réponse n’empêche pas de traiter la réponse (consigne d’Achraf : réponse = donnée non fiable). Transitions naturelles entre questions, prénom du candidat, brise-glace d’Achraf.

**Mise en ligne de l’application (second projet Cloudflare)** — Workers & Pages › Create › Import a repository (même dépôt) :
- Nom du Worker : `ai-interview-web` ; répertoire racine : `web` ; build : `npm run cf:build` ; déploiement : `npx opennextjs-cloudflare deploy` ; branche de production : `main`.
- **Variables de build** (publiques, intégrées au build) : `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (projet Supabase d’Achraf).
- **Secret** : `BRIDGE_SECRET` (valeur longue et aléatoire, identique sur les deux Workers).
- Le Worker `ai-interview-platform` doit exister (liaison `PLATFORM`) et avoir : `BRIDGE_SECRET`, `QUESTION_SOURCE=corpus-preview`, `GROQ_API_KEY` (relances, Lina, Whisper), `ELEVENLABS_API_KEY` (voix de Lina).
- Supabase (Achraf) : migrations de sa branche appliquées (`supabase/migrations`), et l’adresse `https://ai-interview-web.<sous-domaine>.workers.dev/auth/callback` ajoutée aux URL de redirection.

**Tests :** `poc/tests/lina_conversation_test.py` 24/24 avec IA et 24/24 sur règles seules ; `lab_api_test.py` 19/19 ; tests navigateur d’Achraf (ancienne interface) 5/5 sans modification ; chaîne complète vérifiée en local avec les deux Workers (Wrangler, liaison `PLATFORM`, faux Supabase, faux Groq, faux ElevenLabs) : connexion obligatoire, brise-glace, Lina (politesse, répétition, salaire, « je ne sais pas » avec le prénom), relances, bilan, 9 lectures vocales sans échec (`poc/tests/browser_web_lina_e2e.py`). Vérifications d’Achraf sur `web/` : `tsc` et `eslint` sans erreur. **Non testé :** son vrai projet Supabase et le déploiement réel du second Worker.

## Interface et simulateur d’Achraf (page d’accueil de la plateforme)

**La plateforme affiche l’application d’Achraf** (`dev/new-user-e2e`) : même thème, mêmes 7 étapes (Accueil, Compte, Onboarding, Profil, Simulation, Entretien, Récapitulatif), mêmes textes, même code. Fichiers : `poc/public/index.html` et `poc/public/app.js`. Différences avec son original, et seulement celles-ci :

1. **La voix de Lina** (seul ajout demandé) : sous chaque question, Lina lit la question puis chaque relance ; boutons « Réécouter Lina » et « Couper la voix de Lina ». Le serveur ne synthétise que des textes qu’il connaît (`/api/lab/tts` : question en cours d’une session, ou question du référentiel par son code) : impossible de lui faire dire autre chose. Voix ElevenLabs de Lina (réglable dans `/classique/` › Voix), sinon voix du navigateur.
2. Chemin du script (`/app.js` au lieu de `/e2e/app.js`), libellés des fournisseurs IA (Groq, OpenAI, Workers AI, Anthropic) et mention « dans Cloudflare » au lieu de « sur votre Mac ».

**Son simulateur tourne sur le serveur de la plateforme** (`poc/server/lab.js`), qui reprend l’API de son serveur local et la logique de son `InterviewLab` : `/api/e2e/config`, `/api/ai/status`, `/api/questions`, `/api/ai/session/start`, `/api/ai/session/answer`, avec les mêmes validations, la même sélection des questions, les mêmes phases et les mêmes consignes IA. Adaptations imposées par l’hébergement : sessions en base (1 h) au lieu de la mémoire du processus Python, 30 simulations par heure et par adresse IP, requêtes d’un autre site refusées.

**Variables Cloudflare :** `QUESTION_SOURCE=corpus-preview` ; IA : secret `GROQ_API_KEY` (sinon Workers AI) ; voix de Lina : secret `ELEVENLABS_API_KEY` ; parcours Supabase réel (son bouton « Activer le parcours réel ») : `SUPABASE_URL` et `SUPABASE_PUBLISHABLE_KEY` (clé publique de son projet).

**Ancienne interface** (studio, recruteurs, coachs, écran Voix) : toujours disponible à `/classique/`, non liée depuis la page d’accueil.

**Preuves :** ses 5 tests navigateur (`tests/e2e`) passent **sans modification** contre le serveur de la plateforme (`poc/tests/run_achraf_e2e_on_platform.py`) ; `poc/tests/lab_api_test.py` 19/19 sur Node et Cloudflare Workers (contrat, validations identiques, voix de Lina, sécurité) ; parcours navigateur complet avec Lina ; non-régression 73/73.

## Moteur de simulation S2-04 d’Achraf, intégré à la plateforme

Le laboratoire local d’Achraf (`dev/local-preview/ai_interview.py`, Python, en mémoire, sur son poste) est porté dans la plateforme en ligne, sans modifier son code :

| Élément de son moteur | Dans la plateforme |
| --- | --- |
| 120 questions `data/question-bank` (statut **draft**) | Source `QUESTION_SOURCE=corpus-preview` : questions servies par le serveur, une à une, sans répétition ; badge « Référentiel · en cours de validation » et mention dans le rapport. Seuls la question, ses métadonnées et ses **pistes de relance humaines** sont utilisés : attendus, variantes, signaux d’alerte et notes d’évaluation ne quittent jamais le serveur (vérifié). Aucune publication ni changement de statut. |
| Objectifs RH (10) et techniques (8 + 3 par spécialité), 6 spécialités | Choisis à chaque simulation (écran « Configurer la simulation ») ; ils orientent le choix des questions (catégories RH visées en premier, spécialité imposée aux questions techniques) et les relances. Ils ne modifient pas le profil. |
| Description de poste | Champ facultatif « Personnaliser avec une offre d’emploi » (3 000 caractères), conservé côté serveur et réservé au candidat qui l’a saisi. |
| Relance IA après chaque réponse | Une relance par question. Avec IA : consigne d’Achraf (recruteur d’entraînement, aucune note ni barème, **réponse du candidat traitée comme donnée non fiable**) + style du recruteur + pistes humaines. Sans IA : la piste humaine la plus adaptée. |
| Bilan qualitatif prudent | Consigne d’Achraf : 130 mots, un point fort, un point d’amélioration, un exercice ; ni note ni verdict. |
| Groq `openai/gpt-oss-120b` | `GROQ_API_KEY` (secret) suffit : point d’accès Groq, effort de raisonnement « low », jetons suffisants, `User-Agent` explicite (correctif Cloudflare 403), refus d’une clé OpenAI `sk-…`. Sinon OpenAI compatible ou Workers AI. |

**Activer sur Cloudflare :** variable `QUESTION_SOURCE=corpus-preview` ; facultatif : secret `GROQ_API_KEY` pour Groq (sinon Workers AI est utilisé).

**Gouvernance :** ces questions sont des **brouillons** ; Achraf réserve la publication officielle à une validation humaine. Ce mode convient aux tests internes et aux pilotes ; ne pas le présenter comme le référentiel validé. Quand des questions seront publiées dans Supabase, passer à `QUESTION_SOURCE=catalog-http`.

**Tests :** `tests/s2_04_engine_test.py` 15/15 sur Node et Cloudflare Workers (spécialité, objectifs, offre d’emploi, absence de fuite des attendus, format exact des appels Groq, consignes, isolation du contexte entre candidats) ; parcours navigateur ; tests d’Achraf toujours verts (37 Python, 17 Node).

## Voix, dictée et recruteurs avec ElevenLabs (configuration par défaut sur Cloudflare)

Le candidat **choisit son recruteur** avant chaque simulation, et peut écouter sa voix :

| Agent | Profil | Style de relance |
| --- | --- | --- |
| Lina | Recruteuse RH bienveillante | douce, invite à développer |
| Karim | Manager technique exigeant | précisions concrètes, outils, résultats mesurés |
| Sofia | DRH pressée | très courte, exige des chiffres |
| Adam | Coach pédagogue | guide vers la méthode STAR |

Chaque agent a sa voix ElevenLabs, sa phrase d’accueil et son style, appliqué aux relances locales comme à celles de l’IA. Le rapport indique qui a mené l’entretien.

- **Voix (TTS)** : `POST /v1/text-to-speech/{voice}/stream`, modèle **Eleven v4 Turbo** (`eleven_v4_turbo`, le plus réaliste en temps réel, ~100 ms d’inférence). Si le compte n’y a pas accès, repli automatique sur Multilingual v2 puis Flash v2.5 (le modèle retenu est mémorisé et affiché dans `/api/health`). MP3 diffusé en streaming et mis en cache par agent et par voix. La voix est choisie **par le serveur** à partir de l’agent ; le navigateur ne voit jamais les identifiants de voix ni la clé.
- **Dictée (Scribe v2 Realtime)** : le serveur émet un **jeton à usage unique** (15 min) ; le navigateur se connecte directement à `wss://api.elevenlabs.io/v1/speech-to-text/realtime` (PCM 16 kHz, détection de fin de phrase côté ElevenLabs). L’audio ne passe pas par notre serveur et la clé ne quitte jamais le serveur. 30 jetons par candidat et par 10 minutes au maximum.
- **Vie privée** : le texte du consentement micro indique que la voix est envoyée à ElevenLabs, qui la traite selon ses propres conditions (la rétention zéro n’est disponible que sur les offres entreprise).

**Activer :** dans Cloudflare › Worker › Settings › **Variables and Secrets**, ajouter le **secret** `ELEVENLABS_API_KEY`. `TTS_PROVIDER` et `STT_PROVIDER` valent déjà `elevenlabs` dans `wrangler.jsonc`. Sans clé, tout reste fonctionnel avec la voix et la dictée du navigateur.

**Choisir des voix françaises réalistes (écran « Voix ») :** les comptes listés dans `ADMIN_EMAILS` voient un menu **Voix**. Il affiche les voix **françaises natives** de la bibliothèque ElevenLabs (filtre par genre et recherche), avec leur extrait audio à écouter. Un clic sur « Attribuer » ajoute la voix au compte ElevenLabs (`POST /v1/voices/add/…`, dans la limite du forfait) et l’associe au recruteur ; les candidats l’entendent immédiatement. Les associations sont stockées en base (`agent_voices`) et réversibles (« Voix par défaut »). Tests : `tests/elevenlabs_voices_test.py` 15/15 sur Node et Workers, parcours navigateur.

**Accents, voix par langue et nouveaux recruteurs :** l’écran « Voix » propose deux onglets (voix françaises, voix anglaises) et un filtre **par accent**, dont la liste est lue chez ElevenLabs (par exemple parisien, québécois, belge, suisse, africain, marocain ; britannique, américain, indien en anglais). Chaque recruteur peut avoir **une voix française et une voix anglaise** ; sans voix anglaise dédiée, il garde sa voix française. Le bouton « Nouveau recruteur » crée un recruteur supplémentaire (prénom, rôle, description, style de relance parmi les 4 existants, couleur, phrase d’accueil) que les candidats voient immédiatement, avec l’accent de sa voix ; il peut être supprimé (les 4 recruteurs intégrés ne le peuvent pas). Données : tables `agent_voice_map` (voix par recruteur et par langue) et `custom_agents`. Tests : `tests/elevenlabs_accents_test.py` 18/18 sur Node + SQLite, Node + PostgreSQL et Cloudflare Workers + D1, parcours navigateur.

**Personnaliser les voix par configuration (alternative) :** `ELEVENLABS_VOICE_LINA`, `ELEVENLABS_VOICE_KARIM`… (identifiants de voix de votre compte ElevenLabs), ou `AGENTS_JSON` pour modifier ou ajouter des recruteurs. Les voix par défaut sont des voix prédéfinies d’ElevenLabs ; à écouter et valider en français.

**Tests :** `tests/mock_elevenlabs.py` reproduit l’API (clé, MP3 réel via ffmpeg, jetons à usage unique, protocole Scribe) ; `tests/elevenlabs_api_test.py` 14/14 sur Node **et** Cloudflare Workers ; parcours navigateur avec micro simulé : choix de Karim, écoute, voix MP3, dictée en direct, relance au style de Karim, rapport ; la clé n’apparaît jamais côté navigateur. **Non testé :** le vrai service ElevenLabs (inaccessible depuis l’environnement de développement).

## Transcription vocale Kyutai STT

[Kyutai STT](https://kyutai.org/stt/) (laboratoire parisien, open source) remplace la dictée du navigateur, qui ne fonctionnait que sous Chrome et Edge et envoyait la voix aux serveurs de Google ou d’Apple. Modèle utilisé : `kyutai/stt-1b-en_fr` (français et anglais, environ 0,5 s de latence, ponctuation, détection sémantique de fin de parole).

```text
Navigateur ── micro, AudioWorklet 24 kHz, trames de 80 ms ──► NOTRE serveur /api/stt/stream ──► moshi-server (Kyutai)
           ◄── mots en direct, « pause détectée », fin ─────── (candidat connecté, même origine,   ◄── msgpack Word/Step/Marker
                                                                clé Kyutai côté serveur uniquement)
```

**1. Faire tourner Kyutai (GPU NVIDIA requis)**, sur une machine GPU (Scaleway, OVH, AWS, RunPod…) :
```bash
cargo install --features cuda moshi-server
git clone https://github.com/kyutai-labs/delayed-streams-modeling && cd delayed-streams-modeling
# Dans configs/config-stt-en_fr-hf.toml, remplacer authorized_ids = ["public_token"] par un jeton long et secret
moshi-server worker --config configs/config-stt-en_fr-hf.toml        # écoute en ws:// sur le port 8080
```
Placer un proxy TLS devant (Caddy, Nginx) pour obtenir une adresse `wss://`. Référence Kyutai : une L40S sert 64 dictées simultanées.

**2. Brancher la plateforme** (n’importe quel hôte, y compris Cloudflare) : `STT_PROVIDER=kyutai`, `KYUTAI_STT_URL=wss://stt.exemple.ma`, secret `KYUTAI_STT_API_KEY`. Sur Node, le module `ws` est installé automatiquement (dépendance facultative).

**Sécurité et vie privée :** seul un candidat connecté peut ouvrir un flux (cookie de session vérifié, même origine), une dictée par personne, 15 minutes au maximum, trames contrôlées. Le jeton Kyutai ne quitte jamais le serveur, et l’audio n’est ni enregistré ni journalisé. Le texte du consentement micro s’adapte automatiquement. Si Kyutai est injoignable, l’interface bascule sur la dictée du navigateur quand elle existe, sinon sur le clavier.

**Licences :** code Kyutai sous Apache 2.0 et MIT, poids du modèle sous **CC-BY 4.0** : usage commercial autorisé, avec attribution (« Transcription : Kyutai STT »).

**Tests :** `tests/mock_kyutai_stt.py` reproduit le protocole de `moshi-server` (authentification, trames de 1 920 échantillons float32, Word/Step/Marker) ; l’encodage msgpack du POC est identique octet pour octet à celui du client officiel. `tests/stt_bridge_test.mjs` : 8/8 sur l’hôte Node **et** sur Cloudflare Workers (Wrangler local). Parcours navigateur avec micro simulé : capture, envoi, mots affichés en direct, vidage final récupérant le dernier mot, sur Node et sur Workers. **Non testé :** le vrai modèle (aucun GPU dans l’environnement de développement, Hugging Face inaccessible) ; la qualité de transcription n’est donc pas encore mesurée sur nos cas d’usage.

## Voix de Lina : Kyutai Pocket TTS

[Pocket TTS](https://kyutai.org/tts/) (Kyutai, licence MIT) remplace la voix synthétique du navigateur, dont la qualité varie d’un appareil à l’autre. Le modèle compte 100 M de paramètres et **tourne sur un simple processeur**, sans GPU. Il propose des voix françaises et anglaises prédéfinies (voix française par défaut : `estelle`) et peut cloner une voix à partir de quelques secondes d’audio, ce qui permettrait de donner à Lina une voix unique.

**1. Lancer Pocket TTS** (un processus par langue, sur n’importe quel serveur ou conteneur CPU) :
```bash
uvx pocket-tts serve --language french  --host 0.0.0.0 --port 8000
uvx pocket-tts serve --language english --host 0.0.0.0 --port 8001     # facultatif
```
Ou bien `docker compose --profile voix up -d` (service `voix-fr` ; **non testé** ici). Le premier démarrage télécharge le modèle depuis Hugging Face. Ne pas exposer ce service sur Internet : seul notre serveur doit l’appeler.

**2. Brancher la plateforme :** `TTS_PROVIDER=pocket-tts`, `POCKET_TTS_URL_FR=http://voix-fr:8000` (et `POCKET_TTS_URL_EN` si besoin), `POCKET_TTS_VOICE_FR=estelle`.

**Fonctionnement :** le navigateur demande `/api/tts` ; notre serveur vérifie la session du candidat, relaie vers Pocket TTS avec **la voix fixée en configuration** (le navigateur ne peut ni choisir la voix ni fournir d’URL, ce qui empêche toute requête détournée), puis renvoie le WAV **en streaming** : Lina commence à parler pendant la génération. Les questions déjà prononcées sont servies depuis un cache (120 entrées) ; 500 caractères et 60 demandes par 5 minutes au maximum par candidat. Si Pocket TTS ne répond pas, l’interface reprend la voix du navigateur.

**Tests :** `tests/mock_pocket_tts.py` imite `pocket-tts serve` (multipart `text` / `voice_url`, WAV en streaming) ; `tests/tts_api_test.py` 11/11 sur Node **et** Cloudflare Workers (premiers octets en ~20 ms, cache en ~10 ms, voix imposée, limite de débit) ; parcours navigateur : Lina parle via Pocket TTS, y compris les relances, avec repli propre si le service est coupé. **Non testé :** le vrai modèle (Hugging Face inaccessible depuis l’environnement de développement) ; la voix réelle reste à écouter et à valider par l’équipe.

### Variante : Pocket TTS dans Cloudflare Containers (désactivée par défaut)

Remplacée par ElevenLabs dans la configuration par défaut. Pour la réactiver, rajouter dans `wrangler.jsonc` les blocs `containers`, `durable_objects` et `migrations` décrits ci-dessous, avec `TTS_PROVIDER=pocket-tts` (forfait Workers Paid et permission Containers requis).

Workers AI ne propose pas Kyutai ; Pocket TTS tourne donc dans **Cloudflare Containers**, attaché au Worker de la plateforme. Tout est déjà déclaré dans `wrangler.jsonc` (racine et `poc/`) : rien d’autre à héberger.

```text
Navigateur ─► Worker ai-interview-platform ─► Durable Object LinaVoice ─► conteneur Pocket TTS (poc/voice/Dockerfile)
              /api/tts (session vérifiée)      démarre / attend / relaie       modèle français + voix « estelle » intégrés
```

- **Image** (`poc/voice/Dockerfile`) : Python 3.12, PyTorch CPU, `pocket-tts==4.0.1`. Le modèle et la voix sont téléchargés **pendant le build**, puis le conteneur démarre hors ligne (`enableInternet: false`, `HF_HUB_OFFLINE=1`).
- **Instance** : `standard-2` (1 vCPU, 6 Go), 2 instances au maximum. Si la voix est plus lente que la parole, passer à `standard-3` (2 vCPU).
- **Cycle de vie** (`server/hosts/lina-voice.js`, API native `ctx.container`, sans dépendance) : démarrage à la première demande, attente de disponibilité (2 min au maximum), extinction après **10 minutes sans activité**. Aucune URL publique : seul le Worker peut parler au conteneur.
- **Démarrage à froid** : l’écran « Votre parcours est prêt » appelle `/api/tts/warmup`, ce qui réveille le conteneur pendant que le candidat lit ses conseils.
- **Repli** : si le conteneur n’est pas prêt ou tombe en panne, `/api/tts` renvoie 503 et Lina reprend la voix du navigateur ; l’entretien n’est jamais bloqué.
- `keep_vars: true` : les variables saisies dans le tableau de bord (`QUESTION_SOURCE`, `STT_PROVIDER`…) ne sont pas effacées à chaque déploiement.

**Pré-requis :**
1. Forfait **Workers Paid** (Containers n’est pas inclus dans le forfait gratuit), facturation à l’usage.
2. La branche de production Cloudflare doit être `feat/poc-plug-and-play` avec la commande `npx wrangler deploy` : selon la documentation Cloudflare, seules les commandes `wrangler deploy` construisent et mettent à jour les conteneurs ; les préversions tournent sans voix serveur.
3. Après le premier déploiement, compter quelques minutes avant que le conteneur réponde (provisionnement Cloudflare).

**Tests :** `tests/lina_voice_container_test.mjs` 12/12 avec un `ctx.container` simulé (démarrage à froid, démarrage unique sous requêtes simultanées, extinction programmée, panne et reprise, routes filtrées, pré-chauffage, synthèse de bout en bout) ; configuration validée par `wrangler deploy --dry-run` (liaisons conteneur, D1, IA, variables) ; plateforme complète sous Wrangler avec la nouvelle configuration : 73/73. **Non testé :** la construction réelle de l’image et le conteneur sur Cloudflare (Docker indisponible dans l’environnement de développement) ; la vitesse réelle de Pocket TTS sur 1 vCPU reste à mesurer.

## Règles de sécurité communes à tous les hôtes
- Mots de passe PBKDF2-SHA256, session en cookie `HttpOnly` (`Secure` dès que `PUBLIC_URL` est en HTTPS), jeton stocké haché.
- Écritures uniquement en JSON et depuis la même origine ; corps limités à 256 Ko sur l’hôte Node.
- Un candidat n’accède qu’à ses données ; un coach uniquement aux simulations partagées avec lui.
- Les clés d’IA et chaînes de connexion restent côté serveur ; aucun contenu de réponse n’est journalisé.
- Hôte Node : en-têtes `nosniff`, `X-Frame-Options: DENY`, protection contre la traversée de répertoires (vérifiée).

## Ce qui reste à décider ou à faire
- ADR-001 et ADR-002 : choisir la cible de production (coût, résidence des données au Maroc, sauvegardes, conformité).
- Construire et tester l’image Docker sur la cible retenue ; ajouter un pipeline CI qui rejoue `tests/` sur chaque hôte.
- Brancher la banque de questions S2-03 (`question_bank.published_questions_safe`) via un service serveur, une fois des questions publiées : aucune ne l’est aujourd’hui.
- Sauvegardes, rotation des secrets, supervision, limitation de débit à l’échelle (aujourd’hui en base).
