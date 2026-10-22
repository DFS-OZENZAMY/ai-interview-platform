# État du projet et roadmap — 22 octobre 2026

**Source pour le code et les livrables :** ce dépôt. **Source pour les statuts officiels du backlog :** ClickUp. Les statuts ClickUp n'ont pas été synchronisés lors du dernier audit (limite API).

## Synthèse

| Axe | État vérifiable | Étape restante |
|---|---|---|
| Gestion de dépôt | Documentation, templates et CI du corpus présents | Confirmer exécution des workflows et gouvernance future |
| S1-01/S1-02 | Fondations documentaires et architecture conceptuelle disponibles | Choix de stack, sécurité, données et POC technique |
| S2-01 | Invariants produit formalisés dans les décisions / guide agent | Intégration et test du parcours non vérifiés |
| S2-03 | Projet Supabase Paris actif, 120 questions `draft`, versioning, sécurité RLS, API Auth, snapshots immuables et raccordement technique S2-04 développés | Revue humaine du corpus et recette HTTP multirôle / parcours conversationnel complet |
| Calibration S2-03 | 12 cas synthétiques étudiés sur grilles provisoires | Valider ancrages/limites ; rejouer avec moteur réel au Sprint 3 |
| S2-04 et suites | Contrats et travaux prévus | Développement et tests d'intégration non démontrés |

## Ce qui ne doit PAS être présenté comme réalisé

- Une application utilisable en production, un environnement Supabase ou une intégration moteur effective.
- Une validation humaine du corpus complet ou la publication des questions.
- Une règle de branche qui bloque effectivement les merges ; l'état des protections reste à vérifier.
- Une CI verte : l'existence du workflow ne prouve pas qu'un run a réussi.

## Priorités avant développement

1. Valider les choix de stack/DB et gouvernance des données (sans présumer Supabase déployé).
2. Harmoniser le dictionnaire des catégories RH ; personnaliser les relances et localiser les attendus nécessaires.
3. Effectuer la relecture métier du corpus et la calibration définitive.
4. Développer stockage, versioning, accès séparés et consommation S2-04.
5. Exécuter tests de sécurité et bout-en-bout.

## Règle de clôture

Une tâche de *conception* peut être achevée quand décisions et documents sont approuvés ; une tâche de *fonctionnalité* n'est achevée que lorsque son comportement et ses critères d'acceptation sont démontrés.


## Livraison technique intégrée le 22/10/2026

La PR #39 a été fusionnée dans `main` après contrôles Python et PostgreSQL 16 CI réussis. Ce jalon clôture **la tranche prototype et persistance de référence**, mais **pas S2-03** : base dédiée et migrations déployées, rôles d'application, revue qualité métier, API réelle et tests S2-04 restent à produire. Voir [les conditions de clôture](S2-03_Closure_Gates.md).


## Mise à jour technique la plus récente — PR #42 (22/10/2026)

Le projet Supabase `ai-interview-platform` est dédié à cette application. Les migrations 0001–0006 sont appliquées, l'Edge Function `question-bank` version 4 est active avec `verify_jwt=true`, les 120 questions restent `draft`. L'orchestrateur S2-04 **minimal** sait démarrer une session, sélectionner une question approuvée (ou refuser de démarrer), persister/rejouer un snapshot et clore une session. La validation du moteur conversationnel IA complet appartient à S2-04, pas au contrat de banque.

Les tests réels SQL (transactions annulées) et CI ont réussi. **Aucun utilisateur Supabase Auth ni question publiée : la recette HTTP positive avec JWT et la validation métier restent des critères ouverts.** Consulter [le bilan de clôture technique](S2-03_Technical_Closure_2026-10-22.md) et [le suivi d'implémentation](S2-03_Implementation_Tracker.md) avant de cocher les cases ClickUp.
