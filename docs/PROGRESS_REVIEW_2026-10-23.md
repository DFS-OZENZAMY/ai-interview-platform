# AI Interview Platform — Revue d’avancement — 23 octobre 2026

## Terminé / intégré dans la branche de travail
- Auth Supabase + trois rôles de test (user, admin, coach) ; vérification des rôles sur l'espace candidat.
- Onboarding adaptatif en étapes cumulatives, profil candidat enregistré et préférences par défaut.
- UX du dashboard EdTech, progressive et CTA évolutif selon les résultats disponibles.
- Configurateur en trois étapes : RH/technique, poste obligatoire, fiche texte/fichier facultative dans un champ unifié, langue et priorités préremplies, durées 10/20/35 min (20 par défaut).
- Schéma SQL de résultats de simulation avec politiques SELECT RLS par candidat (fichier de migration uniquement ; NON appliqué à distance).
- Pont API Next.js authentifié vers le laboratoire IA Python local pour démarrer une session et transmettre une réponse.
- Page /interview : question visible, synthèse vocale navigateur, dictée optionnelle suivant support navigateur, réponse texte de secours, bouton « J'ai terminé », interruption manuelle « Prendre la parole », pause d'interface, confirmation de fin.
- Lint, TypeScript et build Next.js validés ; branche feat/UX-01-design-system-and-journey, dernier commit 74642fb.

## Prototype / non validé de bout en bout
- Serveur IA Python localhost:8765 inaccessible lors du contrôle final : impossible de vérifier le fournisseur IA et une session réelle.
- Le laboratoire utilise des questions brouillon, sessions en mémoire et retours textuels non notés ; ni scoring hybride ni persistance Supabase.
- Reconnaissance vocale dépendante du navigateur ; pas encore de VAD automatique, tour de parole fiable, reprise sur incident ou pipeline audio serveur.
- Pause actuelle : suspension UX locale seulement ; aucun protocole de pause serveur. Fin anticipée : pas encore de bilan partiel conservé.
- Durée choisie traduit provisoirement un nombre de questions dans le laboratoire, pas un véritable entretien chronométré.
- Poste/description transmis à l'API locale en texte court ; fichier PDF/Word sélectionnable, mais ni extraction ni transmission.
- Dashboard dépend de la table candidate_interview_results, migration à appliquer. Aucune insertion de résultats depuis le moteur n'est en place.
- Liens de débriefing, historique cliquable, scoring et recommandation issus de la production IA restent à développer.
- Réglages de profil via menu « Mon profil » pointent toujours vers la route onboarding ; à clarifier.

## Séquence d'exécution prioritaire
1. Démarrer/configurer le laboratoire localhost:8765 avec GROQ_API_KEY ou OPENAI_API_KEY côté serveur et tester la session depuis /interview.
2. Stabiliser la capture vocale, VAD, pause/reprise, fin anticipée et le protocole de session avec test E2E.
3. Construire le flux sécurisé d'extraction de fiche de poste et les prompts RH/technique contextualisés.
4. Déployer/valider la migration Supabase, créer l'écriture serveur autorisée pour sessions et bilans.
5. Implémenter le débriefing progressif, scoring hybride avec couverture et preuves, bilan partiel.
6. Brancher tableau de bord et historique, vérifier les transitions 0/1/N sur vraies sessions.
7. Audit UX, sécurité/données personnelles et validation utilisateurs.
8. Synchroniser les tâches et statuts ClickUp avec preuves de commits/PR après levée de limite MCP.

## ClickUp
Workspace DREAM TEAM → dossier Projets → liste Product Backlog (list ID 1200420000031690).
L'accès aux tâches est temporairement bloqué : quota MCP ClickUp atteint. **Aucun statut ClickUp modifié.**
