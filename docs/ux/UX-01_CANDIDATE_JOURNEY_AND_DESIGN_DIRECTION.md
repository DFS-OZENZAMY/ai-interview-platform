# UX-01 — Parcours candidat V1 et direction UX/UI

**Statut : proposition à valider — 23 octobre 2026.** Généré après installation et exploitation de **UI/UX Pro Max v2.15.0**. Source machine : `design-system/ai-interview-platform/MASTER.md`.

## Intention produit

Expérience premium, sobre et rassurante, inspirée de la qualité d'exécution Apple/Vercel, sans copier leurs interfaces. Le candidat doit se sentir accompagné, pas évalué administrativement. Web responsive V1, mobile web dès la V1, apps iOS/Android ultérieures.

## Parcours cible

`Landing publique → Inscription/Connexion → Onboarding 4 questions → Espace personnel → Préparer un entretien RH/technique → Entretien écrit → Coaching personnalisé → Retour espace personnel`

### Écrans et microcopy

| Écran | Informations utiles et principal CTA |
|---|---|
| Landing | « Le bon entretien commence avant le jour J. » + « M'entraîner maintenant » ; 3 bénéfices, aperçu réel |
| Onboarding 1/4 | « Comment souhaitez-vous qu'on vous appelle ? » Prénom + Nom |
| Onboarding 2/4 | « Quelle est votre prochaine étape professionnelle ? » Premier emploi / Changer de poste / Évoluer |
| Onboarding 3/4 | « Sur quoi aimeriez-vous progresser ? » 5 priorités compréhensibles et expliquées, 1 à 3 proposées |
| Onboarding 4/4 | « Dans quelle langue souhaitez-vous vous entraîner ? » Français / English |
| Dashboard | « Prêt pour votre prochain entretien, [prénom] ? » + « Préparer mon entretien » |
| Préparation | « Quel entretien préparez-vous ? » RH / Technique ; métier si technique, jusqu'à 6 axes pertinents, 3 questions fixes |
| Entretien | « Question 1 sur 3 » ; zone de réponse, bouton « Continuer » ; relances naturelles cachant le jargon IA |
| Bilan | Points forts observables, conseil concret, prochaine action « Continuer à progresser » |

Pas de CV ni fiche de poste dans l'onboarding ; éviter métier cible facultatif en V1. L'adresse email reste un identifiant de connexion, pas un message central au dashboard. Pas de menu d'étapes internes « Onboarding / Simulation / Entretien / Récapitulatif » : ce sont des états du parcours, non des rubriques de navigation.

### Navigation

Landing (publique) : Comment ça marche / Se connecter / CTA.
Espace connecté : Accueil / Mes entretiens / Mon profil. Onboarding : progression 1/4, Retour et Continuer. Pendant l'entretien : mode concentré, navigation réduite, gestion explicite de l'abandon.

### Principes de préparation et coaching

L'objectif professionnel est stocké dans le profil ; les axes d'entraînement y restent des préférences par défaut. Les thèmes RH et techniques sont différenciés et propres à la simulation, **sans écraser le profil**. Trois questions principales par session, avec éventuelles relances. La V1 s'appuie sur l'écrit ; voix/avatar plus tard. L'IA fournit un coaching qualitatif et jamais un verdict de recrutement. La transparence et le consentement pour le traitement externe des réponses restent indispensables, mais dans un langage clair.

## Design direction V0 — à arbitrer, non encore approuvée

La skill propose initialement **Glassmorphism, bleu #2563EB, accent orange #EA580C, Plus Jakarta Sans**. Pour notre brief « éditorial, premium, calme », ces recommandations servent de base méthodologique, **pas de charte finale** : éviter les surfaces vitrées répétitives et les couleurs criardes. Recommandation alternative à comparer en mockups :

- Fond clair `#F8FAFC`, cartes `#FFFFFF`, texte `#172033`, fond hero `#0B1222`.
- Bleu d'action `#2947A3`, frontières `#DDE3EC`, texte secondaire `#526079`.
- Typographie Inter et fallback système ; pas de faux chiffres, avis ou certifications.
- Marges généreuses, largeur de formulaire modérée, CTA unique par écran.
- Animations légères 150–250 ms, réduit sous `prefers-reduced-motion`.

## Accessibilité / responsive

Tester 375, 768, 1024 et 1440px ; aucun scroll horizontal, contenu qui se réorganise et accepte le zoom. Tous les champs avec label, erreurs contextualisées, focus visible, parcours clavier. Contraste normal au moins 4,5:1 sur les paires de couleurs finales. Zones tactiles confortables (~44px sur mobile, en tenant compte des règles web et natives) et espace entre cibles.

## Recherches UI/UX Pro Max utilisées

- `--design-system` : système complet (pattern hero/features/CTA, palette, typo, effets et anti-patterns), sauvegardé dans MASTER.md.
- `--domain landing` : pattern `minimal-single-column`, une CTA dominante.
- `--domain ux` : onboarding retour facultatif, feedback de formulaire, labels accessibles.
- `--domain ux` : zones tactiles, espacements et clavier mobile.

## Évolutions techniques à prévoir (ne pas confondre avec terminé)

- Migration Supabase sécurisée pour ajouter prénom et nom au profil ; schéma actuel sans ces champs.
- Refonte frontend réel (le laboratoire localhost ne constitue pas une application de production).
- Session et progression persistantes, tests multi-comptes et revue de conformité.
- Maquettes desktop/mobile à construire et faire approuver avant de figer les tokens.

## Étapes ClickUp

`UX-01` : relire et valider cette cartographie ; `UX-02` : détailler le nouvel onboarding ; `UX-03` : polir les textes ; `UX-07` : wireframes desktop/mobile et prototype Figma ; `PRD-05` : valider charte visuelle. **Aucune de ces tâches n'est automatiquement marquée terminée par ce document.**


### Addendum UX V3 — contexte professionnel (23 octobre 2026)

L'inspiration externe a motivé une **étape supplémentaire ciblée** dans le parcours candidat : « Notre point de départ ». Elle recueille la situation actuelle et une tranche d'expérience facultative. Aucun autre champ de recherche d'emploi ne fait partie du produit. La structure cible est désormais : identité → point de départ → ambition → priorités → langue → récapitulatif. Les cinq segments de progression reprennent ces étapes, et une animation existante conserve la continuité visuelle. Les objectifs de préparation restent des préférences, distinctes des axes RH/techniques à choisir lors d'une simulation. Persistance Supabase et adaptation du moteur IA : à faire.


### Rectificatif produit — prénom et nom conservés (23 octobre 2026)

La remarque de l'utilisateur portait sur les incohérences entre les étapes, **pas** sur la suppression de « Faisons connaissance ». Le parcours conserve donc l'identité en premier écran, puis situation/expérience, objectif professionnel conditionnel, préparation et langue (5 étapes). L'objectif reste un choix de l'utilisateur, mais la liste des options est cohérente avec la situation et éventuellement l'expérience. Retour en arrière possible, données intactes, et invalidation de l'ancien objectif lorsqu'il n'est plus pertinent. Phrase « Pas de mauvaise réponse » retirée.
