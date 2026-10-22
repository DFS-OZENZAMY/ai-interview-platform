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
| Questions (`env.QUESTIONS`) | `{ name, open({candidateKey, locale}), next(ref, filtres) → question \| null, complete(ref) }` ou `null` | `questions/` : banque intégrée, **référentiel S2-03 d’Achraf** par HTTP (Edge Function Supabase) ou par SQL |

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

## Brancher le référentiel officiel S2-03 (questions d’Achraf)

| `QUESTION_SOURCE` | Usage | Variables |
| --- | --- | --- |
| `builtin` (défaut) | Banque intégrée du POC | aucune |
| `catalog-http` | Supabase : Edge Function `question-bank`, appelée avec **son client S2-04** (`src/integrations/s2-04`). Fonctionne sur tous les hôtes, y compris Cloudflare | `QB_SUPABASE_URL`, `QB_PUBLISHABLE_KEY`, `QB_ENGINE_EMAIL`, `QB_ENGINE_PASSWORD` (compte de service avec `app_metadata.ai_interview_role = interview_engine`, attribué par un administrateur), `QB_FUNCTION_URL` (facultatif) |
| `catalog-sql` | PostgreSQL auto-hébergé contenant les migrations `db/postgres` 0001–0006 (même base que le POC) | `DATABASE_URL`, `QB_ENGINE_ACTOR_ID` (UUID de l’identité moteur) |

Fonctionnement : au démarrage d’un entretien, le serveur ouvre une session dans le catalogue, puis choisit **une question à la fois** (famille, catégorie et difficulté selon le profil, avec filtres de repli). Les fonctions d’Achraf figent chaque question posée (version de question, version de grille, texte exact) dans `question_bank.interview_question_snapshots`. Le navigateur ne reçoit que la question posée : ni la liste, ni les versions internes, ni les attendus (règle anti-énumération respectée). Les réponses et l’évaluation restent dans le POC.

Si le catalogue n’a aucune question publiée pour le profil (c’est le cas aujourd’hui : 120 questions en brouillon) ou s’il est injoignable, le candidat est prévenu et l’entretien se fait avec la banque intégrée.

Tests : `tests/catalog_api_test.py` (13 vérifications), validé avec `catalog-sql` sur PostgreSQL 16 et avec `catalog-http` contre un faux Supabase HTTPS (`tests/mock_supabase_question_bank.mjs`) qui exécute les vraies fonctions SQL d’Achraf. Pour disposer de questions publiées en local **uniquement**, `tests/fixtures/publish_local_test_subset.sql` publie 2 questions par catégorie avec un relecteur synthétique (refuse de s’exécuter sans drapeau explicite ou sur une base de type Supabase).

**Non testé :** le vrai projet Supabase (réseau bloqué depuis l’environnement de développement, aucun compte moteur ni question publiée à ce jour).

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
