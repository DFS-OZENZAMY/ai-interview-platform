# S2-03 — Pilotage d'implémentation et état réel

**Projet :** AI Interview Platform  
**Date de référence :** 22 octobre 2026  
**Tâche ClickUp :** [S2-03 — Créer banques de questions RH et techniques](https://app.clickup.com/t/123ru7uztgq)  
**Statut :** conception terminée ; corpus de 120 questions rédigé en brouillon ; calibration de 12 cas simulés documentée ; développement et publication non effectués.

## Décision d'organisation ClickUp

**Ne pas créer de nouvelle tâche principale ni multiplier les sous-tâches.** Garder sous S2-03 les trois sous-tâches existantes :

1. `Conception & spécifications` — achevée.
2. `Intégrer le Markdown dans GitHub` — achevée.
3. `Implémentation & validation` — ouverte : suivre les travaux ci-dessous sous forme de checklist.

### Checklist à copier dans « Implémentation & validation »

- [x] Préparer le corpus pilote de 20 questions et ses grilles.
- [x] Terminer la revue éditoriale des 10 questions RH (RH-001 à RH-010).
- [x] Pré-auditer et corriger par IA les 10 questions techniques (TECH-001 à TECH-010).
- [x] Versionner les JSON pilotes et les comptes rendus dans GitHub.
- [x] Réaliser la calibration illustrative des grilles sur 12 réponses simulées, y compris un cas N/E (moteur réel non testé).
- [x] Rédiger et versionner en brouillon les 100 questions restantes pour atteindre 50 RH/transverses + 70 techniques (revue qualité en attente).
- [ ] Faire la validation métier finale des questions techniques et du corpus complet (inclut **harmonisation des catégories**, **personnalisation des relances génériques**, **validation des attendus et variantes**, **localisation complète si nécessaire**).
- [x] Implémenter la structure, migrations, historique des versions et import initial des 120 questions dans le projet Supabase dédié (publication contrôlée et workflow applicatif à finaliser séparément).
- [x] Appliquer RLS, bloquer l'accès direct client aux attendus, authentifier les routes serveur et tracer les versions/snapshots (périmètre POC ; test HTTP Auth réel restant en recette).
- [x] Connecter S2-03 à l'orchestrateur de sessions S2-04 : API Auth, sélection de versions publiées, snapshot immuable, relecture et clôture de session, tests automatisés SQL/Node.
- [ ] Exécuter la recette AC-01 à AC-10 et documenter l'exploitation avant clôture de S2-03.

## Frontières avec les autres tâches

- **S2-02 :** données de profil professionnel et objectifs de préparation par défaut.
- **S2-04 :** sélection des questions par simulation, relances et déroulement dynamique ; S2-03 ne pilote pas l'entretien.
- **S3-01 :** grilles d'évaluation opérationnelles versionnées ; S2-03 ne définit ici que les références initiales nécessaires aux questions.
- **S3-02 :** scoring/justifications après entretien ; hors S2-03.
- **S3-03 :** correction et validation experte des scores après entretien ; distinct de la revue humaine des contenus de la banque.

## Traçabilité du corpus pilote

| Livrable | Statut | Référence |
|---|---|---|
| 10 questions RH | Éditorial approuvé, non publiées | `data/question-bank/rh_questions.json` |
| 10 questions techniques | Pré-audit IA effectué, expertise externe à réaliser | `data/question-bank/technical_questions.json` |
| Grilles génériques | Draft ; validation des ancrages/critères à poursuivre | `data/question-bank/evaluation_rubrics.json` |
| Spécification et backlog détaillé | Terminé | `docs/S2-03_Question_Bank_Specification.md` |

**Aucune migration, aucun service applicatif et aucune publication Supabase ne sont réalisés du seul fait de ce commit.**

## Définition de terminé

S2-03 pourra être clôturé quand les questions du périmètre V1 seront importées, revues et publiées de façon contrôlée, versionnées, protégées par autorisations, accessibles par le service S2-04, et que les tests de sécurité et d'intégration auront été validés. Les détails restent dans la spécification S2-03 et ses 15 éléments de backlog, sans ajout de 15 sous-tâches ClickUp.


## Mise à jour — corpus étendu à 120 (22/10/2026)

Les 100 questions complémentaires ont été rédigées et ajoutées au dépôt : 40 RH + 60 techniques ; voir [rapport de lot](S2-03_120_Questions_Status.md) et [validateur](../scripts/validate_question_bank.py). La rédaction est terminée, **pas la validation métier**, ni la publication Supabase. Les relances des nouvelles fiches doivent être spécifiées davantage, et les attendus internes sont pour le moment en français.


## Audit de cohérence documentaire — 22/10/2026

- Voir [rapport d'audit](AUDIT_GITHUB_2026-10-22.md), [calibration](S2-03_Calibration_Grilles_Pilote.md) et [guide des agents](../CLAUDE.md).
- La liste ci-dessus indique **6 éléments cochés sur 11 dans le registre GitHub** après réconciliation, mais le taux d'avancement n'est pas une mesure d'effort. Les actions liées à la qualité et au développement peuvent être plus importantes que les livrables documentaires.
- **Synchronisation ClickUp impossible lors de cet audit : limite API atteinte** ; ne pas confondre ces cases du document avec le statut réel dans ClickUp.
- Aucun nouveau ticket parent n'est recommandé. Utiliser la checklist existante sous « Implémentation & validation » et intégrer les trois éléments qualité complémentaires dans la description de cette action.


## Livraison technique — 22/10/2026 (PR #39 intégrée)

La [PR #39](https://github.com/Achrafsila/ai-interview-platform/pull/39) a été **fusionnée sur main** (squash commit `32b5a17`) après validation GitHub Actions des tests Python et du scénario PostgreSQL 16 sur base éphémère.

**Livré dans le dépôt :** catalogue Python en lecture avec séparation candidat/évaluateur, migrations PostgreSQL de référence, contrôles de publication/immutabilité, journalisation, tests automatisés et [contrat OpenAPI interne proposé](api/question-bank.openapi.yaml).

**Non livré :** projet Supabase dédié, application des migrations dans un environnement AI Interview, API HTTP effective, authentification et habilitations opérationnelles, intégration S2-04, approbation humaine complète du corpus. Les actions ClickUp sur ces sujets restent **ouvertes**, malgré la fusion de la PR.

[Conditions de clôture de S2-03](S2-03_Closure_Gates.md). Aucun statut ClickUp n'a été modifié par la fusion GitHub.


## Déploiement Supabase effectif — 22/10/2026

Les migrations PostgreSQL `0001`, `0002` et `0003` ont été **appliquées dans le projet dédié** [ai-interview-platform](https://supabase.com/dashboard/project/aqybktqgoartjiqoqcfg). Les **120 questions** (50 RH/70 techniques) et **240 localisations** ont été importées en `draft`, sans publication ni accès candidat. Les 10 tables ont RLS active ; `anon` et `authenticated` ne disposent pas d'accès au schéma ni de droit de publication. Le générateur de seed répétable a passé les tests d'intégration PostgreSQL dans la [PR #40](https://github.com/Achrafsila/ai-interview-platform/pull/40), fusionnée sur main.

**Les deux parties du point « Implémenter les banques dans Supabase » qui sont prouvées sont les migrations et l'import initial.** La clôture complète dépend encore de la gouvernance métier, du workflow de publication et de l'intégration serveur. Aucun changement de statut ClickUp n'a été effectué depuis ce document.

[Rapport détaillé du déploiement](S2-03_Supabase_Deployment_2026-10-22.md).


## Réconciliation checklist — 22/10/2026

**7/11 actions de la checklist technique GitHub documentées comme réalisées** après la validation du déploiement Supabase. Les 4 points restants : revue métier du corpus, authentification/RLS applicative et journalisation opérationnelle, intégration S2-04, recette complète. La couverture de chaque point est distincte des validations sous-jacentes.

La [matrice d'audit du corpus](S2-03_Quality_Review_Matrix.md) détaille les 120 fiches, 60 relances techniques génériques et les besoins de validation humaine et de localisation des attendus. **ClickUp n'a pas été modifié** : quota API atteint ; synchroniser manuellement le statut de l'action « Implémenter les banques de questions dans Supabase » sur la preuve du déploiement.


## Sécurité d'accès renforcée — 22/10/2026

Migration `0004_private_catalog_boundary.sql` appliquée sur Supabase : aucune permission client (`anon` ou `authenticated`) vers le schéma privé et ses fonctions, vue `published_questions_safe` restreinte aux champs non sensibles et contenant actuellement zéro entrée publiée. Vérifications d'accès sur la base réelle : réussies. [Rapport](S2-03_Access_Security_Verification.md).

**Le point « Versioning, droits d'accès et sécurité » reste ouvert**, malgré les contrôles déjà déployés, car aucun service applicatif authentifié, politique d'accès métier nominative ni test intégral S2-04 n'existent encore. Les 120 questions restent toutes en `draft`.


## Service API authentifié déployé — 22/10/2026 (PR #41 fusionnée)

La [PR #41](https://github.com/Achrafsila/ai-interview-platform/pull/41) a été fusionnée sur `main` (commit `00e380d`). Quatre jobs CI réussis : validation du corpus, intégration PostgreSQL, tests de l'adaptateur S2-04 et vérification TypeScript Deno.

**Supabase en service :** Edge Function `question-bank` `ACTIVE`, `verify_jwt=true`. Contrôle `auth.getUser`, routes de lecture du catalogue `published` uniquement, accès aux snapshots limité aux rôles `interview_engine/admin`, réponses d'évaluation limitées aux rôles `evaluator/admin`, tous définis dans `app_metadata` (serveur). Un adaptateur serveur est désormais versionné sous `src/integrations/s2-04/question-bank-client.mjs` et [documenté](S2-03_S2-04_Integration.md).

**À ne pas confondre avec une recette E2E complète :** le moteur de simulation S2-04, la création contrôlée des identités de test, la persistance des snapshots de sessions est maintenant livrée dans la PR #42 ; les essais avec vrais JWT/rôles restent manquants. Aucun utilisateur n'a été promu administrateur ou évaluateur et aucune question n'a été publiée. Le **raccordement technique S2-03 → orchestrateur S2-04** est maintenant livré par la PR #42 ; la **recette HTTP multirôle / parcours conversationnel** reste ouverte. La sécurité et les droits sont en place pour les données et pour les routes, mais doivent encore subir des tests réels multirôles.


## Réconciliation à la livraison PR #42

**9 actions sur 11** peuvent être considérées comme réalisées dans la checklist GitHub au titre du périmètre technique S2-03. Les deux actions restantes concernent la **validation métier humaine du corpus** et la **recette applicative complète avec de vrais JWT et le moteur conversationnel**.

- PostgreSQL : migration 0005 (sessions, snapshots immuables, sélection des seules questions publiées) et 0006 (clôture propriétaire de session) **appliquées sur Supabase** ; test SQL transactionnel positif sur la base réelle exécuté avec `ROLLBACK`.
- Edge Function `question-bank` : **version 4 ACTIVE**, vérification JWT activée, séparation rôle engine/evaluator/candidate, méthodes de démarrage/choix/relecture/clôture.
- S2-04 : client et orchestrateur déterministe versionnés et testés. **Ne pas confondre avec l'implémentation du moteur conversationnel IA de la tâche S2-04.**
- Base Supabase vérifiée : 120 questions draft, 0 publiée, 0 session fictive persistée, 12 tables avec RLS. Aucun compte Supabase Auth créé dans ce projet lors de la vérification.
- Références de test et limites : [bilan technique](S2-03_Technical_Closure_2026-10-22.md), [intégration S2-04](S2-03_S2-04_Integration.md).

**ClickUp non synchronisé automatiquement** ; ses statuts doivent refléter les mêmes restrictions de périmètre et preuves.


**Sécurité renforcée via [PR #43](https://github.com/Achrafsila/ai-interview-platform/pull/43) :** le catalogue global n'est plus énumérable par un candidat authentifié ; seuls les rôles moteur/admin peuvent le parcourir. Le candidat peut lire uniquement les questions de ses sessions autorisées. Les quatre jobs CI ont réussi et la version 4 est active dans Supabase.
