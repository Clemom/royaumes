# TD final — Rendu du module Chroniques

- Date : 2026-10-21
- Module : `chronicle`
- Projet : Royaumes

## 1. Présentation du module

Les Chroniques permettent aux joueurs de débloquer des succès en réalisant certaines actions dans le jeu.

Quatre distinctions sont disponibles :

| Succès | Condition |
| --- | --- |
| Fondateur | Fonder son premier village |
| Bâtisseur | Améliorer un bâtiment du village |
| Éclaireur | Ouvrir une expédition |
| Conquérant | Remporter une expédition |

Les succès sont consultables sur la page `/chronicle`. Lorsqu'une nouvelle distinction est obtenue, une notification temporaire apparaît dans le jeu.

## 2. Architecture

Le module respecte l'architecture hexagonale du projet :

- Domaine : règles de déblocage des distinctions.
- Application : contrat de lecture des succès.
- Infrastructure : projection des événements et stockage PostgreSQL dans le schéma `chronicle`.
- API : consultation des distinctions du joueur authentifié.
- Interface : page des succès et notifications en temps réel.

Le module utilise les événements publiés par le Village et le Donjon, sans modifier leurs règles métier.

Il possède ses entrées publiques (`index.ts`, `contracts.ts`, `ui.tsx`), sa migration de base de données et son contributeur RGPD (`personal-data.ts`).

Les décisions techniques sont documentées dans les ADR-0010 et ADR-0011.

## 3. Tests et vérifications

Dernière exécution de `pnpm verify` :

| Vérification | Résultat |
| --- | --- |
| Biome | Validé |
| TypeScript | Validé |
| Règles d'architecture | Validées |
| Tests automatisés | 251 réussis |
| Fichiers de tests | 36 |
| Couverture du code | 73,83 % des lignes, 72,17 % des instructions, 68,09 % des fonctions et 63,82 % des branches |

Les tests des Chroniques couvrent les règles d'attribution, l'absence de doublons, la projection, la reconstruction, l'authentification, la confidentialité du canal et l'effacement RGPD.

Le fonctionnement de la page et de la notification a également été vérifié manuellement dans le navigateur.

La revue de sécurité du module comporte huit critères, documentés dans `docs/qualite/revue-securite-chroniques.md`.

## 4. Bonus réalisés

| Bonus | Réalisation |
| --- | --- |
| B4 — Projection | Les distinctions sont calculées par une projection à partir du journal d'événements. |
| B6 — Communication entre modules | Les Chroniques exploitent les événements publiés par deux modules existants : Village et Donjon. |
| B1 — Temps réel | Un canal SSE signale les événements susceptibles de débloquer un succès et permet d'afficher une notification dans le jeu. |

Ces trois bonus sont présentés à l'évaluation, sous réserve de leur validation par l'enseignant.

## 5. Sécurité et données personnelles

L'API est réservée aux joueurs authentifiés et ne renvoie que leurs propres distinctions.

Le canal temps réel masque les données des événements ainsi que les identifiants des flux globaux.

L'export RGPD inclut les distinctions du joueur. Lorsqu'un compte est supprimé, ses données sont effacées et ne sont pas recréées lors de la reconstruction de la projection.

Un test vérifie également que les succès des autres participants à une expédition sont conservés.

## 6. Limites connues

Les notifications sont temporaires et ne possèdent pas d'historique.

Le canal global peut provoquer une consultation de l'API sans qu'un nouveau succès ait été obtenu.

Le rattrapage de la projection a lieu à la consultation et peut présenter un léger retard.

Ces choix et limites sont documentés dans les ADR et le registre de dette technique.

## 7. Livraison

Le projet est versionné sur GitHub et déployé sur Vercel.

Avant la livraison finale, il reste à confirmer la couverture des tests, vérifier la construction de production, publier les commits et créer le tag `eval-fin` demandé dans le TD.