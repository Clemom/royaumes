# Revue de sécurité du Donjon : dissimulation d'informations et intégrité du jeu

- Date : 2026-10-20
- Périmètre : API du module Donjon, canal temps réel des expéditions, tirages au sort.
- Références : OWASP Top 10 (A01 Broken Access Control, A04 Insecure Design).

| N° | Exigence | Vérification | Constat | Statut |
| --- | --- | --- | --- | --- |
| D1 | La vue d'une expédition ne contient ni la graine ni le contenu des salles non explorées | Test « ne transmet ni la graine ni le contenu des salles suivantes » | `toView` ne renvoie ni `seed`, ni les salles futures ; le test vérifie également l'absence de ces données dans la vue. | Conforme |
| D2 | L'action choisie par un héros n'est connue que de son joueur jusqu'à la résolution de la manche | Tests « cache l'action choisie par les autres héros » et « ne révèle pas l'action d'un héros aux autres joueurs » ; outils de développement | La vue expose `action` uniquement au joueur concerné. Pour les autres héros, elle expose seulement `ready`; le flux temps réel ne contient pas l'action. | Conforme |
| D3 | Le canal d'une expédition n'est accessible qu'à ses membres | Test « réserve le canal d'une expédition à ses membres (403) » | La règle d'accès du canal `dungeon-<id>` vérifie l'appartenance à l'expédition ; un joueur extérieur reçoit 403. | Conforme |
| D4 | Le canal d'une expédition ne transmet aucune donnée d'événement, ni par le flux, ni par la route de repli | Tests du bloc « Canal discret » et « signale l'action d'un héros sans la révéler » | Le flux ne transmet que le type et la version de l'événement. Le test observe la notification `ActionSubmitted` mais vérifie que `heal` et donc la cible ne sont pas transmis. | Conforme |
| D5 | Un joueur ne peut agir qu'en son propre nom | Lecture de `api.ts` : aucune route n'accepte d'identifiant de joueur | Les routes construisent les commandes avec `c.var.userId`, issu de l'authentification ; l'identifiant fourni par le client est limité au numéro de manche et à l'action. | Conforme |
| D6 | Seul l'hôte lance l'expédition, et seul le héros dont c'est le tour ouvre une porte | Tests « ne laisse que l'hôte lancer l'expédition » et « fait ouvrir les portes à tour de rôle » | `decide` refuse le lancement par un non-hôte et l'ouverture par un héros qui n'est pas désigné par `turn`. | Conforme |
| D7 | Un joueur ne peut ni choisir ni prévoir le résultat d'un tirage au sort | Lecture de `dungeon-service.ts` : graine tirée par le serveur ; exigence D1 | La graine est générée côté serveur, n'est pas renvoyée dans les vues et les résultats sont tirés dans le domaine puis enregistrés dans les événements. La reproductibilité n'expose donc pas la graine au joueur. | Conforme |
| D8 | L'échéance d'une manche est appréciée par l'horloge du serveur | Commande d'échéance envoyée avant l'échéance | L'échéance est enregistrée dans l'état événementiel et `settle` compare cette valeur à `now`, fourni par le service côté serveur. La commande envoyée par le navigateur ne décide pas de l'heure retenue. | Conforme |
| D9 | Une action destinée à une manche déjà résolue est refusée | Test « refuse un choix pour une manche déjà résolue » | `SubmitAction` exige que le numéro reçu soit celui de la manche courante ; après résolution, l'API répond avec `ROUND_OVER` et le statut HTTP correspondant. | Conforme |
| D10 | Connaître l'adresse d'une expédition ne permet pas d'y agir sans en être membre | Action envoyée par un joueur qui n'est pas membre | Les commandes d'action et d'ouverture recherchent le héros correspondant à l'utilisateur authentifié et refusent un utilisateur absent de `state.heroes`. | Conforme |
| D11 | Aucun joueur ne peut agir au nom d'un compagnon ni écouter le canal en son nom | Test « présente le compagnon comme prêt, et ne le compte pas parmi les membres » ; fonction `isMember` de `rules.ts` | | |
| D12 | L'intelligence artificielle ne transmet aux joueurs aucune information qu'ils n'auraient pas autrement | Lecture de `companion.ts` et `monster-strategies.ts` ; vue filtrée inchangée | | |

## Synthèse

Les dix exigences contrôlées sont conformes dans le périmètre examiné. Aucun
écart bloquant ou non-conformité n'a été relevé.

Les protections reposent sur deux principes complémentaires : les routes
utilisent exclusivement l'identité issue de l'authentification, et les vues
ainsi que les notifications temps réel sont filtrées avant d'être transmises au
navigateur. Les tests automatisés couvrent notamment la confidentialité des
actions, l'accès aux canaux, les droits de l'hôte, les échéances et les
écritures concurrentes.

Un risque résiduel demeure hors du périmètre de cette revue : la sécurité du
fournisseur d'authentification et de la configuration de production n'est pas
évaluée ici. Une prochaine revue devra également vérifier qu'aucune nouvelle
route ne permette d'injecter un identifiant de joueur ou de renvoyer l'état
complet de l'expédition.

Actions décidées :

- conserver les tests de confidentialité et de contrôle d'accès avec le
 module Donjon ;
- ajouter tout nouveau canal ou toute nouvelle route à cette matrice de
 contrôle ;
- rejouer cette revue lors d'une évolution de l'authentification, du format
 des événements ou de la diffusion temps réel.