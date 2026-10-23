# E2E — Parcours d'un nouvel utilisateur (S2-01 → S2-03 → S2-04)

**Environnement :** projet `ai-interview-platform` — Supabase Paris `aqybktqgoartjiqoqcfg`.  
**Version du scénario :** 22 octobre 2026.  
**Point d'entrée :** `http://127.0.0.1:8765/e2e`.

## Objectif du test

Suivre une personne découvrant AI Interview Platform :

1. Accueil et choix du type de test.
2. Création d'un compte ou connexion.
3. Onboarding : **un objectif professionnel** (premier emploi / changement / évolution).
4. Choix de **plusieurs objectifs de préparation** (confiance, structure, communication, connaissances métier, stress).
5. Persistance et consultation du profil.
6. Configuration de simulation avec objectifs préremplis mais **modifiables pour cette simulation seulement** ; offre facultative ajoutée ici, jamais dans l'onboarding.
7. Simulation guidée, réponses, récapitulatif, puis retour au profil pour vérifier l'absence de modification des préférences enregistrées.

Ce parcours est conforme aux décisions S2-01 : **ni import CV, ni offre, ni diagnostic initial dans l'onboarding V1**.

## Démarrer en local (Mac)

Dans Terminal à la racine du dépôt :

```bash
git pull origin main
python3 dev/local-preview/server.py
```

Ouvrir <http://127.0.0.1:8765/e2e>.

Le bouton **« Tester le parcours complet »** lance le scénario sans création de compte réel et sans besoin de clé Supabase. Cette démo utilise les questions JSON de développement (toutes non publiées) et un état temporaire en mémoire/sessionStorage. Elle **n'écrit rien dans Supabase** et ne produit aucun scoring automatique. Une option séparée de relance IA locale est désormais disponible si le serveur est lancé avec `OPENAI_API_KEY` ; voir [le guide IA](S2-04_AI_LOCAL_SIMULATION.md).

### Activer la vraie inscription Supabase

Supabase Auth et les profils RLS sont déployés. Pour activer le bouton « Supabase Auth » dans la même interface, renseigner **uniquement** une clé publique Supabase (`sb_publishable_...`) dans un Terminal :

```bash
export SUPABASE_URL="https://aqybktqgoartjiqoqcfg.supabase.co"
export SUPABASE_PUBLISHABLE_KEY="COLLER_LA_CLE_PUBLIQUE_DE_SUPABASE"
python3 dev/local-preview/server.py
```

La clé peut être récupérée via [Supabase Dashboard → API Keys](https://supabase.com/dashboard/project/aqybktqgoartjiqoqcfg/settings/api-keys). **Ne jamais utiliser une clé `service_role`, `sb_secret_`, un mot de passe PostgreSQL ou des identifiants administrateur côté navigateur.** Ne commitez pas les variables d'environnement dans GitHub.

En mode Supabase réel, on peut tester inscription, connexion, confirmation e-mail si demandée par Supabase et sauvegarde réelle du profil. Les politiques RLS restreignent les opérations à `auth.uid() = user_id`. L'interface ne collecte ni CV ni données de santé.

### Pourquoi l'entretien ne démarre pas encore en mode Supabase réel

Le catalogue S2-03 contient **120 questions en `draft`, aucune approuvée/publiée**. Le service S2-04 refuse donc correctement de distribuer ces brouillons. En mode réel, le bouton « Démarrer mon entretien » affiche ce blocage au lieu de forcer une publication.

En mode **démo** seulement, l'application peut parcourir des brouillons via le serveur localhost sans authentification ni connexion à Supabase. Une variante IA fournit des relances générées par modèle à partir des réponses, si une clé API est configurée. Les objectifs affichés deviennent des **sujets RH** ou des **sujets techniques de spécialité** selon le type choisi. Ne pas assimiler cet aperçu à une session d'entretien IA réelle.

## Matrice de preuves

| Parcours ou composant | Type de test | Résultat |
|---|---|---|
| Inscription d'un nouveau candidat, onboarding, profil, configuration, 3 questions, récapitulatif, retour au profil | **Navigateur Chromium**, backend local de démonstration | Réussi en CI |
| Objectifs spécifiques d'une simulation sans écraser le profil permanent | **Navigateur Chromium**, session locale | Réussi en CI |
| Parcours Supabase Auth/REST avec identité simulée, contrôle des requêtes de profil, reconnexion et persistance | **Navigateur Chromium avec endpoints Supabase interceptés/mockés** | Réussi en CI ; pas une preuve d'inscription réelle |
| Sauvegarde Supabase de préférences et politiques RLS propriétaires | DDL appliqué sur vrai projet Supabase + inspection des privilèges/politiques | Déployé et inspecté ; test positif avec vrai JWT pas encore exécuté |
| Raccordement questions publiées / sessions versionnées | Tests PostgreSQL transactionnels sur Supabase, tests Node/Deno | Réussi techniquement |
| Inscription réelle avec e-mail utilisateur confirmé puis API HTTP de bout en bout | Test manuel depuis localhost en mode réel | **À réaliser avec un compte de test**, aucun compte n'a été créé par ChatGPT |
| Première simulation **IA réelle** avec scoring et relances adaptatives | Développement produit et questions approuvées | **Non disponible** |

## Vérifications automatisées

```bash
# Les tests du navigateur Chromium sont automatisés dans GitHub Actions.
# Pour les exécuter localement :
python3 -m pip install playwright==1.56.0
python3 -m playwright install chromium
python3 -m unittest discover -s tests/e2e -p 'test_new_user_browser.py' -v

# Les tests existants :
python3 -m unittest discover -s tests -v
```

La CI lance aussi les tests du catalogue, de l'Edge Function et des migrations PostgreSQL.

## Schéma et sécurité

La migration `db/postgres/migrations/0007_candidate_onboarding_profiles.sql` crée `public.candidate_profiles`. Pourquoi `public` ? Il s'agit du seul contenu de profil destiné au candidat, accessible au travers de Supabase REST **avec RLS propriétaire**. Le schéma `question_bank` et tous les attendus techniques restent privés.

- `anon` : pas de droits sur `candidate_profiles`.
- `authenticated` : SELECT/INSERT/UPDATE sur **son propre `user_id`** uniquement, via trois politiques RLS.
- Aucune permission DELETE directe.
- Les préférences de préparation sont validées par des valeurs fermées ; l'objectif professionnel est indépendant.
- Aucun champ CV, offre ou historique de réponses dans `candidate_profiles`.

Les questions restent dans `question_bank` (schéma privé), et non dans `public`.

## Résultat et suite

Ce test valide le **parcours utilisateur V1 et l'onboarding** en navigateur, avec la connectivité Supabase prévue pour de véritables comptes. Il ne remplace pas la recette d'une simulation conversationnelle IA, qui nécessitera la publication éditoriale d'un lot de questions et le moteur de dialogue S2-04/S3.

La bonne prochaine validation manuelle : créer un compte de test depuis localhost, confirmer l'e-mail si nécessaire, terminer l'onboarding, se reconnecter, vérifier ses données dans `public.candidate_profiles` et constater le refus contrôlé d'une simulation tant qu'il n'existe pas de question publiée.
