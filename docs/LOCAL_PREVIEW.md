# Lancer AI Interview Platform sur localhost — aperçu S2-03/S2-04

## Pourquoi les tables Supabase paraissent vides

Les données sont dans le schéma PostgreSQL privé **`question_bank`**, pas dans `public`. Supabase Table Editor affiche généralement `public` par défaut. Sélectionnez `question_bank` dans le sélecteur de schéma, puis ouvrez les tables :

| Table | Lignes vérifiées le 22/10/2026 |
|---|---:|
| `question_bank.questions` | 120 |
| `question_bank.question_versions` | 120 |
| `question_bank.localizations` | 240 |
| `question_bank.categories` | 18 |
| `question_bank.rubrics` | 2 |
| `question_bank.interview_sessions` | 0 |
| `question_bank.interview_question_snapshots` | 0 |

Liens : [Table Editor](https://supabase.com/dashboard/project/aqybktqgoartjiqoqcfg/editor) et [SQL Editor](https://supabase.com/dashboard/project/aqybktqgoartjiqoqcfg/sql/new).

Les deux dernières tables sont vides **par conception** : les tests ont utilisé des transactions annulées et aucun candidat n'a encore réellement passé d'entretien.

### Vérification SQL

```sql
SELECT count(*) AS total_questions FROM question_bank.questions;
SELECT count(*) AS fr_en_prompts FROM question_bank.localizations;
SELECT count(*) AS drafts FROM question_bank.question_versions WHERE status='draft';
SELECT count(*) AS real_sessions FROM question_bank.interview_sessions;
```

Les rôles applicatifs `anon` et `authenticated` n'ont pas d'accès direct au schéma privé, et les 120 questions sont toutes en brouillon. C'est voulu : ne pas ouvrir le schéma aux navigateurs pour essayer de « faire apparaître les données ».

## Démarrage sur Mac (sans Docker, npm, ni clés Supabase)

Ouvrir Terminal et exécuter :

```bash
git clone https://github.com/Achrafsila/ai-interview-platform.git
cd ai-interview-platform
python3 dev/local-preview/server.py
```

Si le dépôt est déjà cloné sur le Mac :

```bash
cd /chemin/vers/ai-interview-platform
git pull origin main
python3 dev/local-preview/server.py
```

Un navigateur s'ouvre normalement automatiquement. Sinon ouvrir :

**http://127.0.0.1:8765**

Pour arrêter le serveur : `Ctrl+C`. Pour changer le port : `python3 dev/local-preview/server.py --port 8766`.

### Ce que vous pourrez tester

- Explorer les **120 questions** et changer entre français et anglais.
- Filtrer les questions RH et techniques par catégorie et niveau.
- Démarrer une simulation guidée de 3, 5 ou 8 questions.
- Voir des **relances préparées** et saisir ses propres réponses.
- Terminer avec un récapitulatif des questions et réponses.

Le navigateur utilise un service **HTTP local Python standard library** démarré sur `127.0.0.1`. Pas de services externes, pas de compte ni de clé, pas de dépendance à installer. Les réponses restent dans la mémoire du processus Python pendant la simulation et ne sont jamais sauvegardées en base.

### Tests automatisés localhost

```bash
python3 -m unittest discover -s tests -p 'test_local_preview.py' -v
```

Vous pouvez aussi exécuter tous les tests Python du projet :

```bash
python3 scripts/validate_question_bank.py
python3 -m unittest discover -s tests -v
```

## Distinction essentielle : prévisualisation ou vraie API Supabase

| Fonction | Aperçu localhost | Projet Supabase réel |
|---|---|---|
| Affichage des 120 brouillons | Oui, dans l'explorateur développeur | Données stockées dans schéma privé |
| Simulation de questions | Simulée et sans notation | Seulement à partir de questions approuvées/publiées |
| Authentification | Non, car outil local isolé | JWT obligatoire via Supabase Auth |
| Versioning/snapshots | Parcours simulé non persisté | Migrations 0001–0006 et snapshots immuables |
| Relances IA et scoring | Non implémentés | Pas encore implémentés |
| Données réelles candidat | Ne pas utiliser | Non autorisées pour la démo sans conformité |

**Important :** ce démonstrateur n'est pas une application candidate et n'appelle pas l'Edge Function de production. Il permet de visualiser et manipuler les brouillons sans tromper le système de publication. Il est volontairement lié à `127.0.0.1` et ne doit pas être exposé au réseau ou déployé sur un hébergeur.

### Tester la vraie API Supabase

Après création de comptes de test Supabase Auth et attribution sécurisée des rôles `interview_engine` côté serveur, exécuter [le script de recette HTTP](../scripts/smoke_question_bank_http.mjs). Les 120 questions n'étant pas approuvées, aucun test ne doit contourner les protections de publication.

Le projet ne contient actuellement **aucun utilisateur Supabase Auth**, et aucune question publiée. Les tests de vraie connexion peuvent vérifier des réponses 401/403 dès que des comptes de test existent ; une session positive requiert une question officiellement approuvée.

## Si localhost ne démarre pas

- **Port occupé :** utiliser `--port 8766`.
- **`python3: command not found` :** installer Python 3 depuis python.org ou via votre environnement de développement.
- **`FileNotFoundError` pour les JSON :** partir de la racine du dépôt complet ; le dossier `data/question-bank` doit exister.
- **Supabase apparaît vide :** changer de `public` vers `question_bank`; vérifier les comptes et projets ouverts dans le Dashboard.

