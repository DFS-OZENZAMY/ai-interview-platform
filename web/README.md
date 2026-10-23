# Nouveau frontend — onboarding interactif V0

Le composant `src/components/ui/onboarding-stages.tsx` adapte le composant React / Framer Motion partagé par le porteur du projet (« onboarding-stages.tsx ») : structure en étapes, progression visuelle, animations avec respect de `prefers-reduced-motion`, styles Tailwind et icônes Lucide. Les listes d'exemple du composant original (logo, paiement, livraison) ont été remplacées par **les décisions produit S2-01**.

## Tester

```bash
cd web
npm install
npm run dev
```

- Landing provisoire : http://localhost:3000/
- Onboarding interactif : http://localhost:3000/onboarding

Aucun autre service ni compte n'est requis pour le prototype UX.

## Parcours du prototype

1. Prénom et nom : identification personnalisée, pas de CV.
2. Point de départ : situation professionnelle (en poste, recherche, indépendant, études/début de carrière) ; expérience professionnelle facultative.
3. Objectif professionnel : premier emploi / changer de poste / évoluer.
4. Préparation : 1 à 3 priorités parmi cinq, chacune avec explication.
5. Langue de préparation : français / anglais.
6. Écran de confirmation personnalisé avec récapitulatif éditable.

La progression est calculée sur les étapes réelles ; les choix ne sont pas considérés « terminés » par défaut. Le champ `onComplete(profile)` reçoit les données validées, typées et prêtes à être transmises ultérieurement à un service de profil authentifié.

## Limites délibérées

**Ce frontend est un prototype UX distinct du laboratoire Python Groq/Supabase** (port 8765). À ce stade, aucune donnée n'est enregistrée dans Supabase, aucune authentification n'est simulée, aucun entretien IA n'est connecté. Le texte de confirmation l'indique clairement. Le schéma actuel `public.candidate_profiles` ne contient pas `first_name` ni `last_name` : ajouter ces colonnes avec migration RLS testée sera une évolution backend avant d'ouvrir une inscription réelle.

L'interface d'accueil est provisoire ; la marque, le nom définitif et la charte font encore l'objet du chantier Product & Branding. La version FR est un point de départ, l'UI anglaise complète reste à réaliser. La contrainte des trois priorités est une simplification proposée pour l'UX et reste à valider.

## Dépendances et qualité

Next.js 16, React 19, TypeScript, Tailwind CSS 4, shadcn et structure `src/components/ui`, Framer Motion, Lucide. Vérification : `npx tsc --noEmit && npm run lint && npm run build`.

L'installation initiale de packages a affiché **5 vulnérabilités signalées par npm audit**. Elles sont à trier et corriger avant toute mise en production ; ne pas exécuter `npm audit fix --force` sans revue des changements majeurs.

Le composant de référence fourni par l'utilisateur est adapté et non copié à l'identique, car son contenu métier concernait un onboarding e-commerce. La confidentialité, la logique de profil et la personnalisation candidat prennent le pas sur cette démonstration.

## Onboarding V2 — liquid glass / transitions immersives

Après les retours utilisateur, le parcours inclut un fond gradient animé (désactivé sous prefers-reduced-motion), des halos ambiants, un panneau translucide, des transitions directionnelles, un wording plus chaleureux et un récapitulatif en cartes éditables.

**Modification directe :** cliquer dans l'écran de confirmation sur « Votre cap », « Votre langue », « Vos axes de progrès », « Modifier mon identité » ou « Modifier mes priorités » revient à l'étape choisie avec toutes les données préremplies. « Enregistrer et revenir » ou « Retour » ramène ensuite au récapitulatif sans refaire les quatre étapes. Pendant l'onboarding, « Retour » revient normalement à l'étape précédente.

Le test Chromium reproductible est `python3 web/tests/test_onboarding_v2_browser.py` (requiert Playwright Python et Google Chrome installé). Il valide la navigation, les modifications ciblées et l'absence de scroll horizontal à 1440/390 px. Ce test n'authentifie pas d'utilisateur et n'écrit rien dans Supabase.

## Dashboard candidat V1

Après l'onboarding, « Découvrir mon espace » ouvre `/dashboard` avec le prénom, l'objectif commun, les préférences de préparation et un état vide honnête pour l'historique. Le profil est transmis temporairement dans la mémoire `sessionStorage` du même onglet ; il n'y a pas encore d'authentification ou de persistance Supabase. Le CTA ouvre `/preparation`, un premier écran RH/technique. Le laboratoire Groq demeure séparé sur `127.0.0.1:8765/e2e` et sa sélection doit y être reconfirmée.

Document détaillé : `docs/ux/UX-04_DASHBOARD_CANDIDATE_V1.md`. Les tests Chromium du parcours sont étendus au dashboard, à la préparation et au retour au profil en desktop et mobile.


## Onboarding V3 — point de départ contextualisé

Suite à une revue de parcours inspirants (dont aiApply), **une seule étape de contexte** a été ajoutée : situation professionnelle actuelle, obligatoire pour adapter la simulation, et tranche d'expérience, facultative et effaçable. Le parcours compte maintenant 5 étapes de progression segmentées, sans CV, salaire, localisation, préférences de contrat ni promesse statistique de placement. Le ton de coaching et les transitions restent inchangés. Le récapitulatif et le dashboard affichent ces réponses. À ce stade, ces informations sont **uniquement transitoires dans la mémoire du navigateur** pour tester l'UX : elles ne sont pas enregistrées dans Supabase et n'influencent pas encore le moteur Groq. Le futur backend devra ajouter des colonnes validées, RLS et tests de non-régression.


## Parcours cohérent V3.1 — retour utilisateur

On maintient **« Faisons connaissance »** comme premier écran, avec prénom et nom, puis 4 autres étapes : point de départ, objectif adapté, priorités, langue. La phrase « Pas de mauvaise réponse » est supprimée. L'objectif proposé dépend de la situation professionnelle : étudiant/débutant → premier emploi ou stage ; en poste → changement ou évolution ; en recherche → premier emploi si débutant, sinon retour à l'emploi ou changement ; indépendant → transition vers un poste ou présentation de son activité. Un retour en arrière et un changement de situation remettent à jour les options sans garder d'objectif contradictoire. Les scénarios complets sont testés sur desktop/mobile. **Il ne s'agit pas encore d'une personnalisation du moteur IA ni d'une persistance Supabase.**

## Bienvenue V4 (Motion) et retour des utilisateurs

Après « C'est parti ! », le formulaire est remplacé dans la même page par une scène animée : salutation par prénom, message mot-par-mot, résumé contextuel de notre objectif, des axes de progrès et de la langue, puis un unique bouton « Découvrir notre espace » qui ouvre le dashboard. « Précédent » permet de corriger les réponses. L'animation est passable et respecte `prefers-reduced-motion`.

`motion/react` est notre bibliothèque d'animation unique. Scroll Craft est installé localement pour inspirer la profondeur et la narration mais n'est pas exécuté comme moteur de scrolling dans l'onboarding. Voir `docs/ux/UX-06_WELCOME_MOTION_AND_RETURNING_USER.md` pour l'installation des outils et la règle future de reconnexion, **non implémentée sans Supabase Auth**.

Tests : `python3 web/tests/test_welcome_motion_browser.py` en plus du test de parcours complet.

## Welcome V5 plein écran

Sur l'écran final, la scène cinématique occupe maintenant tout le viewport avec fond dark navy opaque (pas de frame ni transparence claire), animations plus affirmées et 3 cartes de récapitulatif plus contrastées. Le CTA « Découvrir notre espace » n'est rendu qu'à la fin de l'animation ; « Passer l'animation » n'existe plus. Respect de `prefers-reduced-motion` (affichage immédiat).

## Welcome V6 — continuité visuelle & CTA robuste

Le welcome reste plein écran et animé mais reprend l'univers bleu glacé/lavande de l'onboarding. Titre encre sombre, texte lisible, cartes glass claires et CTA final bleu intense à libellé blanc. Pour protéger le contraste en conditions réelles, les couleurs essentielles du CTA et du background sont également mises dans le style du composant. Validation : `python3 web/tests/test_welcome_motion_browser.py`.

## Auth UX — login Smokey WebGL

Page `/login` : expérience liquid glass avec fond WebGL animé et fallback gradient, formulaires connexion/inscription/réinitialisation et Google via `@supabase/supabase-js`. Les boutons sont désactivés quand Supabase n'est pas configuré (aucune fausse connexion). Voir `web/.env.example` et `docs/ux/UX-08_AUTH_LOGIN_SMOKEY_V1.md` pour le setup, les limites et les étapes de sécurisation des routes. Test Chrome : `python3 web/tests/test_login_browser.py`.


## Auth réelle / persistance candidat (S2)

Le frontend utilise maintenant `@supabase/ssr` (cookies partagés navigateur/serveur), `src/proxy.ts` pour les routes protégées, et `public.candidate_profiles` avec RLS. Les formulaires d'onboarding sauvegardent désormais prénom/nom, situation, expérience, objectif professionnel, priorités et langue dans Supabase ; l'accès au dashboard lit les valeurs depuis la base, et le bouton « Se déconnecter » met fin à la session. Connexion par email/mot de passe ou OAuth : compte utilisateur existant → dashboard si profil complet, sinon onboarding. Les rôles admin et coach sont stockés dans `app_user_roles`, table RLS en lecture seule pour l'utilisateur courant ; interfaces réservées laissées en placeholder.

La création de comptes Auth Demo doit être effectuée via la clé administrative **hors frontend** : `docs/auth/TEST_ACCOUNTS.md` et `web/scripts/provision_demo_accounts.mjs`. Les accès ne sont pas encore générés sans clé administrative. Les tests navigateur sans Auth de l'ancien prototype ne sont plus représentatifs des pages maintenant protégées ; utiliser `web/tests/test_auth_live_routes.py` et `web/tests/test_login_browser.py` pour l'accès anonyme et les formulaires.
