# ADR-0006 - Séparer les modèles de lecture du modèle d’écriture et les rattraper à la lecture

- Statut : accepté
- Date : 2026-10-20

## Contexte

Le jeu a besoin de lectures transversales qui parcourent plusieurs flux,
notamment pour le classement et la liste des expéditions ouvertes. Leur calcul
par rejeu devient de plus en plus coûteux à mesure que l'historique du jeu
grandit (dette DT-005).

L'hébergement ne permet aucun processus permanent (ADR-0004). Le journal
attribue à chaque événement une position globale, croissante mais non continue
(ADR-0002). Une lecture ne peut donc pas supposer que deux positions
successives sont nécessairement présentes ni compter sur une tâche de fond pour
tenir un état dérivé à jour.

## Décision

- Les lectures transversales s'appuient sur des modèles de lecture placés dans
  le schéma PostgreSQL du module qui les possède. Les décisions s'appuient
  toujours sur le modèle d'écriture.
- Chaque modèle de lecture est tenu à jour par une projection. Le point de
  reprise de chaque projection est enregistré dans la table
  `platform.projections`.
- Une projection est rattrapée au moment de sa consultation, dans une seule
  transaction. Le point de reprise est verrouillé pendant ce rattrapage afin
  qu'une seule consultation fasse progresser une projection à la fois.
- Le rattrapage parcourt les événements dans l'ordre de leur position globale.
  Il s'arrête devant une position manquante tant que l'événement qui suit cette
  position a moins de cinq secondes. Les positions globales étant non
  continues, l'absence d'une position ancienne ne constitue pas à elle seule
  une erreur.
- Chaque projection porte une version correspondant à la structure et aux
  règles de ses tables. Une version de projection supérieure à celle enregistrée
  pour les tables provoque leur reconstruction avant la reprise du rattrapage.
  Une version de projection inférieure à celle des tables interdit toute
  écriture dans ces tables jusqu'au déploiement d'une projection compatible.
- Le classement est annoncé aux navigateurs par un canal global et discret.
  L'interface relit le classement jusqu'à ce que la projection ait atteint la
  position annoncée.

## Conséquences

### Positives

- Le coût d'une consultation dépend de l'état du modèle de lecture et du retard
  à rattraper, plutôt que de l'ensemble de l'historique du jeu.
- Les modules qui écrivent n'ont rien à savoir des projections qui les lisent ;
  les dépendances entre écriture et lecture restent ainsi découplées.
- De nouvelles informations peuvent être calculées pour le passé en ajoutant
  une projection, sans migration des données déjà enregistrées dans le journal.
- Aucun processus de fond ni aucune opération manuelle n'est nécessaire après
  un déploiement : une consultation reconstruit ou rattrape la projection qui
  en a besoin.
- Le verrouillage du point de reprise rend la progression d'une projection
  atomique et évite que deux consultations concurrentes appliquent deux fois
  les mêmes événements.

### Négatives

- La cohérence est à terme : un modèle de lecture peut avoir quelques secondes
  de retard sur le journal, notamment lorsqu'une position globale manque encore.
- Une reconstruction a lieu pendant une consultation, dont la durée est limitée
  sur Vercel. Elle deviendra impossible au-delà d'une certaine taille du
  journal si elle ne peut plus tenir dans la durée maximale d'une fonction.
- Après un retour à une version précédente de l'application, une projection dont
  la version a été augmentée cesse d'avancer jusqu'au déploiement suivant
  fournissant une version compatible.
- Le Classement dépend du langage publié des autres modules. Un événement
  modifié ou ajouté sans réexamen de ses lecteurs peut donc passer inaperçu,
  comme l'a montré la liste des expéditions ouvertes.
- Lors de consultations nombreuses, le verrou du point de reprise peut devenir
  un goulet d'étranglement et augmenter la latence des lectures.
- Les projections ajoutent des tables, des versions et des règles de
  reconstruction qu'il faut maintenir avec le langage des événements.

## Alternatives écartées

- **Mettre à jour les modèles de lecture dans la commande, par le module qui
  écrit** : rejeté, car le module d'écriture devrait connaître tous ses
  lecteurs et leurs évolutions ; une projection lente ou défaillante
  fragiliserait alors la commande.
- **Exécuter une tâche planifiée** : rejeté, car l'hébergement ne fournit pas
  une fréquence ni une garantie suffisantes pour maintenir les lectures à jour.
- **Abonner un processus de fond au journal** : rejeté, car l'hébergement ne
  permet aucun processus permanent.
- **Utiliser une vue matérialisée PostgreSQL entièrement recalculée à chaque
  rafraîchissement** : rejeté, car chaque consultation pourrait reparcourir
  tout l'historique et reproduire la dette DT-005.
- **Conserver le calcul par rejeu à chaque lecture** : rejeté, car le coût des
  lectures transversales croîtrait avec l'historique et rendrait le classement
  ainsi que la liste des expéditions ouvertes progressivement plus lents.

## Réexamen

La décision devra être réexaminée si une reconstruction approche la durée
maximale d'une fonction Vercel ou si la taille du journal rend une reconstruction
impossible dans une seule consultation.

Elle devra également être réévaluée si le nombre de consultations simultanées
fait du verrou du point de reprise un goulet d'étranglement, ou si le métier
exige une lecture strictement à jour plutôt qu'une cohérence à terme.

Enfin, l'apparition d'un mécanisme fiable d'exécution durable sur l'hébergement,
ou la multiplication des changements du langage publié qui échappent aux
lecteurs, devra conduire à réexaminer le coût et la fiabilité de cette
stratégie.

## Usage de l'IA générative

Un assistant IA a été utilisé pour structurer et rédiger cet ADR à partir des
consignes fournies et du gabarit des ADR existantes. Le contenu a été vérifié
pour couvrir le besoin de lectures transversales, la contrainte d'hébergement,
les positions globales non continues, le versionnement des projections et les
conditions de rattrapage décrites dans la demande.
