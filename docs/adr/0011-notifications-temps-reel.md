# ADR-0011 - Réutiliser le temps réel existant pour les notifications

- Statut : accepté
- Date : 2026-10-21

## Contexte

Le module Chroniques doit prévenir un joueur lorsqu'il débloque un succès, même s'il se trouve sur une autre page du jeu.

Le projet possède déjà un système de communication en temps réel utilisant les Server-Sent Events (SSE). Les notifications pourront également servir à d'autres modules à l'avenir.

## Décision

Nous réutilisons le système SSE existant plutôt que de développer un nouveau mécanisme de notification.

Le module Chroniques déclare son propre canal `chronicle`, réservé aux joueurs authentifiés. Ce canal est discret : il annonce les événements sans transmettre leurs données.

Lorsqu'un événement est reçu, l'interface consulte l'API des Chroniques et compare les succès obtenus avec ceux déjà connus. Une notification apparaît uniquement lorsqu'un nouveau succès est détecté.

L'affichage est séparé de la logique métier :

- `chronicle/ui.tsx` détecte les nouveaux succès.
- `src/ui/notification.tsx` fournit un composant visuel réutilisable.
- `src/ui/app-shell.tsx` permet d'afficher les notifications sur toutes les pages du jeu.

Aucune table ni aucun module Notifications supplémentaire n'est créé.

## Conséquences

### Positives

- Le fonctionnement reste conforme au système temps réel étudié dans le cours.
- Aucune nouvelle dépendance technique n'est nécessaire.
- Les autres modules pourront réutiliser le composant visuel.
- Les données personnelles ne sont pas diffusées sur le canal SSE.
- Les responsabilités métier et interface restent séparées.

### Négatives

- Les notifications ne sont pas conservées dans un historique.
- Une notification peut être manquée si le joueur n'est pas connecté au moment du déblocage.
- Les événements du canal global peuvent provoquer des lectures de l'API sans nouveau succès.

## Alternatives écartées

- Créer un module Notifications : trop complexe pour une simple notification temporaire.
- Rafraîchir uniquement la page des Chroniques : peu utile puisque le joueur peut se trouver sur une autre page.
- Ajouter une bibliothèque de notifications : inutile, un composant React simple suffit.

## Réexamen

Cette décision sera réexaminée si plusieurs modules ont besoin d'un historique de notifications, avec des états lu/non lu et une conservation en base.

## Usage de l'IA générative

La contribution de ChatGPT au développement et aux décisions d'architecture est décrite dans l'ADR-0010.