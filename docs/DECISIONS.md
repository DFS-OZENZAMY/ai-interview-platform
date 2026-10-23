# Registre des décisions techniques et produit (ADR)

| ID | Sujet | Statut | Décision / prochain arbitrage |
|---|---|---|---|
| ADR-001 | Stack frontend/backend | **Ouvert** | Déterminer à partir du POC, du modèle de données et du budget |
| ADR-002 | Hébergement et base de données | **POC Supabase opérationnel ; décision production ouverte** | Projet `ai-interview-platform` déployé Paris pour S2-03 et profils S2-01 ; conformité, rétention, coûts et hébergement définitif à valider |
| ADR-003 | Avatar/voix/transcription | **À tester** | Comparaison de fournisseurs et métriques de latence, FR/EN, qualité et coût |
| ADR-004 | CI et environnements | **Partiel** | Validation JSON S2-03 ajoutée ; pipeline applicatif et environnements à concevoir selon stack |
| ADR-005 | Stratégie du référentiel questions | **Validé produit — 22/10/2026** | Socle universel + spécialisations métiers |
| ADR-006 | Génération IA des questions | **Validé produit — 22/10/2026** | Modèle C : propositions IA sous revue humaine avant publication |
| ADR-007 | Frontière S2-03/S2-04/S3 | **Validé produit — 22/10/2026** | S2-03 = référentiel ; S2-04 = conduite/sélection ; S3 = scoring, feedback et coaching |
| ADR-008 | Seuil de couverture pour score N/E | **Proposé, non validé** | Seuil de 60 % à tester et approuver au Sprint 3 |
| ADR-009 | Statut des corpus et validations | **Validé — 22/10/2026** | 120 questions en `draft`; 10 RH approuvées éditorialement, 10 techniques pré-auditées par IA, 100 générées sans revue humaine |
| ADR-010 | Gouvernance des branches GitHub | **Ouvert** | Dépôt public ; PR et revues recommandées, pas de règle bloquante présumée |
| ADR-011 | S2-01 — objectifs & persistance | **Validé produit** | Un objectif professionnel principal et plusieurs priorités de préparation ; préférences permanentes préremplies et modifiables dans une simulation sans écraser le profil ; pas d'import CV ni de fiche de poste à l'onboarding |
| ADR-012 | Stratégie E2E V1 | **Implémenté au niveau lab, non validé production** | Démo navigateur locale (avec IA optionnelle côté serveur) et Auth Supabase facultative ; 120 questions draft restent indisponibles au moteur réel |
| ADR-013 | Préparation par type d'entretien | **Décision produit appliquée au laboratoire** | Les objectifs RH sont spécifiques aux compétences RH ; les objectifs techniques dépendent du métier et de sa spécialité, sans modifier les préférences d'onboarding |
| ADR-014 | Publication provisoire de questions | **Décision de sécurité** | Les brouillons sont accessibles uniquement en laboratoire local pour tester l'IA ; pas de passage `draft → published` officiel sans revue humaine et grilles approuvées |

Pour toute nouvelle décision : contexte, options, risques, coût, responsable, date, statut et trace de validation. Éviter de convertir une proposition technique en décision sans approbation.
