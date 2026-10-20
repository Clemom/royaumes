# Registre des traitements de données personnelles

Ce registre, prévu par l'article 30 du RGPD, recense les traitements de données personnelles
réalisés par Royaumes. Il est tenu à jour à chaque évolution du jeu qui ajoute, modifie ou
supprime une donnée personnelle, dans le même commit que cette évolution.

- Responsable du traitement : Clemom (éditeur du projet), contact via le dépôt
  public [Clemom/royaumes](https://github.com/Clemom/royaumes).
- Date de dernière mise à jour : 2026-10-20.

## Sous-traitants

| Sous-traitant | Rôle | Localisation des données | Garanties à vérifier |
| --- | --- | --- | --- |
| Vercel | Hébergement de l'application, journaux techniques | Région de Francfort (fra1) pour les fonctions | Vercel publie un DPA ([Vercel DPA](https://vercel.com/legal/dpa)). Les fonctions peuvent être épinglées à Francfort, mais Vercel indique que certaines données d'exploitation, de contrôle et de support peuvent être traitées aux États-Unis ou dans d'autres pays ; les transferts sont encadrés par les clauses contractuelles types et, lorsque pertinent, le Data Privacy Framework. Le journal Vercel du plan Hobby est conservé une heure (les plans payants ont des durées différentes). |
| Neon | Hébergement de la base de données | Région de Francfort (AWS `eu-central-1`) | Neon documente la conformité RGPD et met à disposition un accord de traitement des données dans son cadre contractuel. Le projet est déployé dans une région AWS de l'Union européenne, mais le support, le plan de contrôle et certains sous-traitants peuvent impliquer des traitements hors de l'Union européenne ; les transferts et les sous-traitants doivent être vérifiés dans le DPA et la liste à jour de Neon avant la mise en production. |

## Traitements

| N° | Traitement | Finalité | Données | Personnes concernées | Base légale | Durée de conservation | Emplacement |
| --- | --- | --- | --- | --- | --- | --- | --- |
| T1 | Comptes des joueurs | Permettre l'accès au jeu | Nom, adresse électronique, empreinte du mot de passe, date d'inscription | Joueurs | Exécution du contrat (conditions d'utilisation du jeu) | Jusqu'à la suppression du compte | `identity.user`, `identity.account` |
| T2 | Sessions | Maintenir la connexion ; limiter les tentatives de connexion | Adresse IP, navigateur, dates de la session | Joueurs | Exécution du contrat ; intérêt légitime (sécurité) | Jusqu'à l'expiration de la session, ou la suppression du compte | `identity.session` |
| T3 | Activité de jeu | Faire fonctionner le Village, le Donjon, le Marché et le Classement | Identifiant, nom du joueur, nom du village, actions de jeu | Joueurs | Exécution du contrat | Jusqu'à la suppression du compte ; ensuite, identifiant pseudonymisé et noms remplacés (ADR 0008) | `platform.events`, `platform.outbox`, `ranking`, `dungeon`, `market` |
| T4 | Messagerie de la Taverne | Permettre aux joueurs de discuter | Contenu des messages, auteur, date | Joueurs | Exécution du contrat | Trente jours, ou jusqu'à la suppression du compte | `tavern.messages` |
| T5 | Présence dans la Taverne | Indiquer les joueurs présents | Identifiant, nom, date du dernier signal | Joueurs | Exécution du contrat | Deux minutes après le dernier signal | `tavern.presence` |
| T6 | Registre des effacements | Démontrer la réalisation des effacements | Date de l'effacement, nombre d'événements réécrits ; aucune donnée sur le joueur | Aucune personne identifiable | Obligation légale (responsabilité, article 5) | Illimitée | `platform.erasures` |
| T7 | Journaux techniques | Diagnostiquer les erreurs, assurer la sécurité | Adresse IP, adresses des requêtes, messages d'erreur | Joueurs, visiteurs | Intérêt légitime (sécurité, maintenance) | Une heure sur le plan Vercel Hobby | Vercel |

## Droits des personnes

| Droit | Mise en œuvre |
| --- | --- |
| Accès et portabilité (articles 15 et 20) | Page « Mes données » : export JSON de toutes les données du joueur |
| Effacement (article 17) | Page « Mes données » : suppression du compte, effective dans tous les modules |
| Rectification (article 16) | Non mis en œuvre : le nom d'un joueur ne peut pas encore être modifié |

## Pour approfondir

Mettre en œuvre la rectification du nom du joueur dans la page « Mes données »,
avec propagation vers les données personnelles copiées dans les modèles de
lecture et les nouveaux événements. Pour l'historique déjà enregistré, définir
une stratégie compatible avec l'ADR 0008 (réécriture des seuls champs de nom)
et garantir que la modification ne change pas les données des autres joueurs.