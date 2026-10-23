# AI Interview Platform — Voix de marque et ton de coaching V1

**Statut : règle éditoriale de travail, 23 octobre 2026.** Décision issue de la revue UX de l'onboarding : notre rôle est d'aider, encourager et motiver, jamais d'être un simple formulaire ou un évaluateur distant.

## Promesse relationnelle

**Votre ambition devient notre objectif commun.** Le candidat reste maître de son parcours. Notre application lui apporte un espace pour s'entraîner, recevoir des conseils utiles et progresser sans pression.

Privilégier **« on / nous »** pour exprimer l'accompagnement et **« vous »** pour préserver l'autonomie personnelle. Éviter le « nous » artificiel dans des contextes qui appartiennent au candidat, comme son nom, ses données, ses choix personnels. Ce principe est plus important qu'un remplacement mécanique de chaque « votre » par « notre ».

## Voix éditoriale

- **Chaleureuse sans familiarité excessive.** Des tournures orales simples et naturelles ; pas de slogans publicitaires permanents.
- **Encourageante sans promesse infondée.** Nous pouvons aider à préparer un entretien, pas garantir une embauche ou une promotion.
- **Complice et professionnelle.** Humour léger possible sur un écran de progression, jamais quand le candidat est stressé, bloqué ou reçoit un retour difficile.
- **Claire et active.** Boutons brefs, question directe, confirmation explicite.
- **Humaine et précise.** Un conseil concret vaut mieux qu'un compliment vague. Ne pas inventer d'évaluation de personnalité.

## Microcopy de référence

| Emplacement | À éviter | Wording recommandé |
|---|---|---|
| En-tête du récapitulatif | VOTRE CAP | **NOTRE OBJECTIF** |
| Récapitulatif des compétences | VOS AXES DE PROGRÈS | **CE QU'ON VA TRAVAILLER** |
| Langue de travail | VOTRE LANGUE | **ON S'ENTRAÎNE EN** |
| Introduction | Un entraînement qui vous ressemble | Votre ambition, on la prépare ensemble |
| Projet professionnel | À vous de tracer la suite | Dites-nous où vous voulez aller. On prépare la suite ensemble |
| Préparation | Quel est votre prochain déclic ? | Qu'est-ce qu'on peut améliorer ensemble ? |
| Confirmation | Votre espace est prêt | Notre point de départ est prêt |
| Conclusion | Voici votre point de départ | Votre objectif est clair. Voici notre plan pour commencer |
| CTA | Terminer mon profil | C'est parti ! |
| Coaching — point fort | Excellent, réponse parfaite ! | Votre exemple est concret : on peut s'appuyer dessus |
| Coaching — progression | Réponse insuffisante | On peut rendre cette réponse plus convaincante avec un exemple précis |
| Erreur IA | Fournisseur HTTP 401 | On n'a pas pu poursuivre cet entretien. Réessayons ; vos réponses déjà saisies doivent être conservées quand la persistance sera disponible |

**Ne pas masquer les erreurs importantes.** Le message principal peut être accessible ; un détail technique est disponible aux outils de diagnostic/support, pas en première ligne pour le candidat.

## Cohérence sur tout le parcours

- **Landing** : « Votre prochain entretien, on le prépare ensemble ». CTA « Commençons ensemble ».
- **Onboarding** : « Notre objectif », « Ce qu'on va travailler ensemble ». L'utilisateur choisit et garde la possibilité de modifier.
- **Dashboard futur** : « Bonjour [prénom]. On prépare la prochaine étape ? » ; éviter les statistiques inventées.
- **Préparation RH/technique** : « Sur quoi on s'entraîne aujourd'hui ? » ; les objectifs de simulation restent ajustables et n'écrasent pas le profil.
- **Entretien** : « Prenez votre temps. Quand vous êtes prêt, on continue. » ; bouton « Continuer ».
- **Feedback IA** : « Ce qui fonctionne déjà », « Ce qu'on va renforcer », « Notre prochaine séance ».
- **Abandon/reprise** : « Vous pourrez revenir quand vous voulez », seulement si la sauvegarde des sessions est réellement disponible.

## Comment utiliser SlopMonster

Le dépôt https://github.com/ItsssssJack/SlopMonster est installé sur le Mac à `~/.claude/skills/slopmonster` (licence MIT). Le CLI `tools/deslop.py` vérifie des constructions artificielles en **anglais** et ne nécessite aucune API. Il est pertinent pour la future version EN et les textes marketing, mais ne juge pas la qualité du français.

Exemple :

```bash
python3 ~/.claude/skills/slopmonster/tools/deslop.py --text \
  "We'll work together to prepare for your next interview. You choose the goal; we'll help you practice."
```

Le score automatique ne valide pas à lui seul le ton. Pour le français, s'appuyer sur les principes ci-dessus et une revue éditoriale manuelle avec contexte utilisateur. Le « second passage par un autre modèle » de SlopMonster n'a pas été exécuté : le modèle rival et sa connexion ne sont pas configurés/confirmés pour ce travail.

## Critères d'acceptation UX-03

1. Chaque écran propose une action compréhensible et bienveillante.
2. L'application s'approprie le travail **avec** le candidat, sans parler à sa place.
3. Le coaching rappelle les progrès observables et donne un conseil concret, sans jugement définitif.
4. Les messages d'erreur encouragent une reprise réaliste, jamais une fausse garantie.
5. Relecture des variantes FR et EN sur desktop/mobile avant validation du branding.
