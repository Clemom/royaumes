# Revue de conformité au RGPD

- Date : 2026-10-20
- Périmètre : données personnelles de l'ensemble du jeu, export et effacement, durées de conservation, journaux techniques.
- Références : RGPD, articles 5, 15, 17, 20, 25 et 30 ; registre des traitements ; ADR 0008.

| N° | Exigence | Vérification | Constat | Statut |
| --- | --- | --- | --- | --- |
| R1 | Chaque emplacement de données personnelles figure au registre des traitements | Comparaison du registre et de l'inventaire de la sous-partie 1.2 du TD10 | Les schémas et tables principales des comptes, sessions, événements, projections, offres, Taverne et registre des effacements sont recensés. La table `identity.verification`, qui contient notamment un identifiant et une valeur de vérification temporaires, n'est toutefois pas mentionnée dans le registre. | non conforme |
| R2 | L'export contient toutes les données du joueur, module par module | Test « exporte les données du joueur, module par module, en un fichier JSON » ; lecture d'un export réel | Le test d'intégration réussit. L'export contient les sections `identity`, `realm`, `dungeon`, `market`, `ranking` et `tavern`, avec les données personnelles lisibles de chaque contributeur. | conforme |
| R3 | L'export ne contient ni les données des autres joueurs, ni les secrets du jeu ou du compte | Test « ne contient ni les données des autres joueurs, ni les secrets du jeu » ; recherche de « password » et « token » dans un export | Le test réussit : les messages de Bob, le village de Bob et la graine du Donjon ne figurent pas dans l'export d'Alice. Le contributeur d'identité n'exporte ni l'empreinte du mot de passe ni les jetons de session. | conforme |
| R4 | Après la suppression d'un compte, son nom et celui de son village n'apparaissent plus dans aucune table | Suppression d'un compte de test, puis recherche de son nom dans toutes les tables | Les tests d'effacement réussissent pour le journal, les tables de lecture, les offres, les messages et la présence : les noms sont remplacés ou supprimés, tandis que les données de Bob restent présentes. Le parcours utilise toutefois l'adaptateur d'authentification de test et ne vérifie pas la suppression d'un compte réel dans `identity.user`, `identity.account` et `identity.session`. | à vérifier |
| R5 | L'effacement est tracé, sans conserver de donnée sur le joueur, et peut être relancé | Tests « enregistre l'effacement dans le registre... » et « peut être relancé sans effet supplémentaire » | Les tests réussissent : `platform.erasures` ne contient que son identifiant, sa date et le nombre d'événements réécrits. Une seconde demande réécrit zéro événement et ne produit aucun effet supplémentaire. | conforme |
| R6 | Les messages de la Taverne ne sont pas conservés plus de trente jours, même sans visite | Tests de la durée de conservation ; compte rendu de la tâche quotidienne dans les journaux de Vercel | Les deux tests réussissent : une lecture supprime les messages expirés et la tâche quotidienne supprime également les messages et la présence sans consultation préalable de la Taverne. | conforme |
| R7 | La présence ne constitue aucun historique des visites | Test « considère comme parti un joueur sans signal depuis deux minutes, et supprime sa ligne » | Le test réussit sur la base de développement : après deux minutes sans signal, le joueur n'est plus présenté et sa ligne est absente de `tavern.presence`. Le départ explicite supprime également la ligne immédiatement. | conforme |
| R8 | Les sessions expirées ne sont pas conservées indéfiniment | Requête SQL sur `identity.session` : sessions dont `expires_at` est passé | La manipulation sur la base de développement montre la structure et l'existence de `identity.session`, mais aucune tâche ni requête applicative ne supprime les sessions dont `expires_at` est passé. La suppression en cascade ne se produit qu'à la suppression du compte. | non conforme |
| R9 | Les journaux techniques ne contiennent pas de données personnelles au-delà du nécessaire | Lecture de `app.onError` dans `create-api.ts` ; consultation des journaux de Vercel | `app.onError` renvoie seulement `INTERNAL` au client et journalise l'erreur côté serveur. La durée de conservation Vercel est documentée à une heure sur le plan Hobby, mais le contenu réel des journaux de production n'est pas accessible dans cette revue ; l'absence de données excessives n'est donc pas démontrée. | à vérifier |
| R10 | Après la suppression d'un compte, l'identifiant conservé ne peut plus être relié à une personne | Recherche de l'identifiant dans `identity`, `platform.outbox` et les journaux de Vercel | L'identité est effacée en dernier et les noms copiés dans le journal sont pseudonymisés. Les tables de développement ne contiennent plus le compte après l'effacement, mais l'audit complet de `platform.outbox` et des journaux Vercel n'a pas été réalisé ; la preuve de l'absence de tout lien résiduel est donc incomplète. | à vérifier |

## Synthèse initiale — TD10

Sur les dix exigences, cinq sont conformes, deux sont non conformes et trois
restent à vérifier.

Les non-conformités sont :

- `identity.verification` manque dans le registre des traitements (R1) ;
- aucune purge des sessions expirées n'est actuellement mise en œuvre (R8).

Les points restant à vérifier sont la suppression effective d'un compte réel dans
toutes les tables d'identité (R4), ainsi que le contenu des journaux Vercel et
les éventuels liens résiduels dans la boîte d'envoi après effacement (R9-R10).

Actions décidées :

- ajouter `identity.verification` au registre des traitements ;
- ajouter une purge des sessions expirées, déclenchée par la tâche quotidienne,
  et la couvrir par un test SQL ;
- effectuer un export et un effacement avec une authentification réelle sur la
  base de développement, puis rechercher l'identifiant dans toutes les tables ;
- consulter les journaux Vercel de production et conserver la preuve de cette
  vérification avec la revue.

  ## Suivi de conformité après le TD11

La revue initiale a été réalisée au TD10, avant les dernières corrections documentaires du projet. Les constats de cette revue sont conservés dans le tableau et la synthèse précédents afin de préserver la chronologie des vérifications.

### Actualisation de l'exigence R1

Lors du TD10, l'exigence R1 avait été déclarée non conforme en raison de l'absence de la table `identity.verification` dans le registre des traitements.

Après le TD11, le registre a été complété pour intégrer :

- `identity.verification`, dans le traitement T1 relatif aux comptes et aux vérifications temporaires ;
- `identity.rate_limit`, dans le traitement T2 relatif aux sessions et à la limitation des tentatives.

La comparaison avec les schémas concernés confirme que le défaut documentaire initialement identifié a été corrigé.

**Statut actualisé de R1 : conforme sur le périmètre examiné.**

### Situation consolidée

| Indicateur | Au TD10 | Après actualisation |
| --- | ---: | ---: |
| Exigences conformes | 5 | 6 |
| Exigences non conformes | 2 | 1 |
| Exigences à vérifier | 3 | 3 |

L'exigence R8 reste non conforme : aucune purge applicative des sessions expirées n'est actuellement mise en œuvre.

Les exigences R4, R9 et R10 restent à vérifier. Elles concernent respectivement l'effacement effectif d'un compte réel, le contenu des journaux techniques et l'absence de liens résiduels avec un compte supprimé.

La correction de R1 ne modifie pas rétroactivement les résultats du TD10. Elle constitue une évolution documentée après la revue initiale.

Les actions restantes sont suivies dans `docs/qualite/dette-technique.md`, sans être considérées comme réalisées tant que leur mise en œuvre ou leur vérification n'a pas été démontrée.