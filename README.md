# AI Interview Platform

Plateforme d'entraînement aux entretiens d'embauche assistée par l'IA. **Statut : POC en développement, Sprint 2 — banque S2-03 déployée et raccordement serveur S2-04 testé.** Base Supabase dédiée, service protégé par JWT et moteur de sessions minimal disponibles. L'interface candidat, les relances IA conversationnelles et la notation ne sont pas encore livrées.

## Démarrage rapide pour contributeurs

1. Lire [l'index de documentation](docs/README.md), [le statut du projet](docs/PROJECT_STATUS.md) et [les conventions de gouvernance](docs/REPO_GOVERNANCE.md).
2. Consulter le ticket ClickUp, vérifier les décisions dans `docs/DECISIONS.md` et créer une branche dédiée à la modification.
3. Pour le corpus de questions, lancer :
   ```bash
   python scripts/validate_question_bank.py
   python -m unittest discover -s tests -v
   ```
4. Utiliser le [modèle de PR](.github/PULL_REQUEST_TEMPLATE.md), noter les tests réalisés et ne mettre le statut ClickUp à jour qu'après preuve de livraison.

Documentation du changement : [CHANGELOG](CHANGELOG.md) · [Modèle ADR](docs/ADR_TEMPLATE.md) · [Checklist de release](docs/RELEASE_CHECKLIST.md).

## Vision produit

Le candidat crée son compte et renseigne son profil (expérience, poste visé, langue, objectifs). Il reçoit ensuite un parcours de préparation adapté. Il passe un entretien IA interactif, idéalement avec avatar vidéo, voix et transcription. Après l'entretien, il obtient une évaluation structurée et explicable, fondée sur une grille versionnée, puis un plan de coaching IA, avec la possibilité de demander un coach humain. Un tableau de bord suit sa progression d'une session à l'autre. Un espace d'administration permet de configurer les parcours, les questions, les grilles d'évaluation et les contenus. Le produit cible le français et l'anglais.

**Hors périmètre.** La plateforme fournit un retour d'entraînement : elle n'est pas un outil de décision d'embauche automatisée. Aucune intégration ATS, facturation, marketplace de coachs ou app mobile native n'est prévue par défaut. Le POC n'autorise pas la collecte de données réelles de candidats sans cadrage de conformité.

## Feuille de route du POC

| Sprint | Thème | Contenu principal |
| --- | --- | --- |
| 1 | Fondations et faisabilité | Conventions Git, architecture logique, modèle de données, POC fournisseurs avatar / voix / transcription |
| 2 | Parcours candidat | Authentification et rôles, onboarding, sessions d'entretien, première intégration multimodale |
| 3 | Scoring et coaching | Évaluation asynchrone sur grille versionnée, feedback avec preuves, plan de coaching, progression |
| 4 | Admin, qualité, démo | Console d'administration, métriques, durcissement sécurité, tests de bout en bout, Go/No-Go |

## État actuel

| Élément | État |
| --- | --- |
| S1-01 Fondation Git / DevOps | Livré (PR #1) |
| S1-02 Architecture et modèle de données conceptuel | Livré (PR #2), proposition v0.1 à affiner |
| Stack frontend / backend / base de données | Supabase PostgreSQL + Edge Function adoptés pour S2-03 ; frontend et architecture finale à confirmer |
| Fournisseur avatar / voix / transcription | Non validé, POC prioritaire |
| Corpus S2-03 | 120 questions FR/EN importées en Supabase, toutes en brouillon ; sécurité/versioning et handoff S2-04 implémentés, revue métier en attente |
| Calibration S2-03 | 12 cas simulés documentés ; moteur de notation non testé |
| Implémentation applicative | Edge Function question-bank v4 active ; API S2-03 et orchestrateur de session S2-04 minimal ; aucune application candidat complète ni scoring |

La fusion de la PR #2 intègre une proposition d'architecture ; elle ne valide pas les choix de stack, de fournisseurs, d'hébergement ou de conformité.

## Documentation

- [`docs/architecture/POC_ARCHITECTURE.md`](docs/architecture/POC_ARCHITECTURE.md) : composants, parcours, frontières de confiance, résilience, décisions ouvertes.
- [`docs/architecture/DATA_MODEL.md`](docs/architecture/DATA_MODEL.md) : entités, cardinalités, invariants, questions ouvertes.
- [`docs/DECISIONS.md`](docs/DECISIONS.md) : registre des décisions techniques (ADR).
- [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md) : branches, commits, PR, Definition of Done.
- [`docs/SECURITY.md`](docs/SECURITY.md) : règles de sécurité et de confidentialité ; dépôt actuellement public.
- [`CLAUDE.md`](CLAUDE.md) : guide de reprise pour les agents IA.
- [`docs/AUDIT_GITHUB_2026-10-22.md`](docs/AUDIT_GITHUB_2026-10-22.md) : constats d'audit et registre des tâches à synchroniser.
- [`docs/S2-03_Question_Bank_Specification.md`](docs/S2-03_Question_Bank_Specification.md) : spécification des banques de questions.
- [`docs/S2-03_Implementation_Tracker.md`](docs/S2-03_Implementation_Tracker.md) : suivi opérationnel S2-03.
- [`docs/S2-03_Technical_Closure_2026-10-22.md`](docs/S2-03_Technical_Closure_2026-10-22.md) : preuves SQL/CI/Supabase et conditions de recette HTTP restantes.
- [`docs/S2-03_S2-04_Integration.md`](docs/S2-03_S2-04_Integration.md) : API sécurisée, sessions et snapshots versionnés.
- [`docs/S2-03_120_Questions_Status.md`](docs/S2-03_120_Questions_Status.md) : détail du corpus 120 questions.
- [`docs/S2-03_Calibration_Grilles_Pilote.md`](docs/S2-03_Calibration_Grilles_Pilote.md) : 12 simulations de calibration (non tests du moteur).
- [`data/question-bank/README.md`](data/question-bank/README.md) : formats et provenance des questions.
- [`scripts/validate_question_bank.py`](scripts/validate_question_bank.py) : validateur structurel ; workflow `.github/workflows/question-bank-validation.yml`.

## Organisation du dépôt

```
docs/           Décisions, conventions, sécurité, architecture
.github/        Modèles d'issue et de PR, workflow de vérification
data/question-bank/   Questions bilingues au statut draft et grilles de référence
scripts/              Validation du corpus JSON
src/                 Adaptateur S2-04 et orchestrateur de sessions
supabase/functions/   Edge Function sécurisée et tests de rôle
db/postgres/          Migrations, scénarios transactionnels et contrats
tests/               Suite de tests Python et Node
```

## Contribuer

1. Lire `docs/CONTRIBUTING.md` et `docs/DECISIONS.md`, puis vérifier `main`, les branches et PR ouvertes et le ticket ClickUp concerné.
2. Créer une branche depuis `main` : `feat/`, `fix/`, `chore/` ou `docs/` suivi de l'ID du ticket et du sujet (ex. `docs/S1-03-provider-poc`).
3. Utiliser les Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`, `ci:`).
4. Ouvrir une Pull Request avec la référence ClickUp, la portée et le plan de test. Les revues sont recommandées ; le workflow JSON doit être contrôlé lorsqu'il est déclenché, et la présence d'une règle de branche bloquante ne doit pas être présumée.
5. Après intégration, mettre à jour la tâche ClickUp (avec l'accord du Product Owner) et consigner toute nouvelle décision dans `docs/DECISIONS.md`.

Le backlog et le suivi des sprints sont tenus dans ClickUp ; GitHub et ClickUp sont les sources de vérité du projet.

## Sécurité et confidentialité

**Ce dépôt est public.** Ne jamais y versionner de secrets, tokens, identifiants de service, CV, enregistrements, transcriptions ou données de candidats, y compris dans les issues et PR. Les tests et démonstrations utilisent uniquement des données synthétiques. Toute clé divulguée doit être révoquée immédiatement.

## Équipe

| Personne | Rôle indicatif |
| --- | --- |
| Achraf | Sponsor, Product Owner, arbitrages métier |
| Othmane | Référent technique : architecture, implémentation, DevOps |
| Mehdi | Contributeur et reviewer technique / produit |

Des copilotes IA (ChatGPT, Claude) assistent l'équipe pour la conception, la documentation et la revue. Les rôles restent à confirmer en équipe.
