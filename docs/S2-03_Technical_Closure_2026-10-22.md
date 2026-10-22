# S2-03 — Bilan de clôture technique et limites de recette

**Date : 22 octobre 2026**  
**Dépôt :** `Achrafsila/ai-interview-platform`  
**Base dédiée :** `ai-interview-platform` — `aqybktqgoartjiqoqcfg` — Paris  
**Travail :** [PR #42](https://github.com/Achrafsila/ai-interview-platform/pull/42)

## Ce que nous avons réellement développé

- Modèle `question_bank` contenant 120 questions en brouillon, 240 traductions FR/EN, grilles, révisions et audit.
- Versions publiées immuables et contrôles de publication humaine avant apparition dans le catalogue.
- Tables `interview_sessions` et `interview_question_snapshots` avec séparation candidate/engine, droits clients DB refusés et RLS activée.
- Procédures SQL privées `open_interview_session`, `append_published_question`, `next_interview_question` : lecture des seules versions publiées, anti-doublon, filtres famille/catégorie/difficulté, verrou de session et snapshot conservant texte et identifiants de version.
- Edge Function `question-bank` exigeant `verify_jwt=true` et vérification serveur `auth.getUser`; rôles `interview_engine`, `evaluator`, `admin` lus exclusivement dans `app_metadata.ai_interview_role`. Aucun droit accordé directement à `anon` ou `authenticated` dans le schéma interne.
- Endpoints protégés : consultation candidate-safe des questions et tours de session, création de sessions moteur, assignation explicite de question, sélection automatique suivante, relecture des snapshots et consultation séparée des références d'évaluation.
- Adaptateur S2-04 `src/integrations/s2-04/question-bank-client.mjs` et orchestrateur de session `src/interview-engine/session-orchestrator.mjs`.
- Tests CI PostgreSQL, politiques de rôles Deno, typage Edge et tests Node de l'adaptateur/orchestrateur.

## Matrice de recette

| Test | Preuve | État |
|---|---|---|
| Migrations PostgreSQL et intégrité FK | GitHub Actions PostgreSQL 16 | Réussi |
| 120 questions JSON validées et toujours draft | CI Python + Supabase réel | Réussi |
| RLS/GRANTS : pas d'accès direct client aux attendus | SQL réel, permissions vérifiées | Réussi |
| Versionnement et publication avec réviseur humain synthétique | SQL transactionnel et rollback | Réussi |
| Session fictive, refus d'une question draft, sélection d'une published, anti-doublon, filtrage FR/EN | `db/postgres/tests/0004_interview_session_snapshots.sql` sur PostgreSQL CI et Supabase | Réussi |
| Restauration de l'ancien prompt après nouvelle révision | Test SQL avec deux versions publiées synthétiques | Réussi |
| Refus des modifications sur snapshots publiés | Test SQL d'immuabilité | Réussi |
| Isolation des rôles `user_metadata` vs `app_metadata` et exclusion des champs internes | `policy_test.ts` dans CI | Réussi |
| Adaptateur et orchestration de session S2-04 | Tests Node isolés avec faux serveur HTTP | Réussi |
| Edge Function déployée et `verify_jwt=true` | État Supabase du service `question-bank` | Réussi |
| **API HTTP réellement appelée par candidat + moteur + évaluateur Supabase Auth** | Test `scripts/smoke_question_bank_http.mjs` | **Non exécuté : aucun utilisateur Auth projet à ce jour** |
| **Session d'entretien IA avec questions publiées après revue humaine** | Parcours application complet | **Non exécuté : toutes les 120 questions sont draft** |
| **Rôles DB dédiés et audit de sécurité production** | Revue approfondie indépendante | **Non réalisé : Edge Function dispose d'une connexion Postgres serveur privilégiée** |

La preuve de fonctionnement du contrat technique ne doit pas être présentée comme une recette de production ni comme un moteur conversationnel IA complet.

## Procédure pour la recette HTTP réelle

1. Dans le projet dédié, créer des **comptes de test synthétiques** via le service d'authentification Supabase.
2. Le candidat n'a aucun rôle privilégié ; le compte de service moteur doit recevoir `ai_interview_role: "interview_engine"` dans `app_metadata` **par l'API Admin Supabase depuis un environnement serveur de confiance**. Ne jamais utiliser `user_metadata` pour une autorisation ni placer de secret `service_role` dans un navigateur.
3. Renseigner localement, sans les commiter, les variables `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `TEST_CANDIDATE_EMAIL`, `TEST_CANDIDATE_PASSWORD` et éventuellement `TEST_ENGINE_EMAIL` / `TEST_ENGINE_PASSWORD`.
4. Exécuter `node scripts/smoke_question_bank_http.mjs`. Le script valide les refus 401/403, le catalogue publiable, les sessions moteur et l'isolation des réponses candidat. En l'absence de questions publiées, il saute volontairement le test positif de sélection.
5. Ne publier que des questions **validées par un expert humain** ; utiliser le portail de simulation pour le test intégral de S2-04, puis nettoyer les sessions de test selon la politique de conservation retenue.

## Décision de clôture par tâche (source ClickUp)

- **Configurer le versioning, les droits d'accès et la sécurité :** couche base/Edge **réalisée au niveau POC**, mais tests Auth réels et droits PostgreSQL de service minimal encore à homologuer. Ne pas déclarer « sécurité production auditée ».
- **Connecter les banques au moteur IA S2-04 :** **connecteur et mini-orchestrateur opérationnels au niveau code**, avec conservation durable des questions posées. La boucle conversationnelle IA, les relances dynamiques et l'interface produit relèvent encore de S2-04.
- **Exécuter les tests d'intégration et valider la fonctionnalité :** tests CI et DB réels réussis, mais **recette HTTP multi-utilisateur et application complète non réalisables sans utilisateurs de test et questions approuvées**.

**Conclusion :** la tranche S2-03 de persistance / sélection / sécurité est livrable. Les statuts ClickUp ne doivent être cochés comme totalement terminés qu'en accord avec les critères de leur périmètre ; les deux limites bloquantes ne doivent pas être dissimulées.


## Dernier durcissement — PR #43

Edge Function `question-bank` **version 4** déployée et active. La lecture globale du catalogue exige désormais le rôle `interview_engine/admin` et non la simple présence d'un JWT utilisateur. Le candidat ne voit que les formulations des questions déjà attribuées à sa propre session. Cette modification est fusionnée sur `main` après quatre jobs CI verts. L'essai HTTP avec une identité Auth réelle n'a pas encore été exécuté (aucun compte test Auth dans le projet).
