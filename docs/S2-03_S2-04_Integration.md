# S2-03 → S2-04 — Intégration sécurisée du catalogue

**Projet Supabase :** `ai-interview-platform` (`aqybktqgoartjiqoqcfg`), région Paris.

## Composants livrés

- Edge Function `question-bank`, déployée avec `verify_jwt=true`.
- Point de terminaison : `https://aqybktqgoartjiqoqcfg.supabase.co/functions/v1/question-bank`.
- Client serveur S2-04 : `src/integrations/s2-04/question-bank-client.mjs`.
- Tests unitaires d'adaptateur : `tests/test_s2_04_bridge.mjs`.
- Vérification TypeScript Deno et Node dans GitHub Actions.

### Contrat

| Route | Identité nécessaire | Réponse |
|---|---|---|
| `GET /questions?locale=fr&family=rh&limit=20` | **rôle serveur interview_engine/admin avec JWT** | questions courantes publiées uniquement, sans attendus ; les candidats ne peuvent pas énumérer le catalogue |
| `GET /engine/snapshot/RH-004?locale=fr` | rôle serveur `interview_engine` ou `admin` dans `app_metadata.ai_interview_role` | identifiants immuables version de question/grille et formulation |
| `GET /evaluator/questions/RH-004?locale=fr` | rôle `evaluator` ou `admin` dans `app_metadata.ai_interview_role` | références internes d'évaluation ; jamais à communiquer au navigateur |

Les rôles proviennent exclusivement de `app_metadata` maintenu côté serveur, **jamais** de `user_metadata`, ni d'un paramètre libre envoyé par le client. La fonction valide également l'utilisateur via Supabase Auth. Chaque requête au catalogue lit uniquement `question_bank.published_questions_safe`. Les champs sensibles ne sont joints qu'après contrôle du rôle `evaluator` ou `admin`.

**Aujourd'hui : 120 questions `draft`, donc l'API répond avec un catalogue vide.** Aucun mode test ne contourne la publication.

## Exemple côté serveur S2-04

```js
import { createQuestionBankClient } from "./src/integrations/s2-04/question-bank-client.mjs";

const bank = createQuestionBankClient({
  baseUrl: "https://aqybktqgoartjiqoqcfg.supabase.co/functions/v1/question-bank",
  // Fournir le JWT de la session/service authentifié côté serveur.
  // Ne PAS placer un service-role key dans le navigateur.
  tokenProvider: async () => obtainVerifiedServerSideAccessToken(),
});
const { items } = await bank.listPublished({ locale: "fr", family: "technical" });
// Le moteur S2-04 implémentera sa propre sélection dynamique.
```

## Conditions pour une intégration S2-04 de bout en bout

1. Implémenter le moteur d'entretien proprement dit et son authentification serveur, non présents dans cette tranche.
2. Définir et attribuer des rôles de service avec une procédure administrateur. **Aucun utilisateur n'est promu automatiquement.**
3. Persister un snapshot par tour (question_version_id, rubric_version_id, locale, prompt réellement posé).
4. Valider toutes les questions destinées à être distribuées, puis publier explicitement le lot approuvé.
5. Effectuer une recette avec utilisateurs de test autorisés (candidat / engine / evaluator), vrais JWT, tentatives non autorisées et vérification que les attendus ne quittent pas le serveur.

## Sécurité et limites

- Edge Function utilise `SUPABASE_DB_URL` uniquement dans le runtime serveur. Les connexions DB ne doivent jamais figurer dans Git.
- Elle ouvre une connexion côté serveur avec les permissions de l'URL fournie par Supabase ; **ce n'est pas encore une identité DB à privilèges SELECT uniquement**. Un rôle DB dédié, les limites de débit, la revue de logs et l'isolation multi-session seront nécessaires avant production.
- Le connecteur GitHub peut vérifier le code et les tests unitaires ; les tests réels d'autorisation via des comptes Auth ne sont pas encore prouvés.
- Les endpoints évaluateur ne doivent jamais être exposés directement à l'application navigateur, même lorsqu'un utilisateur est administrateur.

**Statut :** service S2-03 déployé, adaptateur S2-04 livré en branche ; parcours d'entretien réel à développer et tester avant clôture de S2-04.

## Extension livrée : sessions et snapshots persistants S2-04

La migration `0005_interview_session_snapshots.sql` ajoute les deux tables privées `question_bank.interview_sessions` et `question_bank.interview_question_snapshots`. Les snapshots stockent le **prompt réellement posé**, le `question_version_id`, le `rubric_version_id`, la langue et l'ordre des tours. Ils sont immuables et restent valables lorsqu'une question reçoit une nouvelle version. Toutes les actions de sélection passent par une version effectivement publiée et une grille publiée.

| Méthode et route (sous `question-bank`) | Accès | Comportement |
|---|---|---|
| `POST /engine/sessions` | `interview_engine/admin` | Initialise une session avec `candidate_user_id` et `locale` |
| `POST /engine/sessions/:id/questions` | moteur propriétaire | Assigne explicitement le code d'une question publiée et crée son snapshot |
| `POST /engine/sessions/:id/questions/next` | moteur propriétaire | Choisit la suivante selon famille/catégorie/difficulté, sans répéter un code |
| `POST /engine/sessions/:id/complete` | moteur propriétaire | Clôture une session, enregistre `completed_at` et refuse la suite |
| `GET /engine/sessions/:id/questions` | moteur propriétaire | Relit les identifiants de version et les prompts persistés |
| `GET /candidate/sessions/:id/questions` | candidat propriétaire de la session | Renvoie uniquement le prompt et l'ordre ; pas de critères internes |

Exemple d'orchestration côté serveur :

```js
import { createInterviewSessionOrchestrator } from "./src/interview-engine/session-orchestrator.mjs";
// `bank` est le client sécurisé createQuestionBankClient déjà configuré.
const engine = createInterviewSessionOrchestrator(bank);
const first = await engine.start({
  candidateUserId: verifiedCandidateId,
  locale: "fr",
  selection: { family: "rh", difficulty: 1 },
});
const next = await engine.next(first.sessionId, {family:"rh", difficulty:2});
const history = await engine.replay(first.sessionId);
const closed = await engine.finish(first.sessionId);
```

**Aucun entretien ne peut démarrer via l'orchestrateur lorsqu'aucune question n'est publiée.** Les 120 questions du corpus sont encore en brouillon.

### Portée fonctionnelle

Cette extension prouve une sélection déterministe selon des contraintes métier et la persistance du handoff S2-03 → S2-04. **Elle n'est pas la boucle IA conversationnelle finale** : suivi des réponses, relances sémantiques, avatar/voix, moteur de scoring et coaching restent dans leurs sprints respectifs.

La recette de vraie session HTTP avec utilisateurs de test et rôles vérifiés est décrite dans [le bilan technique](S2-03_Technical_Closure_2026-10-22.md).


### Durcissement final : anti-énumération

La route `GET /questions` exige maintenant `app_metadata.ai_interview_role = interview_engine` ou `admin`. Un candidat authentifié ne peut **pas** lister les questions susceptibles d'être posées plus tard. Il peut uniquement consulter les prompts d'une session dont il est propriétaire via `GET /candidate/sessions/:id/questions`. Une authentification seule n'accorde aucun accès au catalogue global. Les tests HTTP sont mis à jour dans `scripts/smoke_question_bank_http.mjs`.
