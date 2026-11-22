# Journal des mises à jour

## 2026-11-22
- Affichage ordinateur : nouveau fichier `css/desktop.css`, chargé seulement sur les écrans de 900 px ou plus (menu à gauche, contenu centré, fenêtres au centre). Le téléphone n'est pas modifié.
- Messages sur ordinateur : la liste des conversations est à gauche et la conversation ouverte à droite (privées et groupes). Sur téléphone, rien ne change. Fichiers modifiés : `js/01-core.js`, `04-messages.js`, `05-groupes.js`, `06-communaute-evenements.js`, `15-routeur-demarrage.js`, `css/desktop.css`, `index.html`.
- Accueil sur ordinateur : colonne de droite avec ton profil et tes points, les prochains événements et des étudiants à découvrir. Sur téléphone, rien ne change. Fichiers modifiés : `js/03-feed.js`, `css/desktop.css`, `index.html`.
- Profil sur ordinateur : grande couverture, carte de profil à côté de la photo, mosaïque de publications sur 4 colonnes. Sur téléphone, rien ne change. Fichiers modifiés : `css/desktop.css`, `index.html`.

## 2026-11-12 (v2)
- Code découpé : `index.html` allégé, `css/style.css`, un fichier JavaScript par partie du site.
- Sécurité : plus de script en ligne, CSP renforcée (`script-src 'self'`).
- Pseudo unique garanti par la base (`supabase/001`), message « Ce pseudo est déjà pris ».
- Messagerie : photos, vidéos, audio et documents envoyés en qualité d'origine, jusqu'à 50 Mo (`supabase/002`, `004`).
- Stockage `medias` : envoi limité au dossier de chaque utilisateur (`supabase/003`).
- Ajout du README, du CHANGELOG et du dossier `supabase/`.
- Audit de sécurité Supabase réalisé : aucune faille ouverte relevée (tables, vues, fonctions, buckets).
