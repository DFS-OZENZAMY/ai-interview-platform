# Documentation — AI Interview Platform

Cette page sert de **point d'entrée** pour les contributeurs, les développeurs et les agents IA. **ClickUp** pilote l'avancement ; **GitHub** héberge le contenu versionné. Les deux ne doivent pas être confondus.

## Démarrer

1. [Vue d'ensemble du dépôt](../README.md)
2. [État réel et jalons du POC](PROJECT_STATUS.md)
3. [Architecture proposée](architecture/POC_ARCHITECTURE.md) et [modèle conceptuel](architecture/DATA_MODEL.md)
4. [Décisions produit et techniques](DECISIONS.md)
5. [Sécurité et confidentialité](SECURITY.md)
6. [Guide de contribution](CONTRIBUTING.md)
7. [Consignes aux agents IA](../CLAUDE.md)

## État et livrables par chantier

| Domaine | Documents principaux | État |
|---|---|---|
| Sprint 1 | Architecture, modèle de données, ADR | Proposition partielle, choix techniques ouverts |
| S2-01 — Onboarding | [Parcours E2E nouveau candidat](NEW_USER_E2E.md), migration de profil RLS et test Chromium | Interface et parcours démo validés ; vrai compte Supabase à tester manuellement |
| S2-03 — Banques de questions | [Spécification](S2-03_Question_Bank_Specification.md), [suivi](S2-03_Implementation_Tracker.md), [état du corpus](S2-03_120_Questions_Status.md) | 120 questions brouillon, validation finale en attente |
| S2-03 — Qualité | [Revue RH](S2-03_Revue_RH_Cloture.md), [audit technique](S2-03_Audit_Technique.md), [calibration](S2-03_Calibration_Grilles_Pilote.md) | Revue RH pilote et audit IA ; moteur non testé |
| Revue du dépôt | [Audit du 22 octobre](AUDIT_GITHUB_2026-10-22.md) | Audit documentaire, pas audit applicatif complet |

## Conventions

- **Source de vérité des tâches : ClickUp.** La checklist Markdown reste indicative si la synchronisation API a échoué.
- **Contenu :** tous les documents dans `docs/`, les corpus versionnés dans `data/question-bank/`, les outils de validation dans `scripts/`.
- **Décisions :** ne pas écrire « validé » à la place de « proposé » ; conserver le responsable et la date d'approbation.
- **Statuts :** `draft` (non publiable), `reviewed` (revue partielle), `published` (approuvé et servi au moteur) ; aucune version du corpus S2-03 n'est aujourd'hui publiée.
- **Données :** seulement des exemples fictifs ou de référence ; jamais de données personnelles de candidats.

## Vérifications locales

Avec Python 3.12+ et sans dépendance tierce :

```bash
python scripts/validate_question_bank.py
python -m unittest discover -s tests -v
```

Les résultats ne remplacent pas une revue spécialisée des questions ni un test du moteur de notation.
