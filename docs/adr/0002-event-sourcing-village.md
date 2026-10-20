# ADR-0002 — L'Event Sourcing comme mode de persistance du Village

- Statut : accepté
- Date : 2026-10-19

## Contexte

Le Village possède un état qui évolue au fil des actions du joueur : fondation, amélioration des bâtiments, production et transfert de ressources.

Le projet doit également répondre à plusieurs besoins :

- Conserver les données du Village après un redémarrage de l'application.
- Permettre la diffusion des changements en temps réel (TD5).
- Construire des vues de lecture à partir de l'activité des joueurs, notamment pour le Classement (TD8).
- Gérer des commandes simultanées sur un même village, dans un environnement pouvant comporter plusieurs instances de l'application.

Il faut donc choisir une méthode de persistance adaptée à ces besoins, tout en respectant les frontières du monolithe modulaire.

## Décision

Nous retenons l'**Event Sourcing** pour la persistance du Village.

L'état courant n'est pas enregistré directement dans une table. Il est reconstruit en rejouant successivement les événements qui décrivent les changements intervenus dans le Village.

Les événements sont conservés dans le journal générique `platform.events`, avec un flux par village nommé `village-<joueur>`.

Le domaine repose sur trois fonctions principales :

- `decide` : vérifie une commande et produit les événements correspondants ou une erreur métier.
- `evolve` : applique un événement à un état.
- `replay` : reconstruit l'état à partir de l'historique des événements.

Chaque événement contient les informations nécessaires à sa relecture, notamment le coût effectivement payé lors d'une amélioration.

La concurrence est gérée par un contrôle de version optimiste. Une contrainte d'unicité sur le flux et la version détecte les écritures concurrentes. En cas de conflit, l'opération peut être retentée, dans la limite de trois tentatives.

## Conséquences

### Positives

- **Historique conservé :** le journal permet de retrouver les changements successifs du Village et de comprendre comment son état a évolué.
- **Reconstruction de l'état :** l'état courant peut être recalculé à partir des événements enregistrés, sans dépendre d'un état stocké séparément.
- **Réutilisation des événements :** le journal sert également de source aux projections du Classement et à la synchronisation en temps réel.
- **Gestion des accès concurrents :** le versionnement évite que deux commandes simultanées écrasent silencieusement leurs modifications.
- **Séparation des responsabilités :** les règles métier restent indépendantes du stockage PostgreSQL grâce à l'interface de dépôt utilisée par la couche application.

### Négatives

- **Coût de reconstruction :** la lecture d'un village nécessite de rejouer son historique. Plus le journal grandit, plus cette opération peut devenir coûteuse.
- **Évolution des événements :** les événements enregistrés ne doivent normalement pas être modifiés. Toute évolution de leur structure doit rester compatible avec les anciens événements, par exemple grâce à une adaptation à la lecture (*upcasting*).
- **Complexité supplémentaire :** cette approche nécessite un journal, un système de versionnement et une logique de reconstruction, contrairement au stockage direct d'un état.
- **Gestion des données personnelles :** certaines informations historiques peuvent être personnelles. Leur effacement nécessite un traitement particulier, comme la réécriture ciblée prévue au TD10 pour respecter les droits des joueurs.
- **Évolution des règles métier :** les anciens événements doivent conserver leur signification même lorsque les règles du jeu ou les coûts des bâtiments évoluent.

## Alternatives écartées

### Stocker directement l'état du Village dans une table

Cette solution aurait été plus simple à mettre en œuvre et aurait permis de lire immédiatement les ressources et les niveaux des bâtiments.

Elle a été écartée, car elle ne conserve pas naturellement l'historique des changements. Il aurait fallu mettre en place un mécanisme supplémentaire pour alimenter les projections et retrouver les événements utiles au temps réel.

### Utiliser un verrouillage pessimiste

Cette approche consiste à verrouiller les données du Village pendant le traitement d'une commande afin d'empêcher toute modification concurrente.

Elle a été écartée au profit de la concurrence optimiste, car elle peut prolonger les transactions et provoquer de l'attente entre requêtes. Pour notre jeu, les conflits sont supposés relativement rares et peuvent être gérés par une nouvelle tentative.

### Conserver à la fois l'état courant et un historique séparé

Cette solution faciliterait les lectures, mais imposerait de maintenir deux représentations cohérentes des mêmes données.

Elle n'a pas été retenue à ce stade, afin de conserver une source de vérité unique : le journal d'événements.

## Réexamen

Cette décision devra être réexaminée si :

- **Le volume d'événements devient trop important :** si le temps de reconstruction d'un village dégrade sensiblement les performances, l'utilisation d'instantanés (*snapshots*) pourra être envisagée pour éviter de rejouer systématiquement tout l'historique.
- **Les conflits d'écriture deviennent fréquents :** si le nombre de tentatives nécessaires augmente fortement, il faudra mesurer la contention et réévaluer la stratégie de concurrence.
- **Les besoins de consultation évoluent :** si de nouvelles fonctionnalités nécessitent des lectures complexes ou très fréquentes, des projections supplémentaires pourront être privilégiées.
- **La gestion des données personnelles devient trop coûteuse :** si la réécriture des événements nécessaire à l'effacement d'un compte ralentit fortement le système, il faudra revoir la manière dont les informations personnelles sont représentées dans le journal.

## Usage de l'IA générative

ChatGPT a été utilisé pour aider à structurer et compléter cet ADR à partir des consignes du TD3 et de l'implémentation du projet Royaumes.

La rédaction s'appuie notamment sur le domaine du Village (`src/modules/realm/domain/village.ts`), son service applicatif (`src/modules/realm/application/village-service.ts`) et le journal d'événements (`src/platform/event-store/event-store.ts`).

Les choix décrits doivent rester cohérents avec le code et les tests du projet. L'IA a apporté une aide à la rédaction et à la formulation des justifications, sans modifier la décision architecturale initiale.