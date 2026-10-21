# Revue de sécurité des Chroniques : accès, confidentialité et intégrité des succès

- Date : 2026-10-21
- Périmètre : API du module Chroniques, règles d'attribution des succès, projection, canal temps réel et effacement des données personnelles.
- Références : OWASP Top 10 (A01 Broken Access Control, A04 Insecure Design, A08 Software and Data Integrity Failures).

| N° | Exigence | Vérification | Constat | Statut |
| --- | --- | --- | --- | --- |
| C1 | Seul un joueur authentifié peut consulter les Chroniques | Test « refuse une requête anonyme (401) » | La route `/api/chronicle/achievements` est protégée par `requireUser`. Une requête anonyme reçoit une réponse 401. | Conforme |
| C2 | Un joueur ne peut consulter que ses propres distinctions | Test « attribue les distinctions du Village au bon joueur » ; lecture de `api.ts` | L'API utilise `c.var.userId`, fourni par l'authentification. Elle n'accepte pas d'identifiant de joueur dans la requête. Les distinctions d'Alice ne sont pas renvoyées à Bob. | Conforme |
| C3 | Les succès respectent les règles du jeu | Tests du domaine et de la projection | Les distinctions sont attribuées uniquement lorsque leurs conditions sont remplies. La distinction Conquérant nécessite une victoire et exclut les compagnons. | Conforme |
| C4 | Un même succès ne peut pas être attribué plusieurs fois | Tests du domaine et de la projection ; contrainte d'unicité PostgreSQL | Le domaine refuse une distinction déjà obtenue. La clé primaire `(player_id, achievement_id)` empêche également les doublons en base. | Conforme |
| C5 | Une reconstruction de la projection conserve des résultats cohérents | Test de reconstruction de la projection | Le modèle de lecture peut être reconstruit depuis le journal sans créer de distinctions supplémentaires. | Conforme |
| C6 | Le canal temps réel ne divulgue pas de données personnelles | Tests « refuse le canal Chroniques à un joueur anonyme », « autorise le canal sans divulguer les données des événements » et « ne révèle pas l'identifiant d'un autre joueur » | Le canal est réservé aux joueurs authentifiés. Les données des événements sont masquées et les noms des flux globaux ne révèlent plus les identifiants des joueurs. | Conforme |
| C7 | Les distinctions d'un compte supprimé ne doivent pas réapparaître | Test « ne recrée pas les succès après la suppression du compte et une reconstruction » | L'effacement supprime les distinctions et marque les événements concernés. La projection ignore ces événements lors de sa reconstruction. | Conforme |
| C8 | L'effacement d'un compte ne doit pas supprimer les succès des autres joueurs | Test « conserve les succès des autres joueurs après l'effacement de l'hôte » | Après la suppression du compte de l'hôte et la reconstruction de la projection, les distinctions du joueur supprimé restent absentes et celles des autres participants sont conservées. | Conforme |

## Synthèse

Les huit critères contrôlés sont conformes dans le périmètre examiné.

Les protections reposent sur l'authentification des routes, la séparation des données par joueur, les règles du domaine, les contraintes d'unicité et le filtrage des événements temps réel.

Deux problèmes ont été identifiés et corrigés pendant le développement :

- La reconstruction de la projection pouvait recréer les succès d'un compte supprimé.
- Le canal global conservait le nom des flux, qui pouvait révéler l'identifiant d'un joueur.

Les tests ajoutés permettent de vérifier ces corrections et de limiter les risques de régression.

La dernière exécution de `pnpm verify` a validé **251 tests répartis dans 36 fichiers**.

## Suivi

La revue devra être actualisée si de nouvelles distinctions sont ajoutées, si le format des événements change ou si le système de notifications évolue.

Cette revue couvre le code et les tests du module. Elle ne remplace pas un audit complet de la configuration de production.