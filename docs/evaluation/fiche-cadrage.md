# Fiche de cadrage : Les Chroniques

- Auteur : à compléter
- Date : 2026-10-21
- Nom technique du module : `chronicle`
- Validée par l'enseignant le : à compléter

## L'idée

Les Chroniques permettent aux joueurs de débloquer des distinctions en progressant dans Royaumes.

Chaque joueur dispose d'un carnet présentant les distinctions obtenues, leur date d'obtention et celles qui restent à débloquer.

Les distinctions sont attribuées automatiquement à partir des événements du Village et du Donjon.

## Les règles métier

1. Fondateur : débloqué lorsqu'un joueur fonde son village.
2. Bâtisseur : débloqué lorsqu'un joueur améliore un bâtiment.
3. Éclaireur : débloqué lorsqu'un joueur ouvre une expédition.
4. Conquérant : débloqué lorsqu'un joueur participe à une expédition victorieuse. Les compagnons contrôlés par l'ordinateur sont exclus.
5. Unicité : un joueur ne peut obtenir chaque distinction qu'une seule fois. La première date d'obtention est conservée.

## Les commandes et les lectures

| Action | Commande ou lecture | Route |
| --- | --- | --- |
| Consulter ses distinctions | Lecture | `GET /api/chronicle/achievements` |

Aucune commande de déblocage n'est prévue : les distinctions sont obtenues automatiquement.

## Le stockage envisagé

Le module utilise des tables classiques dans le schéma PostgreSQL `chronicle`.

Une projection construit les distinctions obtenues à partir du journal d'événements.

Une table conserve les distinctions et leur date d'obtention. Une seconde table permet de retrouver les joueurs humains d'une expédition jusqu'à sa conclusion.

Ce choix reprend le fonctionnement du Classement (TD8). Il permet également de reconstruire les distinctions sans créer de nouveau journal.

## La communication avec les modules existants

Le module lit les événements publiés par :

- Village : `VillageFounded` et `BuildingUpgraded`.
- Donjon : `GameCreated`, `PlayerJoined` et `GameEnded`.

La communication utilise le moteur de projections existant.

Les Chroniques ne modifient pas les règles métier du Village ou du Donjon.

## Les données personnelles

Le module conserve les identifiants des joueurs et les dates d'obtention des distinctions.

Un fichier `personal-data.ts` permettra d'intégrer ces données à l'export et à l'effacement d'un compte.

## Les bonus visés

1. B4 : projection avec point de reprise et version.
2. B6 : communication avec le Village et le Donjon.
3. B1 : mise à jour en temps réel des distinctions, si le socle est terminé et validé.