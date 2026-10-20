# Revue de sécurité du parcours d'authentification

- Date : 2026-10-20
- Périmètre : inscription, connexion, déconnexion, sessions, accès à l'API et aux pages du jeu.
- Références : OWASP Top 10, OWASP ASVS.

| N° | Exigence | Vérification | Constat | Statut |
| --- | --- | --- | --- | --- |
| S1 | Les mots de passe ne sont conservés que sous forme d'empreinte, par une fonction dédiée | Test « ne conserve qu'une empreinte du mot de passe » ; documentation de Better Auth | Le test trouve une valeur en base, différente du mot de passe fourni ; Better Auth effectue le hachage avant la création du compte. | Conforme |
| S2 | Les mots de passe comportent au moins 8 caractères | Test « refuse un mot de passe trop court » | Le test vérifie qu'un mot de passe de 5 caractères est rejeté avec le statut 400 ; `minPasswordLength` vaut 8. | Conforme |
| S3 | Les tentatives répétées d'inscription et de connexion sont limitées | Sous-partie 2.3 ; configuration de `better-auth.ts` | Limites configurées à 40 inscriptions et 60 connexions par fenêtre de 60 secondes. `AUTH_RATE_LIMIT=off` les désactive hors Vercel ; cette possibilité n'est pas restreinte au développement dans le code. | Non conforme |
| S4 | Le cookie de session est inaccessible au JavaScript de la page | Test sur l'attribut `HttpOnly` | Le test vérifie la présence de `HttpOnly` sur le cookie de session. | Conforme |
| S5 | Le cookie de session n'est pas envoyé par les requêtes émises depuis un autre site | Test sur l'attribut `SameSite` | Le test observe `SameSite=Lax`. Cette valeur limite l'envoi intersite, mais autorise le cookie lors de certaines navigations de premier niveau ; l'exigence absolue n'est donc pas satisfaite. | Non conforme |
| S6 | Le cookie de session ne circule que sur des connexions chiffrées | Inspection du cookie dans le navigateur ; comportement en local et en production | En production, le cookie se nomme `__Secure-better-auth.session_token` et porte l'attribut `Secure` : le navigateur ne le transmet que sur HTTPS. En local, sur `http://localhost`, l'attribut est absent, ce qui est attendu pour cet environnement de développement. | Conforme |
| S7 | Le secret de signature n'est pas versionné, et son absence en production empêche le démarrage | `git grep BETTER_AUTH_SECRET` ; fonction `resolveSecret` | `git grep` ne trouve le nom que dans `.env.example` et le code ; `.env.local` n'est pas suivi par Git. En revanche, l'absence du secret ne bloque que sur Vercel en production : ailleurs, le secret fixe de développement est utilisé. | Non conforme |
| S8 | La connexion ne révèle pas si une adresse est inscrite | Test « répond de la même manière que l'adresse existe ou non » | Pour un mauvais mot de passe et une adresse inconnue, le test compare les statuts et les corps JSON, qui sont identiques. Le temps de réponse n'est pas mesuré. | Conforme |
| S9 | L'inscription ne révèle pas si une adresse est inscrite | Création d'un compte avec une adresse déjà utilisée | Avec la configuration actuelle, Better Auth renvoie une erreur `422 USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL` si l'adresse existe ; aucun mode de réponse générique n'est configuré. | Non conforme |
| S10 | Toute route de l'API réservée aux joueurs refuse une requête anonyme | Tests « Contrôle d'accès à l'API du Village » ; racine de composition | Les tests vérifient qu'une lecture et une commande anonymes sur le Village renvoient 401 ; le middleware est monté sur `/realm/*`. La route de santé reste publique. | Conforme |
| S11 | Un joueur ne peut accéder qu'à ses propres données | Test « isole les villages des joueurs » ; origine de `userId` dans les routes | Le test observe des villages distincts pour Alice et Bob ; les routes transmettent au service le `userId` établi par le middleware d'authentification. | Conforme |
| S12 | Les pages du jeu sont protégées sur le serveur, avant tout rendu | Mise en page `app/(jeu)/layout.tsx` ; accès à `/village` sans session | La mise en page, dynamique, vérifie la session côté serveur avant de rendre ses enfants et redirige vers `/login` si aucun utilisateur n'est trouvé. | Conforme |
| S13 | Les erreurs imprévues ne révèlent aucun détail technique au client | Gestionnaire `onError` de la racine de composition | Le gestionnaire journalise l'erreur côté serveur et renvoie au client uniquement `INTERNAL` et « Erreur interne ». | Conforme |
| S14 | La déconnexion invalide la session sur le serveur | Réutilisation d'un cookie après déconnexion | Better Auth supprime la session en base et le cookie ; toutefois, l'échec de suppression est intercepté et n'empêche pas une réponse de succès. Aucun test de réutilisation du cookie après déconnexion n'est présent. | Non conforme |
| S15 | Une requête d'authentification accompagnée d'un cookie et émise depuis une autre origine est refusée | Appel de la déconnexion avec un en-tête `origin` étranger | Le middleware CSRF de Better Auth valide l'origine des requêtes mutantes portant un cookie par rapport aux origines de confiance ; l'origine de base est déterminée par `BETTER_AUTH_URL` ou son URL de repli. | Conforme |
| S16 | Un flux temps réel n'est accessible qu'aux joueurs connectés, et seulement pour les canaux auxquels ils ont droit | Tests « réserve le temps réel aux joueurs connectés (401) », « refuse l'écoute du village d'un autre joueur (403) » et « refuse un canal qu'aucune règle ne couvre (403) » ; principe de l'accès fermé par défaut dans `channel-policy.ts` | Un visiteur anonyme reçoit une erreur 401, un joueur qui tente d'écouter le village d'un autre joueur une erreur 403. Un canal sans règle est refusé : l'oubli d'une règle par un module futur rend ses canaux inaccessibles, et non publics. | Conforme |

## Synthèse

Sur les 16 exigences examinées :

- 11 sont conformes : S1, S2, S4, S6, S8, S10, S11, S12, S13, S15 et S16.
- 5 sont non conformes : S3, S5, S7, S9 et S14.
- Aucun risque n'a été formellement accepté.**

Les mécanismes essentiels d'authentification sont présents : hachage des mots de passe, gestion des sessions, protection des routes et des pages, isolation des données des joueurs et contrôle d'accès au temps réel.

La limitation des tentatives est désormais partagée entre les instances grâce à la table `identity.rate_limit` (TD11), ce qui rembourse la dette DT-004. Certaines limites de configuration et de comportement restent néanmoins à traiter.

### Actions correctives à suivre

| Exigence | Action corrective |
| --- | --- |
| S3 | Restreindre la désactivation de la limitation des tentatives aux environnements de développement ou de test, y compris hors Vercel. |
| S5 | Définir et vérifier une politique de cookie répondant à l'exigence de protection intersite, tout en conservant les protections CSRF. |
| S7 | Exiger explicitement un secret de signature et une configuration HTTPS pour tout environnement de production, indépendamment de l'hébergeur. |
| S9 | Mettre en place une réponse générique lors d'une tentative d'inscription avec une adresse déjà utilisée, afin de limiter la divulgation de l'existence des comptes. |
| S14 | Faire échouer la déconnexion lorsque l'invalidation de la session échoue et ajouter un test vérifiant qu'un cookie réutilisé après déconnexion ne permet plus d'accéder au compte. |

Ces cinq actions restent ouvertes. Elles doivent être consignées dans le registre de la dette technique avec une échéance de traitement, puis vérifiées avant de modifier les statuts de la revue.

La conformité de chaque exigence devra être réévaluée après application et test de son correctif.