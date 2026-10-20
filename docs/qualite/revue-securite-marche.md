# Revue de sécurité du Marché : intégrité des échanges

- Date : 2026-10-20
- Périmètre : API du module Marché, gestionnaires de messages du Village et du Marché, boîte d'envoi et sa route de distribution, canal temps réel du Marché.
- Références : OWASP Top 10 (A01 Broken Access Control, A04 Insecure Design, A08 Software and Data Integrity Failures).

| N° | Exigence | Vérification | Constat | Statut |
| --- | --- | --- | --- | --- |
| M1 | Un joueur ne publie, n'accepte et ne retire une offre qu'en son propre nom | Lecture de `api.ts` : aucune route n'accepte d'identifiant de joueur | Les routes construisent le vendeur, l'acheteur et le demandeur du retrait à partir de `c.var.userId` et `c.var.userName`. Aucun identifiant de joueur n'est accepté dans le corps ou le chemin de la requête. | conforme |
| M2 | Seul le vendeur peut retirer son offre et récupérer les ressources en séquestre | Test « restitue les ressources au vendeur qui retire son offre » | Le test réussit : Bob reçoit 403, Alice peut retirer son offre, et ses 60 bois sont restitués. La décision du domaine vérifie que `playerId` correspond au vendeur. | conforme |
| M3 | Un joueur ne peut pas accepter sa propre offre | Tests « refuse l'acceptation de sa propre offre... » et « restitue les ressources au vendeur... » | Le test réussit avec une réponse 409. `decide` refuse toute acceptation dont l'identifiant d'acheteur est celui du vendeur, avant de créer un événement ou un mouvement de ressources. | conforme |
| M4 | Aucun échange ne crée ni ne détruit de ressources, y compris lors d'acceptations simultanées | Test « ne conclut l'échange qu'avec un seul acheteur, lors de deux acceptations simultanées » | Les tests du parcours complet et des deux acceptations simultanées réussissent. Une seule requête obtient 200, l'autre 409 ; la contrainte de version du journal départage les écritures et les totaux restent de 300 bois et 150 pierre. | conforme |
| M5 | Un message remis plusieurs fois n'a d'effet qu'une fois | Test « n'a qu'un effet, et ne répond qu'une fois, lorsqu'un message est remis deux fois » ; test « ignore une réponse en double... » | Les tests du gestionnaire du Village et de la boîte d'envoi réussissent. La clé d'idempotence du mouvement et la progression versionnée de l'offre empêchent un doublon de retirer ou de déposer deux fois les mêmes ressources. | conforme |
| M6 | Les quantités échangées sont des entiers strictement positifs, à l'entrée de l'API comme à la réception d'un message | Publication d'une offre de -50 bois ; schéma `ResourceAmounts` | `ResourceAmounts` impose au moins une ressource, des nombres entiers strictement positifs et aucune clé inconnue. Le même schéma est utilisé par les messages de transfert du Village ; le résultat reçu par le Marché est également validé par Zod. | conforme |
| M7 | Aucun joueur ne peut provoquer un mouvement de ressources dans un village autrement que par une offre | Lecture des routes de l'API : aucune n'enregistre de message dans la boîte d'envoi | Les seules routes joueur du Marché publient, acceptent ou retirent une offre. Les messages de retrait et de dépôt sont construits uniquement par `market-service` à partir des événements de la saga ; aucune route ne permet de fournir directement un `transferId`, un `playerId` ou des ressources au Village. | conforme |
| M8 | La route de distribution planifiée n'est accessible qu'avec le secret, absent du dépôt | Test « refuse une requête sans le secret attendu, et reste fermée sans secret configuré (401) » ; `git grep -n CRON_SECRET` | Le test réussit pour un secret absent ou incorrect. La route compare l'en-tête `Authorization` au secret injecté à la composition et reste fermée si aucun secret n'est configuré. Le secret n'est présent que dans la configuration d'environnement et l'exemple, pas dans le dépôt. | conforme |
| M9 | Le canal du Marché ne transmet aucune donnée d'événement | Route de repli `/api/stream/market/events?after=0` | La règle du canal global `market` sélectionne uniquement les types consommés par la projection et active `redact`. SSE comme route de repli transmettent la position, le flux, la version et le type, avec `data: {}` ; les noms et les quantités des événements ne sont donc pas exposés. | conforme |
| M10 | Les ressources manquantes lors d'un paiement refusé ne sont connues que de l'acheteur concerné | Consultation de l'offre par le vendeur après un paiement refusé | La vue conserve le refus avec l'identifiant de l'acheteur, mais `toView` ne renvoie `missing` que lorsque le lecteur est cet acheteur. Le vendeur et les autres joueurs reçoivent `missing: null`; le test du paiement refusé confirme le parcours et le filtrage est assuré par le domaine. | conforme |

## Synthèse

Les dix exigences contrôlées sont conformes dans le périmètre examiné. Aucun
écart bloquant ou non-conformité n'a été relevé.

Les tests ciblés exécutés sont passés : 33 tests réussis dans les suites de
l'API du Marché, de la boîte d'envoi, des tâches planifiées et du temps réel.
Ils couvrent notamment les contrôles d'identité, les retraits et paiements,
les acceptations concurrentes, l'idempotence des messages, la validation des
ressources et la discrétion du canal.

Actions décidées :

- conserver ces tests avec le module Marché ;
- ajouter tout nouveau champ personnel ou canal à cette matrice de contrôle ;
- rejouer cette revue lors d'une évolution de la saga, du format des messages,
  de l'authentification ou de la diffusion temps réel.
