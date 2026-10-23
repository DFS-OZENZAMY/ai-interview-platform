# UX-08 — Connexion premium Smokey / Supabase Auth (prototype)

**Implémenté le 23 octobre 2026** sur la branche UX/UI dans `web/`.

## Parcours et UI

Page `/login` : composition responsive dark navy, halo subtil et shader WebGL « smokey » réactif à la souris. Formulaire liquid glass, champs e-mail/mot de passe, affichage/masquage, création de compte et mot de passe oublié, boutons français à tonalité coach. Sur mobile, la colonne éditoriale disparaît au profit du formulaire accessible.

- **Connexion** : Supabase Auth `signInWithPassword` → `/dashboard`.
- **Inscription** : `signUp` avec e-mail de confirmation selon configuration → `/onboarding` si session immédiatement disponible.
- **Google** : `signInWithOAuth` → `/auth/callback`, requiert fournisseur configuré.
- **Mot de passe oublié** : `resetPasswordForEmail` → `/auth/callback?type=recovery` → `/auth/update-password`, pour modifier le mot de passe après validation de la session.
- **Pas de configuration Supabase côté frontend** : boutons authentifiants désactivés et avis « Démonstration UX » clair. Aucun faux login, mot de passe ni utilisateur stocké localement.

Le shader a été réécrit : pas de setState à chaque mouvement souris, une seule boucle requestAnimationFrame, annulation au démontage et en onglet caché, canvas redimensionné seulement si nécessaire, densité pixels limitée, fallback gradient CSS, mode reduced motion sans WebGL. Le composant React source partagé a inspiré l'effet, il n'a pas été collé tel quel.

## Configuration nécessaire pour valider les flux en réel

1. Renseigner dans `web/.env.local` `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (clé **publique** uniquement), à partir de `web/.env.example`. Ne jamais exposer le service-role.
2. Configurer l'URL du site et les redirect URLs de Supabase Auth pour `http://localhost:3000/auth/callback` (en prod, domaine HTTPS dédié), et le domaine Google OAuth si choisi.
3. Vérifier le réglage e-mail / confirmation et les fournisseurs autorisés dans Supabase Dashboard. Réviser les politiques anti-abus et rate limits avant ouverture.
4. Vérifier les parcours réels manuellement avec un compte **de test** ; ces parcours ne peuvent pas être validés sans configuration Supabase.

**Important :** l'Auth côté client ne protège pas encore les routes du frontend. Le dashboard est un prototype `sessionStorage` qui n'a pas encore la persistance par utilisateur ; l'aiguillage « nouvel inscrit → onboarding, utilisateur connu → dashboard » est donc **encore incomplet**, et doit venir d'un champ serveur `onboarding_completed` vérifié après authentification. Une session authentifiée n'est pas équivalente à un profil existant. Ne pas déployer publiquement avant implémentation de cette garde SSR et de la liaison Auth → profil RLS.

## Vérifications automatisées

`python3 web/tests/test_login_browser.py` : Chrome desktop 1440 et mobile 390, écran log in, bascule sign-up, récupération, contrôle de mot de passe, absence de débordement, pas d'erreurs JS.

`cd web && npx tsc --noEmit && npm run lint && npm run build` : compilation statique et types.

## À poursuivre

Lier Supabase Auth à `public.candidate_profiles` avec migrations et RLS validées, ajouter pages/account recovery vérifiées sur connexion réelle, protection serveur des routes et état de complétion. Réutiliser le même ton pour l'écran « Bon retour parmi nous, [prénom] » lors de reconnexions authentifiées.
