# Journal des mises à jour

## 2026-11-22
- Affichage ordinateur : nouveau fichier `css/desktop.css`, chargé seulement sur les écrans de 900 px ou plus (menu à gauche, contenu centré, fenêtres au centre). Le téléphone n'est pas modifié.

## 2026-11-12 (v2)
- Code découpé : `index.html` allégé, `css/style.css`, un fichier JavaScript par partie du site.
- Sécurité : plus de script en ligne, CSP renforcée (`script-src 'self'`).
- Pseudo unique garanti par la base (`supabase/001`), message « Ce pseudo est déjà pris ».
- Messagerie : photos, vidéos, audio et documents envoyés en qualité d'origine, jusqu'à 50 Mo (`supabase/002`, `004`).
- Stockage `medias` : envoi limité au dossier de chaque utilisateur (`supabase/003`).
- Ajout du README, du CHANGELOG et du dossier `supabase/`.
- Audit de sécurité Supabase réalisé : aucune faille ouverte relevée (tables, vues, fonctions, buckets).
