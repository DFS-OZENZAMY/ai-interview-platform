# Comptes de test Supabase Auth — préparation

Adresses demandées : `user@user.com` (user), `admin@admin.com` (admin), `coach@coach.com` (coach). **Les adresses ne deviennent pas des identifiants utilisables avant le provisionnement administratif.**

L'outil MCP Supabase connecté permet les migrations SQL mais **ne dispose pas d'une action Auth Admin createUser**. Ne pas insérer manuellement dans `auth.users` : cela contournerait le mécanisme Auth. Un script local utilise l'API officielle `auth.admin.createUser` ; l'admin secret ne doit jamais être enregistré dans le dépôt ni dans `NEXT_PUBLIC_`.

Après avoir obtenu une clé administrative uniquement depuis le tableau de bord du **bon projet** :
```bash
cd ~/ai-interview-platform/web
read -rs "SUPABASE_ADMIN_KEY?Clé administrative Supabase (saisie invisible) : "
echo
export SUPABASE_ADMIN_KEY
node scripts/provision_demo_accounts.mjs
unset SUPABASE_ADMIN_KEY
```

Les mots de passe aléatoires sont enregistrés en mode `0600` localement dans `~/ai-interview-platform/.demo-credentials/test-accounts.txt`. Le script refuse les doublons et ne modifie aucun compte existant ; un échec partiel nécessite une vérification manuelle avant réexécution. Ce script et cette procédure **n'ont pas été exécutés automatiquement**, car il manque la clé Auth Admin côté outil.

La table `public.app_user_roles` autorise uniquement la lecture de son propre rôle (RLS). Aucun accès `INSERT/UPDATE/DELETE` client. Par défaut, absence de ligne = candidat. Le script attribue les rôles directement via un client d'administration sécurisé. Les vues admin/coach sont des placeholders, priorité inchangée sur le parcours candidat.

Pour les déploiements publics : retirer les comptes de démo et leurs identifiants, activer MFA/limites de débit et revérifier les politiques de protection serveur.


## État observé au 23/10/2026
- Schéma et rôles Supabase migrés ; lecture rôles client seule, écriture réservée à l'administration.
- Clés **publiques** Supabase configurées sur le Mac dans `web/.env.local` (ignoré par git).
- `user@user.com`, `admin@admin.com`, `coach@coach.com` : **provisionnement encore à effectuer** avec accès Auth Admin. Ne pas prétendre que ces comptes existent avant exécution du script.
