
# ADR-0010 - Calculer les succès à partir des événements existants

- Statut : accepté
- Date : 2026-10-21

## Contexte

Le module Chroniques attribue des distinctions aux joueurs selon leurs actions dans le Village et le Donjon.

Il doit connaître ces actions sans dépendre directement de l'implémentation des deux modules. Il doit aussi conserver les distinctions obtenues et permettre leur consultation par le joueur.

## Décision

Les Chroniques constituent un module métier indépendant, situé dans `src/modules/chronicle`.

Le module utilise les événements déjà publiés par le Village et le Donjon : `VillageFounded` `BuildingUpgraded`, `GameCreated`, `PlayerJoined` et `GameEnded`.

Une projection transforme ces événements en distinctions. Elle conserve les résultats dans le schéma PostgreSQL `chronicle`, avec une contrainte d'unicité par joueur et par distinction.

La liste des participants aux expéditions permet d'attribuer la distinction Conquérant aux joueurs humains victorieux, sans l'attribuer aux compagnons.

L'API `GET /api/chronicle/achievements` est authentifiée et ne renvoie que les distinctions du joueur connecté.

Un canal SSE global et discret annonce les événements susceptibles de débloquer un succès. Le navigateur relit alors l'API pour afficher une notification si une nouvelle distinction apparaît.

Le module contribue également à l'export et à l'effacement des données personnelles.

## Conséquences

### Positives

- Le Village et le Donjon ne sont pas modifiés pour gérer les distinctions.
- Les règles des succès restent dans leur propre module.
- La projection peut être reconstruite à partir du journal.
- Les distinctions ne sont attribuées qu'une seule fois.
- Les notifications réutilisent le temps réel existant.
- Le canal ne transmet pas les données des événements.

### Négatives

- Les Chroniques dépendent des contrats des événements publiés par le Village et le Donjon.
- La projection peut avoir un léger retard sur le journal.
- Une notification peut être manquée si le navigateur est déconnecté au moment du déblocage.
- La reconstruction des projections après l'effacement d'un compte nécessite une vérification RGPD spécifique, pour éviter de recréer des données effacées.

## Alternatives écartées

- Attribuer les succès directement dans le Village et le Donjon : ces modules devraient connaître les règles des Chroniques.
- Reparcourir tout le journal à chaque consultation : le coût augmenterait avec le nombre d'événements.
- Créer un module Notifications séparé : inutile pour le besoin actuel. Un composant d'interface partagé suffit.

## Réexamen

La décision sera réexaminée si les notifications doivent être conservées, consultées après déconnexion ou utilisées comme un véritable historique dans plusieurs modules.

## Usage de l'IA générative

Un assistant IA a été utilisé pour structurer et rédiger cet ADR à partir des consignes fournies.
Les propositions ont été intégrées progressivement, vérifiées avec TypeScript, Biome et les tests automatisés, puis testées dans le navigateur.