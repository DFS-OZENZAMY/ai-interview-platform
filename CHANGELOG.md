# Changelog

Le projet est au stade **POC technique**, avec banque de questions Supabase déployée et connecteur S2-04 minimal. Aucune release de production ni version applicative complète n'est revendiquée.

## Unreleased — 2026-10-22

### Added

- Simulation IA optionnelle sur localhost via OpenAI Responses API côté serveur, relances liées aux réponses et bilan qualitatif sans note ; consentement utilisateur et clé jamais envoyée au navigateur.
- Objectifs RH/techniques spécialisés par type et domaine de simulation, sans écraser les préférences du profil.
- Suite de tests AI/Chromium couvrant choix du métier, consentement, relances et protection des brouillons.

- Parcours E2E navigateur **nouvel utilisateur** (inscription, onboarding, profil, configuration de simulation, 3 questions de démonstration, récapitulatif et retour au profil).
- Supabase `public.candidate_profiles` : préférences S2-01 enregistrées par utilisateur avec RLS `auth.uid() = user_id`, aucune donnée de CV ou fiche de poste collectée à l'onboarding.
- Mode local démo complet et mode optionnel **Auth Supabase réel** pour enregistrer le profil sans publier de questions.
- Tests automatisés Chromium (parcours démo complet + Auth/REST simulés par interception réseau), contrôles statiques RLS et guide `docs/NEW_USER_E2E.md`.
- 120 questions de préparation aux entretiens (50 RH, 70 techniques), toutes en brouillon.
- Spécification S2-03, comptes rendus de revue, rapport de calibration et document de suivi.
- Guide des agents IA `CLAUDE.md`, index documentaire, gouvernance du dépôt et statut projet.
- Templates d'issues et de Pull Request, conventions EditorConfig/GitAttributes, Dependabot GitHub Actions.
- Validation structurelle JSON et tests de non-régression sur le corpus.

- Migrations PostgreSQL 0001–0006 sur projet Supabase dédié, 120 questions importées sous statut draft.
- Edge Function Auth question-bank v4, séparation candidat / moteur / évaluateur et API de sessions sécurisées.
- Snapshots immuables de questions, sélection dynamique sans doublons et clôture contrôlée des sessions.
- Adaptateur et orchestrateur S2-04, tests PostgreSQL sur base réelle/éphémère, tests Node/Deno.
- Script de recette HTTP avec comptes Supabase Auth de test à provisionner.

### Changed
- README actualisé pour refléter le POC et le Sprint 2.
- Sécurité et contribution alignées avec un dépôt **public** et l'absence de protections bloquantes présumées.

### Known gaps
- Aucune question publiée : corpus encore soumis à revue humaine.
- Raccordement technique S2-04 livré, mais moteur conversationnel IA, interface candidat et scoring incomplets.
- 100 questions générées par IA nécessitent revue humaine ; validation technique experte ouverte.
- CI PostgreSQL/Node/Deno confirmée verte. Recette HTTP réelle non exécutée (zéro utilisateur Auth dans le projet au 22/10/2026).
