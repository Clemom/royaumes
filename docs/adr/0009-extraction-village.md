# ADR-0009 - Extraction du Village en service autonome, préparée mais non déployée

- Statut : accepté
- Date : 2026-10-20

## Contexte

La promesse de l'ADR-0001 est de maintenir des frontières suffisamment strictes entre
les modules pour que l'un d'eux puisse être extrait en service autonome si un besoin
réel apparaît. Les raisons d'extraire un module présentées en 1.3 ne s'appliquent
aujourd'hui à aucun aspect du jeu : le Village ne dépasse pas son budget de charge,
aucune seconde équipe ne lui est consacrée et il n'a pas besoin d'un rythme de
déploiement différent du reste de l'application.

L'inventaire des dépendances du Village est le suivant :

- le Village possède son état, son journal d'événements et sa boîte d'envoi ;
- l'application expose son API et fournit l'identité du joueur authentifié ;
- la saga du Marché lui adresse des demandes de retrait et de dépôt ;
- l'export et l'effacement des données personnelles doivent atteindre son état ;
- le Classement lit les événements du Village dans le journal commun ;
- le canal temps réel lit lui aussi ces événements dans le journal commun.

Les deux dernières dépendances ne passent pas par le code du module Village : elles
lisent directement son flux d'événements publié dans le journal de l'application. Une
extraction doit donc conserver cette vue pour le Classement et le canal temps réel,
sans leur imposer de connaître un transport distant.

## Décision

Le Village peut s'exécuter dans un service autonome doté de sa propre base de données,
de son propre journal d'événements et de sa propre boîte d'envoi. Le service est
préparé, mais il n'est pas déployé : en production, le Village continue de s'exécuter
dans le processus de l'application.

Lorsque le mode distant est activé, l'application devient une passerelle. Elle reçoit
une version distante du module Village qui a la même forme que la version exécutée
dans le processus : API, règle du canal, gestionnaires de messages et contribution
aux données personnelles. Le reste de l'application ne dépend donc pas de
l'implémentation choisie.

Les messages de la saga franchissent la frontière par une boîte de réception. Le
service ne répond avec succès qu'après avoir traité le message ; l'échec laisse le
message dans la boîte d'envoi de l'expéditeur afin de préserver ses garanties
existantes de livraison au moins une fois, de reprise et d'idempotence.

Un relais lit le flux d'événements publié par le service et en recopie les événements
dans le journal de l'application. Le Classement et le canal temps réel continuent
ainsi de lire le journal local. La position du relais est une projection, les copies
conservent le flux et la version d'origine, et leur dépôt est idempotent.

Les échanges entre l'application et le service sont authentifiés par un secret
partagé. Ce secret est fourni par l'environnement d'exécution et n'est jamais
versionné. L'application authentifie le joueur, puis transmet son identité au service
dans la requête authentifiée ; le service ne fait confiance à cette identité qu'après
vérification du secret.

Six tests de contrat vérifient ces frontières à chaque construction : transmission
des requêtes et relai des événements, refus des requêtes sans secret, visibilité
dans le Classement, exécution d'un échange du Marché, reprise après panne du service,
et export puis effacement des données personnelles.

## Conséquences

### Positives

- Les frontières du module sont démontrées par une exécution distante, et non plus
  seulement supposées à partir de l'organisation du code.
- Six tests de contrat vérifient automatiquement ces frontières à chaque construction.
- L'extraction est réversible et ne nécessite pas de migration de données : le mode
  local reste le mode de production et le service utilise une base distincte lorsqu'il
  est activé.
- La boîte de réception et l'authentification entre services constituent une
  mécanique réutilisable pour l'extraction d'un autre module.
- Le relai montre le coût réel d'une extraction : transport, copie différée du journal,
  reprises et gestion d'une panne partielle.
- Le Classement, le canal temps réel et la saga conservent leurs contrats actuels ;
  ils n'ont pas à connaître la topologie distante.

### Négatives

- Deux chemins d'exécution du Village doivent être maintenus et testés : l'un dans le
  processus de l'application, l'autre dans le service distant.
- Les événements du Village sont copiés dans le journal de l'application ; cette copie
  est cohérente à terme et non instantanément.
- Plusieurs dettes doivent être remboursées avant tout déploiement du service, notamment
  l'observabilité du relais, le nettoyage et l'examen des messages abandonnés, ainsi
  que la procédure d'exploitation de deux bases (voir § 5.2).
- L'authentification par secret partagé est simple mais concentrée : en cas de fuite,
  un attaquant pourrait se faire passer pour n'importe quel joueur auprès du service.
- Une panne ou une indisponibilité du service ajoute une défaillance partielle et peut
  retarder les commandes du Village et les étapes de saga qui en dépendent.

## Alternatives écartées

- **Déployer le service** : rejeté, car aucune raison d'extraire présentée en 1.3 ne
  s'applique aujourd'hui et le déploiement ajouterait une infrastructure à exploiter
  sans bénéfice utilisateur démontré.
- **Ne pas extraire et laisser les frontières à l'état d'hypothèse** : rejeté, car
  cela ne vérifierait pas la promesse de l'ADR-0001 ; le mode distant et ses contrats
  rendent les frontières observables sans changer le déploiement de production.
- **Lire à distance le flux publié par le Village depuis le Classement et le canal
  temps réel** : rejeté, car cela propagerait la dépendance au transport dans deux
  consommateurs et modifierait inutilement leurs contrats ; le relais conserve leur
  lecture du journal commun.
- **Extraire un autre module, comme le Marché** : rejeté, car sa saga lie directement
  son sort à celui du Village ; le choix augmenterait d'abord la surface distribuée
  sans isoler une dépendance plus simple.
- **Utiliser un jeton signé** : rejeté pour cette préparation, car il faudrait gérer
  la rotation, la durée de vie et la révocation alors qu'un secret partagé suffit au
  service interne préparé.
- **Utiliser TLS mutuel** : rejeté à ce stade, car la gestion des certificats et de
  leur rotation serait disproportionnée pour un service non déployé ; elle pourra être
  réévaluée si le service devient réellement accessible entre plusieurs réseaux.

## Réexamen

### Conditions de réexamen

La décision devra être réexaminée si un signe observable rend l'extraction utile :

- les tests de charge montrent que le Village dépasse son budget alors que les autres
  modules le respectent ;
- une seconde équipe devient responsable du Village et a besoin d'une autonomie de
  développement ou d'exploitation ;
- le Village doit être déployé plus souvent, ou selon des fenêtres différentes, que le
  reste du jeu ;
- le coût du relais, sa cohérence différée ou la latence des sagas devient supérieur
  au budget accepté ;
- le volume ou l'exposition du service justifie une authentification plus forte, une
  rotation de secrets ou TLS mutuel.

### 5.2 Dettes avant déploiement

Avant tout déploiement, les dettes d'exploitation suivantes devront être traitées :
observabilité et alerte du relais, examen et reprise des messages
abandonnés, procédure de cohérence des deux journaux, sauvegardes et restauration des
deux bases, rotation du secret et limitation de l'identité transmise.

## Usage de l'IA générative

Un assistant IA a été utilisé pour structurer et rédiger cet ADR à partir des consignes,
des ADR existantes et du dernier code d'extraction du Village. Le contenu a été vérifié
dans le module distant, la passerelle, le relais d'événements, la boîte de réception,
l'authentification du service et les six tests de contrat.
