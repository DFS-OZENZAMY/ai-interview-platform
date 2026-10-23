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

### Voix de Lina directement sur Cloudflare (Containers)

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
