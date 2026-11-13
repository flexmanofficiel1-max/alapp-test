# ALAPP (version de test)

Réseau social étudiant. Application web (PWA) en HTML, CSS et JavaScript, avec Supabase pour la base de données, la connexion et le stockage des fichiers.

## Structure du dépôt

```
index.html            page d'entrée (structure + chargement des fichiers)
sw.js                 service worker (PWA)
icon-192.png          icône
css/style.css         styles
js/                   un fichier par partie du site, chargés dans cet ordre :
  00-service-worker   enregistrement du service worker
  01-core             configuration Supabase, état, utilitaires, appel API
  02-api              connexion, inscription, profil, rafraîchissement de session
  03-feed             fil d'actualité, publications
  04-messages         messagerie privée (texte, photos, vidéos, audio, documents)
  05-groupes          groupes de discussion
  06-communaute-evenements   communauté, événements, navigation
  07-clubs            clubs
  08-points-brain     points, jeux Alapp Brain
  09-profil-mur       profil, mur, badges, recherche
  10-statuts          statuts de 24 h
  11-notifs-reglages-legal   notifications, réglages, signalements, mentions légales
  12-admin            administration
  13-verification-compte     vérification email, mot de passe oublié
  14-push             notifications push
  15-routeur-demarrage       affichage, navigation, démarrage
supabase/             scripts SQL (à lancer dans l'ordre des numéros)
CHANGELOG.md          journal des mises à jour
```

Les fichiers JS sont de simples scripts classiques : ils partagent les mêmes variables et s'exécutent dans l'ordre du tableau ci-dessus. Ne pas changer cet ordre dans `index.html`.

## Branches
- `main` : version stable, déjà testée
- `dev` : développement en cours

On modifie sur `dev`, on teste, puis on fusionne vers `main` (Pull Request).

## Base de données (Supabase)
Les scripts de `supabase/` sont numérotés : `001`, `002`… À lancer dans le SQL Editor, d'abord sur le projet de test, puis sur le vrai projet.
`audit_securite.sql` ne modifie rien : il sert à vérifier la sécurité.

## Sécurité
- La clé Supabase « publishable » (anon) est publique par conception et peut rester dans le code.
- Ne jamais mettre de clé `service_role` ni de secret dans le code.
- RLS est activé sur toutes les tables. Les actions sensibles passent par des fonctions SQL réservées aux utilisateurs connectés.
- La politique de sécurité du navigateur (CSP) n'autorise aucun script en ligne : tout le JavaScript est dans `js/`.

## Fichiers en messagerie
Photos, vidéos, audio et documents (PDF, Word, Excel, PowerPoint, texte, zip) sont envoyés en qualité d'origine, sans compression, jusqu'à 50 Mo par fichier (limite de l'offre gratuite de Supabase).

## Mettre à jour le site
1. Modifier sur `dev`, tester.
2. Augmenter le numéro `?v=` des fichiers dans `index.html` (force les téléphones à recharger).
3. Noter le changement dans `CHANGELOG.md`.
4. Fusionner `dev` vers `main`.
