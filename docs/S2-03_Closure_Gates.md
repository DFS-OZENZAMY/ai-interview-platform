# S2-03 — Plan de clôture vérifiable

**État actualisé (22/10/2026) :** stockage Supabase, service JWT, sécurité de base et raccordement technique de sessions S2-04 opérationnels au niveau POC. Le parent ClickUp reste ouvert jusqu'à revue métier et vraie recette HTTP/utilisateur.

## Livré et testé
- Corpus : 120 questions `draft`, JSON FR/EN, identifiants uniques.
- Catalogue Python en lecture : filtres, pagination, séparation candidat/évaluateur.
- Modèle PostgreSQL : tables catégories/compétences, questions/versions, grilles, localisations, propositions, audit.
- Fonctions de publication avec garde-fous, immutabilité des versions.
- CI Python et PostgreSQL 16 éphémère : test positif/négatif de publication, migrations exécutées dans une DB de test.
- Contrat d'API proposé : `docs/api/question-bank.openapi.yaml`, **non servi par un endpoint réel**.

## Restant et conditions de validation

| Chantier ClickUp existant | Condition pour cocher « terminé » | Aujourd'hui |
|---|---|---|
| Valider la qualité métier du corpus | 100 nouvelles fiches éditoriales relues, 70 techniques revues par experts ; catégories/relances harmonisées | Ouvert |
| Implémenter les banques dans Supabase | Projet dédié, migrations appliquées et import contrôlé | **Réalisé et vérifié** |
| Versioning, droits et sécurité | Modèle de rôles, vérification JWT en Edge, RLS, audit, snapshots et tests SQL/rôles | **Implémenté pour POC** ; homologation production et vrais JWT en attente |
| Connexion banques à S2-04 | API active, orchestrateur de sessions, sélection sans doublon, snapshot et relecture/clôture | **Raccordement technique réalisé** ; IA conversationnelle à développer dans S2-04 |
| Tests d'intégration complets | CI PostgreSQL/Node/Deno et tests SQL sur Supabase réels réussis | **Partiel** : aucun utilisateur Auth pour recette HTTP réelle, corpus non approuvé |

## Checklist minimum avant la clôture S2-03

1. Désigner un backend et une base propres à AI Interview Platform, sans réutiliser d'autres projets.
2. Valider les aspects réglementaires de traitement et de conservation des réponses de candidats.
3. Revoir et approuver humainement toutes les questions destinées à la publication.
4. Compléter l'API serveur (l'OpenAPI seul ne suffit pas), Auth et règles d'accès selon les rôles.
5. Exécuter migrations/seed sur une base de développement, rejouer tests sécurité et intégration S2-04.
6. Formaliser le Go/No-Go et mettre à jour ClickUp sur preuves.

**Aucune opération Supabase sur Campus Connect ou Mambo CRM n'est autorisée pour ce projet.**


## Avancement vérifié — 22 octobre 2026 (PR #41 fusionnée)

| Tâche ClickUp | Travaux réalisés et preuves | Statut de clôture recommandé |
|---|---|---|
| Configurer versioning, droits d'accès et sécurité | Versions publiées immuables, triggers SQL, RLS sur 10 tables, `anon/authenticated` sans accès direct, service Supabase `question-bank` actif avec `verify_jwt=true`, `auth.getUser` et rôles serveur `app_metadata.ai_interview_role`; CI 4/4 jobs réussis sur PR #41 | **Implémentation achevée pour POC**, validation d'autorisations avec de vrais utilisateurs de test encore ouverte |
| Exécuter tests d'intégration et valider fonctionnalité | Test de migration/seed sur PostgreSQL éphémère, vérification des projections privées, tests adaptateur Node, typecheck Deno, 120 drafts non publiés ; nouveau test SQL positif sur projection publiée synthétique ajouté sur `main` | **Partiel** : absence de test réel HTTP Auth/JWT/S2-04 et du parcours complet, nouveau test SQL à confirmer CI |
| Connecter les banques au moteur S2-04 | Endpoint serveur déployé : liste des versions publiées, snapshot par question versionnée, référence évaluateur ; adaptateur `src/integrations/s2-04/question-bank-client.mjs` versionné, tests unitaires réussis | **Contrat et connecteur livrés**, moteur de simulation S2-04 absent : tâche à garder ouverte pour intégration réelle |

L'Edge Function active est [question-bank](https://supabase.com/dashboard/project/aqybktqgoartjiqoqcfg/functions) et son contrat est documenté dans [S2-03_S2-04_Integration.md](S2-03_S2-04_Integration.md). Les données réelles restent **120 drafts, 0 publication**, ce qui empêche une recette fonctionnelle positive sur les questions du corpus sans validation humaine.

### Critères de clôture restants mesurables

- Définir des identités de test validées (candidat, interview_engine, evaluator), tester vrais JWT avec succès/refus attendus, et révoquer ces droits ensuite.
- Réaliser une simulation complète S2-04 avec version et snapshot persistant (question_version_id, rubric_version_id, locale, prompt) et rejouer une session.
- Obtenir validation métier humaine des questions effectivement publiées ; ne pas promouvoir artificiellement des questions du corpus pour faciliter les tests.
- Refaire les tests de non-divulgation côté navigateur et le Go/No-Go de la recette complète.

**Ce fichier indique les preuves techniques, pas une mise à jour effective dans ClickUp.**


### Essai positif de sécurité de la projection — Supabase réel

Le test SQL transactionnel `db/postgres/tests/0003_published_projection_contract.sql` a été exécuté avec succès sur la base dédiée. Il crée temporairement une révision **fictive** approuvée puis publiée et une révision fictive brouillon, vérifie deux localisations visibles pour la version publiée, l'exclusion du brouillon et l'absence de colonnes privées dans la projection, puis termine par `ROLLBACK`. Vérification effectuée après transaction : **120 questions**, **0 publiée**, **0 visible**, **0 question test persistée**. Ce test prouve le contrat DB mais pas encore une requête HTTP avec JWT utilisateur réel.


## Jalon de fin d'implémentation POC — PR #42

- **Supabase :** migrations 0005/0006, 12 tables avec RLS, sélection dynamique vérifiée sur PostgreSQL réel, fonction `question-bank` version 4 active avec vérification JWT.
- **Version conservée :** `question_version_id`, `rubric_version_id`, langue et prompt figés à chaque tour. Aucune réécriture silencieuse possible après publication d'une nouvelle version.
- **Raccordement S2-04 :** création de session / prochaine question / historique / clôture, avec contrôles du moteur propriétaire et accès candidat restreint.
- **Recette différée :** 0 utilisateur Auth projet et 0 question publiée. [Procédure de test HTTP](S2-03_Technical_Closure_2026-10-22.md) documentée. Ne pas attribuer des permissions admin fictives ni modifier le corpus pour forcer une démonstration.
- **Décision de pilotage :** 9/11 cases techniques S2-03 vérifiables dans GitHub ; dernière recette et validation humaine restent ouvertes. Voir [le tracker](S2-03_Implementation_Tracker.md).


**Durcissement supplémentaire livré :** PR #43, accès `GET /questions` limité à `interview_engine/admin`. Un simple compte candidat Auth ne peut plus énumérer le catalogue. Toujours aucun compte de test Auth ni question du corpus publiée : ne pas marquer la recette HTTP multirôle comme achevée.
