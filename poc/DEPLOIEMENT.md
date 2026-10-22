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
