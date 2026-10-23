# Simulation IA locale — S2-04 (prévisualisation de brouillons)

## Ce qui est livré

Le parcours [E2E nouveau candidat](NEW_USER_E2E.md) peut désormais fonctionner avec **un véritable modèle IA** pour générer une relance en fonction de la réponse du candidat, puis un bilan qualitatif sans score. Cette branche ajoute le mode « Entretien avec relances IA » et des objectifs qui se mettent à jour selon le type d'entretien.

### Objectifs RH

Motivation/projet, présentation du parcours, communication et structure des réponses comportementales, collaboration, leadership, conflits, mises en situation, confiance et stress. Les objectifs du profil restent les préférences par défaut.

### Objectifs techniques

Fondamentaux, résolution de problèmes, architecture, débogage, bonnes pratiques, raisonnement, communication technique et gestion d'incident. Les sujets supplémentaires dépendent de la spécialité :

| Spécialité | Thèmes disponibles |
|---|---|
| Software Engineering | API / backend, architecture système |
| Data & IA | SQL, pipelines/qualité des données, machine learning |
| Cloud & DevOps | Cloud/infra, CI/CD, observabilité |
| Cybersécurité | Vulnérabilités, modèles de menace, IAM |
| Testing & QA | Automatisation, stratégie et qualité des tests |
| Business Analysis | Cadrage des besoins, user stories, parties prenantes |

Les objectifs RH n'apparaissent pas dans un entretien technique et inversement. Chaque sélection vaut **pour une simulation** et ne modifie jamais les préférences de l'onboarding.

## Modèle Groq recommandé depuis août 2026

Le modèle `llama-3.3-70b-versatile` a été retiré le **16 août 2026** pour les abonnements Free et Developer. Il provoque désormais un `HTTP 404 model_not_found` sur ces comptes. La version actuelle utilise `openai/gpt-oss-120b`, proposé par Groq : **l'API et la clé restent celles de Groq**. Pour cette famille de modèles, le client active le mode de raisonnement `low` et réserve suffisamment de jetons pour garantir une réponse visible.

Source : [Groq — Model Deprecation](https://console.groq.com/docs/deprecations) et [GPT-OSS 120B](https://console.groq.com/docs/model/openai/gpt-oss-120b).

## Démarrage sur Mac avec Groq (recommandé si vous possédez une clé Groq)

Le fournisseur **Groq** est pris en charge sans installer le SDK : le backend utilise l'API officielle Groq Chat Completions et le modèle `openai/gpt-oss-120b`.

Dans le dossier GitHub du projet :

```bash
git pull origin main
# macOS / zsh : saisie masquée (la clé ne figure pas dans l'historique)
read -s "GROQ_API_KEY?Collez votre clé Groq : "
echo
export GROQ_API_KEY
export AI_PROVIDER=groq
python3 dev/local-preview/server.py
```

Ouvrez <http://127.0.0.1:8765/e2e> → **Tester le parcours complet**, terminez l'onboarding démo puis choisissez **Entretien avec relances IA · Groq**. Acceptez l'envoi des réponses à Groq avant de commencer.

Vous pouvez vérifier votre clé sans l'afficher :

```bash
curl -sS -o /dev/null -w "Groq HTTP %{http_code}\n" \
  https://api.groq.com/openai/v1/models \
  -H "Authorization: Bearer $GROQ_API_KEY"
```

HTTP 200 = clé reconnue, HTTP 401 = clé Groq invalide/révoquée, HTTP 403 = permission insuffisante. Les comptes et quotas Groq sont distincts des comptes OpenAI. Ne partagez jamais la valeur de votre clé dans ChatGPT, GitHub ou le navigateur.

### Choix du fournisseur

Le serveur choisit automatiquement **Groq lorsque `GROQ_API_KEY` est définie** ; sinon il tente OpenAI si `OPENAI_API_KEY` est définie. Vous pouvez forcer le choix :

| Variable | Groq | OpenAI |
|---|---|---|
| `AI_PROVIDER` | `groq` | `openai` |
| Clé API | `GROQ_API_KEY` | `OPENAI_API_KEY` |
| Modèle par défaut | `openai/gpt-oss-120b` | `gpt-4.1-mini` |
| Modifier le modèle | `GROQ_MODEL` | `OPENAI_MODEL` |
| Point de terminaison | `https://api.groq.com/openai/v1/chat/completions` | `https://api.openai.com/v1/responses` |

**Important :** une clé Groq envoyée à `api.openai.com` provoque un 401 ; elle doit être envoyée à `api.groq.com`. Le même moteur local assure les relances et le bilan qualitatif quel que soit le fournisseur.

**Sans clé API reconnue** : l'option IA est désactivée ; la simulation guidée sans IA continue de fonctionner. Chaque fournisseur gère sa propre facturation, ses limites et ses règles de conservation.

### Ce que fait le moteur IA

1. Sélectionne localement des questions issues du corpus de développement selon la famille RH/technique, la spécialité et le niveau.
2. Montre une question et recueille une réponse.
3. Envoie la **question, la réponse, les objectifs de préparation et l'éventuelle description du poste** à Groq Chat Completions ou à l'API Responses d'OpenAI via **le serveur Python**, selon la configuration.
4. Affiche une **relance générée par un modèle** à partir de la réponse et permet de répondre.
5. Passe à la question suivante ; en fin d'entretien, génère un **bilan qualitatif prudent**, sans barème, décision de recrutement ni note automatisée.

Le navigateur ne reçoit jamais la clé API. Le serveur ne transmet aucun attendu de réponse ou barème interne au modèle ni au candidat. Les requêtes OpenAI utilisent `store: false` ; pour Groq, les paramètres Chat Completions et les règles de conservation du fournisseur s'appliquent. Les réponses de la simulation ne sont conservées qu'en mémoire locale du serveur Python. Quitter le serveur supprime cette mémoire.

Pour respecter la confidentialité, **ne pas utiliser de données personnelles sensibles ou de vraies réponses de candidats** dans le laboratoire. Une case de consentement à l'envoi des réponses doit être cochée pour démarrer le mode IA.

## Statut du référentiel : disponible en test, non publié officiellement

Les **120 questions** sont utilisables dans le laboratoire local à partir des fichiers JSON GitHub, avec un badge `draft_preview`. Cela ne modifie pas leurs statuts dans le projet Supabase.

Dans Supabase, les 120 restent **`draft`**, `approved_for_publication=false`. La publication officielle est conditionnée à la validation humaine de chaque question et des grilles ; on ne déclare pas fictivement un expert relecteur ou une approbation globale. Le service sécurisé de production reste inaccessible aux questions non publiées.

Cette distinction est intentionnelle : l'utilisateur peut commencer **tout de suite** à tester la qualité d'un entretien IA et demander des corrections, avant d'autoriser une publication finale du corpus.

## Vérifications

```bash
python3 -m unittest discover -s tests -p 'test_ai_interview_lab.py' -v
python3 -m unittest discover -s tests/e2e -v
```

Les tests du mode IA utilisent un **faux fournisseur** (aucun coût, aucune requête externe) : validation RH/tech, isolation des familles, générateur de relance, conformité des arguments au contrat OpenAI, refus d'une simulation sans clé, consentement et parcours navigateur. La **vraie génération Groq ou OpenAI** exige une clé valide et une connexion depuis le Mac et n'est pas revendiquée par la CI.

### Hors périmètre de ce test

- Il ne s'agit pas du moteur conversationnel de production S2-04, de transcription, d'avatar ou de synthèse vocale.
- Aucun entretien n'est sauvegardé dans Supabase.
- Aucune note/scoring automatique n'est attribuée.
- Aucune question n'est officiellement publiée dans le référentiel privé sans validation humaine.

## Diagnostiquer un ancien serveur et l'erreur HTTP 401

Depuis un nouveau Terminal, consulter l'endpoint de diagnostic **sans aucune clé** :

```bash
curl -s http://127.0.0.1:8765/api/ai/status
```

Le champ `provider` doit être `groq`. Si la réponse indique `openai` et que vous avez une clé Groq, le processus Python écoute encore avec l'ancienne configuration (ou `AI_PROVIDER=openai`).

1. Dans le Terminal qui héberge le serveur, faire `Ctrl+C`.
2. Exécuter `git pull origin main`, `unset OPENAI_API_KEY`, `export AI_PROVIDER=groq`.
3. Saisir la clé Groq dans `GROQ_API_KEY`, puis relancer `python3 dev/local-preview/server.py`.
4. Le message de démarrage doit maintenant indiquer **`IA active : GROQ`** et le modèle choisi.

Si l'ancien processus occupe encore le port 8765, utiliser `lsof -nP -iTCP:8765 -sTCP:LISTEN` pour identifier son PID et terminer ce processus après vérification.

Pour valider une clé Groq indépendamment de Python :

```bash
curl -sS -o /dev/null -w "Groq HTTP %{http_code}\n" \\
  https://api.groq.com/openai/v1/models \\
  -H "Authorization: Bearer $GROQ_API_KEY"
```

- **Groq HTTP 200** : Groq accepte la clé ; vérifier ensuite le fournisseur actif dans localhost.
- **Groq HTTP 401** : la clé Groq est invalide ou révoquée ; recréer une clé dans Groq.
- **Groq HTTP 403** : le compte ou la clé manque d'autorisation.

Le serveur refuse désormais dès son démarrage une configuration `OPENAI_API_KEY=gsk_...` : il affiche une explication au lieu d'attendre un 401 pendant une simulation.

## Correctif Cloudflare HTTP 403 (macOS Python)

Sur macOS, le client HTTP Python standard `urllib` peut être refusé **en amont** par Cloudflare avec `HTTP 403`, même sans clé ou avec une clé volontairement invalide. Le serveur utilisait l'en-tête par défaut `Python-urllib/3.x`. Le correctif utilise explicitement `User-Agent: AIInterviewPlatform/0.1` pour toutes les requêtes Groq, sans publier la clé.

La cause a été reproduite sur le Mac connecté :
- Python `urllib` sans identité client : `HTTP 403` non-JSON, serveur Cloudflare.
- Même URL avec un `User-Agent` personnalisé : `HTTP 401` attendu lorsque aucune clé n'est fournie.
- Test d'intégration automatisé : l'en-tête personnalisé est systématiquement présent sur le client Groq.

Un `401` avec **une véritable clé** nécessite encore de vérifier l'authentification. Un `403` provenant d'un JSON Groq (plutôt que Cloudflare) peut signaler une permission du compte.

## Problèmes courants

- **Option IA grisée** : arrêter le serveur, définir `GROQ_API_KEY` (ou `OPENAI_API_KEY`) dans le Terminal qui le lance, puis redémarrer.
- **HTTP 401 du fournisseur** : confirmer que la clé correspond au bon domaine API (Groq ≠ OpenAI) puis vérifier sa validité.
- **Réponse HTTP 429** : vérifier les quotas API. Ne pas relancer en boucle.
- **Le domaine ne change pas** : la spécialité est visible uniquement quand `Entretien technique` est sélectionné.
- **Aucun résultat** : choisir une difficulté plus large. Toutes les catégories n'ont pas des questions à chaque niveau.
