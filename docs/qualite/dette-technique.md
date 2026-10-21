# Registre de la dette technique

Ce registre recense les raccourcis pris délibérément dans le projet. Chaque entrée
indique la nature du raccourci, ses conséquences et l'échéance prévue pour son
remboursement. Une entrée remboursée n'est pas supprimée : elle passe au statut « remboursée ».

Dans le code, chaque raccourci est signalé par un commentaire commençant par
`DETTE TECHNIQUE`, qui renvoie à ce registre.

| N° | Raccourci | Conséquences | Échéance | Statut |
| --- | --- | --- | --- | --- |
| DT-001 | Joueur unique : toutes les requêtes sont attribuées au joueur `demo` | Aucune séparation entre joueurs ; aucun contrôle d'accès | TD4 (authentification) | Remboursée au TD4 : intergiciel `requireUser` et Better Auth |
| DT-002 | Stockage en mémoire des événements du Village | Données perdues à chaque redémarrage ; non partagées entre plusieurs instances | TD3 (journal d'événements) | Remboursée au TD3 : adaptateur fondé sur le journal d'événements |
| DT-003 | Conflit de version non traité par le service du Village | Deux commandes simultanées : la seconde échoue avec une erreur 500 au lieu d'être rejouée | TD3 (concurrence optimiste) | Remboursée au TD3 : nouvel essai par `withOptimisticRetry` |
| DT-004 | Compteurs de la limitation des tentatives conservés dans la mémoire de chaque instance (`src/platform/auth/better-auth.ts`) | Limite réelle multipliée par le nombre d'instances actives | TD11 (revue de qualité) | Remboursée au TD11 : compteurs conservés dans la table `identity.rate_limit` |
| DT-005 | Liste des expéditions ouvertes recalculée à chaque consultation, à partir du journal (`src/modules/dungeon/infrastructure/event-store-game-repository.ts`) | Coût de chaque consultation proportionnel à l'historique de toutes les expéditions, et non au nombre d'expéditions ouvertes | TD8 (projections) | Remboursée au TD8 : projection des expéditions ouvertes, port `OpenGamesReader` |
| DT-006 | Exploration sans échéance (`src/modules/dungeon/domain/rules.ts`) | Un joueur absent lorsque vient son tour bloque l'expédition pour tous ses membres | TD7 (intelligence artificielle) | Remboursée au TD7 : échéance d'exploration, ouverture automatique de la porte |
| DT-007 | Messages abandonnés (lettres mortes) seulement comptés par la tâche quotidienne de la boîte d'envoi (`src/bootstrap/create-api.ts`) | Une saga interrompue par un message abandonné, par exemple une offre bloquée en règlement avec des ressources en séquestre, n'est détectée qu'en interrogeant la base, et ne peut être relancée que par une requête SQL | TD11 (revue de qualité) | Remboursée au TD11 : script `scripts/dead-letters.ts`, avertissement de la tâche quotidienne |
| DT-008 | Migrations du service Village : la base locale reçoit toutes les migrations de l'application, une base désignée par `VILLAGE_DATABASE_URL` n'en reçoit aucune (`scripts/village-service.ts`) | La base du service contient les tables vides des autres modules ; un déploiement du service n'a pas de procédure de migration | Extraction du Village en production (ADR 0009) | Ouverte |
| DT-009 | Flux d'événements publié par le service Village renvoyé en une seule réponse, sans pagination (`src/services/village/village-service.ts`) | Après une longue interruption du relais, une réponse volumineuse, longue à produire et à recopier | Extraction du Village en production (ADR 0009) | Ouverte |
| DT-010 | Boîte d'envoi du service Village distribuée seulement à la réception d'un message (`src/services/village/village-service.ts`) | Une réponse au Marché qui n'a pu être transmise attend le message suivant : sans autre échange, une saga peut rester en attente | Extraction du Village en production (ADR 0009) | Ouverte |

## Suivi des actions ouvertes issues des revues

Ce suivi complète le registre des dettes techniques historiques DT-001 à DT-010.

Les constats proviennent des revues de sécurité menées entre les TD4 et TD9, ainsi que de la revue RGPD du TD10. Ils sont repris à l'issue du TD11 pour assurer leur traçabilité.

Les actions ci-dessous sont distinguées des dix dettes techniques du cours : elles ne modifient ni leur numérotation ni le bilan de sept dettes remboursées et trois dettes ouvertes.

### Sécurité de l'authentification

| Référence | Action à suivre | Échéance proposée | Statut |
| --- | --- | --- | --- |
| S3 | Restreindre la désactivation du rate limiting aux environnements de développement ou de test. | Prochaine révision de sécurité de l'authentification | Ouverte |
| S5 | Réexaminer la politique `SameSite` au regard de l'exigence de protection intersite et des protections CSRF. | Prochaine révision de sécurité de l'authentification | Ouverte |
| S7 | Rendre le secret d'authentification obligatoire dans tout environnement de production, indépendamment de Vercel. | Avant un déploiement sur un autre hébergeur | Ouverte |
| S9 | Examiner la possibilité d'une réponse générique lors de l'inscription d'une adresse déjà utilisée. | Prochaine révision de sécurité de l'authentification | Ouverte |
| S14 | Vérifier l'invalidation effective d'une session après déconnexion et traiter les erreurs de suppression. | Prochaine révision de sécurité de l'authentification | Ouverte |

La dette DT-004, qui concernait le stockage local des compteurs de limitation, a été remboursée au TD11. Elle ne doit pas être confondue avec la non-conformité S3, qui concerne les conditions de désactivation du dispositif.

### Conformité RGPD

| Référence | Action à suivre | Échéance proposée | Statut |
| --- | --- | --- | --- |
| R1 | Compléter le registre avec `identity.verification` et `identity.rate_limit`. | Après le TD11 | Corrigée et réévaluée |
| R4 | Vérifier l'effacement d'un compte réel dans les tables d'identité et les autres modules. | Prochaine campagne de vérification RGPD | À vérifier |
| R8 | Prévoir une purge effective des sessions expirées et vérifier son comportement. | Prochaine évolution de la gestion des sessions | Ouverte |
| R9 | Examiner les journaux techniques de production pour vérifier l'absence de données personnelles excessives. | Prochaine revue des journaux de production | À vérifier |
| R10 | Rechercher d'éventuels liens résiduels avec un compte supprimé dans la boîte d'envoi et les journaux. | Prochaine campagne de vérification RGPD | À vérifier |

Les corrections ou vérifications ne sont considérées comme terminées qu'après mise à jour de leur revue d'origine et consignation d'une preuve.

Les échéances proposées sont des jalons de suivi, et non des dates de réalisation déjà décidées.