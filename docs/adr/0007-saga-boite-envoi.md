# ADR-0007 - Les opérations intermodules sont des sagas orchestrées par le Marché et distribuées par une boîte d'envoi transactionnelle

- Statut : accepté
- Date : 2026-10-20

## Contexte

Un échange du Marché modifie les données du Marché et celles de deux villages. Il
ne doit ni créer ni perdre de ressources, même si une instance est interrompue
entre deux étapes de l'échange.

La règle d'encapsulation des modules (TD2) interdit à un module d'écrire
directement dans les données d'un autre. La perspective de l'extraction d'un
module dans un service doté de sa propre base (TD11) impose également de ne pas
fonder la cohérence sur une transaction couvrant plusieurs bases.

Enfin, l'hébergement ne permet aucun processus permanent (ADR-0004). La
distribution doit donc pouvoir être déclenchée par une requête du Marché ou par
la tâche planifiée quotidienne, sans dépendre d'un consommateur toujours
exécuté.

## Décision

- Une transaction ne modifie jamais les données que d'un seul module.
- Une opération qui concerne plusieurs modules est une saga. Ses étapes
  compensables, son pivot et ses reprises jusqu'au succès sont identifiés.
- La saga est orchestrée par le module qui porte l'opération, ici le Marché.
  Les participants ne connaissent pas la saga et répondent à l'adresse de
  retour (`replyTo`) indiquée dans chaque demande.
- Les demandes et les réponses sont enregistrées dans la boîte d'envoi de la
  plateforme, dans la même transaction que les événements qui les déclenchent.
  Le journal d'événements reste le support de l'état du module ; la boîte
  d'envoi ne contient que les messages à distribuer.
- La distribution est garantie au moins une fois. Un message est réservé par un
  bail, puis fait l'objet de nouveaux essais avec un recul exponentiel. Il est
  abandonné après dix tentatives et reste identifiable comme message abandonné.
- Chaque gestionnaire est idempotent grâce à une clé d'idempotence choisie par
  le demandeur. Pour un mouvement de ressources, cette clé est l'identifiant
  de transfert ; le Village ignore un identifiant déjà traité.
- La distribution a lieu après chaque commande et chaque consultation du
  Marché, ainsi qu'une fois par jour par une tâche planifiée protégée par un
  secret. Les messages différés de la boîte d'envoi servent aussi de
  minuteries, notamment pour l'expiration d'une offre.

Dans l'échange, la réservation des ressources du vendeur est l'étape
compensable, le prélèvement du paiement de l'acheteur est le pivot, et les
livraisons aux deux joueurs sont reprises jusqu'au succès. En cas d'échec
avant le pivot, les ressources réservées sont restituées.

## Conséquences

### Positives

- Aucun module n'écrit dans les données d'un autre.
- Une panne à n'importe quel moment ne perd ni ne duplique de ressources :
  les messages peuvent être remis plusieurs fois, mais leurs gestionnaires
  idempotents n'appliquent un mouvement qu'une seule fois.
- Le Village peut servir d'autres demandeurs sans connaître le Marché ni la
  saga qu'il exécute.
- La boîte d'envoi sert aussi de minuterie pour les échéances, sans processus
  permanent.
- Le déroulement de la saga se lit en un seul endroit, dans l'état et les
  événements du Marché.
- La même mécanique de distribution fonctionne après une requête ou lors de la
  tâche quotidienne, et les reprises tolèrent l'interruption d'une fonction.

### Négatives

- Des états intermédiaires sont visibles des joueurs, par exemple une offre
  en règlement entre la réservation du vendeur et la confirmation du paiement.
- La latence dépend de l'activité : une saga interrompue ne reprend qu'à la
  consultation ou à la commande suivante du Marché, ou le lendemain si seule
  la tâche planifiée peut la relancer.
- Les gestionnaires doivent être idempotents et leurs doublons doivent être
  testés.
- Les messages abandonnés ne disposent encore d'aucun outil permettant de les
  examiner (dette DT-007).
- La table de la boîte d'envoi grandit sans limite : les messages traités sont
  conservés.
- La distribution au moins une fois et les compensations rendent le suivi,
  l'observabilité et les tests de concurrence plus complexes qu'un appel local.

## Alternatives écartées

- **Une transaction unique englobant les données des deux modules** : rejetée,
  car elle viole l'encapsulation des modules et deviendrait impossible si un
  module était extrait dans une base distincte.
- **Une transaction distribuée par validation en deux phases** : rejetée, car
  elle couplerait les bases, nécessiterait un coordinateur durable et ne
  respecte pas les contraintes de l'hébergement.
- **Un appel direct du Village par le Marché, sans boîte d'envoi** : rejeté,
  car une interruption entre l'appel et l'enregistrement de la réponse peut
  perdre l'avancement de la saga, et le couplage rend les reprises fragiles.
- **Une saga chorégraphiée** : rejetée, car la logique de progression et de
  compensation serait dispersée entre les participants ; le Marché doit
  rester le seul endroit qui connaît l'opération d'échange.
- **Utiliser le journal d'événements comme boîte d'envoi** : rejeté, car les
  événements décrivent l'état durable du module et ne doivent pas être
  consommés comme des messages de transport avec bail, tentatives et
  marquage de traitement.

## Réexamen

La décision devra être réexaminée lors de l'extraction d'un module dans un
service distinct. Il faudrait alors une boîte d'envoi par base et un transport
entre services, avec une analyse complémentaire de la livraison et de
l'authentification des messages.

Elle devra également être réévaluée si le volume de messages justifie un
courtier de messages dédié, si la conservation illimitée de la boîte d'envoi
devient coûteuse ou si un outil d'examen et de reprise des messages abandonnés
est introduit.

Enfin, un besoin de latence que la distribution déclenchée par les requêtes et
la tâche quotidienne ne satisfait plus devra conduire à revoir le mécanisme
de déclenchement et la fréquence de distribution.

## Usage de l'IA générative

Un assistant IA a été utilisé pour structurer et rédiger cet ADR à partir des
consignes fournies, des ADR existantes et de l'implémentation de la saga du
Marché ainsi que de la boîte d'envoi. Le contenu a été vérifié dans les
gestionnaires du Marché et du Village, le distributeur, la route planifiée et
les tests de la boîte d'envoi.
