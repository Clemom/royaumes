# ADR-0008 - Stockage classique pour la Taverne et réécriture ciblée des champs personnels du journal pour l'effacement

- Statut : accepté
- Date : 2026-10-20

## Contexte

- Le jeu doit permettre à un joueur d'exercer lui-même ses droits d'accès, de
  portabilité et d'effacement sur l'ensemble de ses données.
- Les messages de la Taverne et la présence de ses joueurs sont destinés à
  disparaître après une durée limitée.
- Les événements du Donjon et du Marché copient le nom des joueurs, et ceux du
  Village copient le nom du village. Ces événements peuvent se trouver dans des
  flux partagés avec d'autres joueurs.
- L'ADR 0002 impose l'ajout seul du journal d'événements, et l'ADR 0006 fait
  dépendre des projections de ce journal.
- L'hébergement ne fournit pas de processus permanent : le nettoyage doit donc
  fonctionner pendant une lecture ou par la tâche quotidienne.

## Décision

- La Taverne utilise des tables ordinaires pour ses messages et sa présence,
  plutôt que le journal d'événements. Les lignes des messages sont supprimées
  lorsqu'elles dépassent leur durée de conservation de trente jours.
- Le canal temps réel de la Taverne est alimenté par une source fournie par le
  module, avec les mêmes règles d'accès que ses lectures.
- La présence repose sur un signal périodique du navigateur. Elle conserve une
  ligne par joueur présent, supprime cette ligne lorsque le joueur quitte, et
  considère le joueur parti deux minutes après son dernier signal.
- Les durées de conservation sont appliquées à la lecture. La route des tâches
  quotidiennes les applique également chaque jour, même sans activité dans la
  Taverne.
- Chaque module qui conserve des données personnelles fournit un contributeur
  à la plateforme. Ce contributeur exporte les données du joueur, réécrit ses
  événements et efface ses données dans les tables du module.
- L'effacement réécrit uniquement les champs de nom personnels appartenant au
  joueur dans les événements qui les contiennent. Une fonction unique de la
  plateforme effectue cette réécriture, dans une transaction avec l'inscription
  de l'opération dans un registre qui ne contient aucune donnée sur le joueur.
  Le type, la version et les autres champs de chaque événement restent
  inchangés.
- Le journal est réécrit avant les tables des modules, puis l'identité du
  joueur est effacée en dernier. Chaque étape est idempotente afin qu'un
  effacement interrompu puisse être relancé par le joueur lui-même.

## Conséquences

### Positives

- Le joueur peut exercer ses droits d'accès, de portabilité et d'effacement
  sans intervention manuelle de l'équipe.
- L'effacement ne modifie ni les états reconstruits à partir des événements ni
  l'historique des autres joueurs : seuls les champs de nom concernés sont
  remplacés.
- La conservation est garantie même sans visite de la Taverne, car les lectures
  et la tâche quotidienne suppriment toutes deux les données expirées.
- La Taverne est plus simple qu'un module fondé sur l'Event Sourcing : ses
  messages et sa présence sont insérés, lus et supprimés directement.
- L'ordre des étapes et l'idempotence permettent de reprendre un effacement
  après une interruption sans perdre son avancement.

### Négatives

- La réécriture des événements constitue une exception à la règle de l'ajout
  seul de l'ADR 0002. Toute modification future du journal doit respecter
  strictement cette exception et préserver les données non personnelles.
- Le coût d'un export et d'un effacement croît avec la taille du journal à
  parcourir.
- Chaque nouvel événement doit déclarer ses champs personnels dans le
  contributeur de son module ; sinon ces champs échapperont à l'effacement.
- Un identifiant de joueur peut rester dans le journal. Sa pseudonymisation
  dépend de la destruction effective de tout lien entre cet identifiant et la
  personne.
- Les contributeurs, le registre et les réécritures ajoutent des contrats et
  des tests à maintenir entre la plateforme et chaque module.

## Alternatives écartées

- **Utiliser l'Event Sourcing pour la Taverne** : rejeté, car les messages et la
  présence ont une durée de vie courte et doivent être supprimés. Les conserver
  dans un journal immuable rendrait la conservation et l'effacement
  inutilement complexes.
- **Supprimer les flux du joueur** : rejeté, car un flux peut être partagé avec
  d'autres joueurs. Sa suppression détruirait leur historique et les états
  reconstruits qui en dépendent.
- **Utiliser l'effacement cryptographique** : rejeté, car il faudrait gérer des
  clés par joueur et garantir la destruction de toutes leurs copies et de tous
  leurs liens. Cette solution ne permettrait pas de préserver simplement les
  événements partagés.
- **Remplacer les noms par des références sans copie** : rejeté pour
  l'existant, car cela imposerait une migration des événements et ne résoudrait
  pas les données personnelles déjà copiées. Pour un nouveau module, cette
  approche doit au contraire être préférée dès la conception.
- **Déléguer la présence à un service externe, par exemple une base clé-valeur
  en mémoire** : rejeté, car cela ajouterait une infrastructure et une
  dépendance opérationnelle alors qu'une table ordinaire suffit avec un signal
  périodique et un délai d'expiration.

## Réexamen

La décision devra être réexaminée lors de la conception d'un nouveau module :
les références sans copie devront alors être préférées dès l'origine.

Elle devra également être revue si la taille du journal rend un export ou un
effacement trop long pour une requête, ou si le nombre de champs personnels
rend la déclaration et la vérification des contributeurs insuffisantes.

Enfin, l'évolution de la doctrine sur l'anonymisation des identifiants
pseudonymes, l'apparition d'une infrastructure de présence fiable ou un besoin
de conservation différent pour la Taverne devront conduire à réévaluer cette
décision.

## Usage de l'IA générative

Un assistant IA utilisant le Copilot SDK dans VS Code a été utilisé pour
structurer et rédiger cet ADR à partir des consignes fournies, du gabarit et
des ADR 0002, 0003, 0006 et 0007. Le contenu a été vérifié dans les services
de la Taverne, le service de confidentialité, le registre des effacements et
la tâche quotidienne.
