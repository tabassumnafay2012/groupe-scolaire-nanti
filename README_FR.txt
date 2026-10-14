# Groupe Scolaire Nanti — site électoral

## Important
Ce dossier est un projet prêt à configurer et publier, mais il n'est pas encore en ligne. Il faut connecter un projet Supabase et un site Netlify.
Le mot de passe `GSNADMIN` doit être ajouté comme variable secrète dans Netlify, pas dans le HTML.

## Étapes
1. Crée un compte Supabase et un projet sur https://supabase.com.
2. Dans Supabase, ouvre SQL Editor, crée une requête, colle le contenu de `supabase_schema.sql`, puis clique Run.
3. Dans Supabase > Project Settings > API, copie :
   - Project URL
   - `service_role` secret key (garde-la privée, ne la partage jamais).
4. Crée un compte Netlify sur https://www.netlify.com.
5. Publie ce dossier sur Netlify (tu peux utiliser l'import d'un dépôt GitHub, ou le déploiement manuel si les fonctions sont prises en charge par ton mode de déploiement).
   Le dossier de publication est la racine du projet et le fichier d'entrée est `index.html`.
6. Dans Netlify > Site configuration > Environment variables, ajoute :
   - `SUPABASE_URL` = Project URL de Supabase
   - `SUPABASE_SERVICE_ROLE_KEY` = clé `service_role` de Supabase
   - `GSN_ADMIN_PASSWORD` = `GSNADMIN`
   - `GSN_TOKEN_SECRET` = une longue valeur aléatoire différente, à garder secrète
7. Redéploie le site après avoir ajouté les variables.
8. Ouvre l'adresse Netlify. Le panneau admin permet d'ajouter les candidats; les visiteurs peuvent voter et voir les résultats.

## Limite importante sur le vote
La version enregistre les votes dans la base partagée entre les appareils, mais elle ne peut pas garantir qu'un élève ne vote qu'une seule fois : elle bloque les votes répétés dans le même navigateur seulement. Pour une vraie élection officielle, il faut un contrôle d'identité (par exemple un code unique remis à chaque élève) et des règles de vote côté serveur. Ne l'utilise pas comme scrutin officiel sans ajouter ce contrôle.

## Photos
Les photos de galerie sont enregistrées comme données image dans la base. Utilise des images petites (moins de 900 Ko) pour ne pas remplir la base trop vite. Le lien de photo peut aussi être utilisé.
