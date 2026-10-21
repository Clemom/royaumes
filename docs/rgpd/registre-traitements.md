# Registre des traitements de données personnelles

Ce registre, prévu par l'article 30 du RGPD, recense les traitements de données personnelles
réalisés par Royaumes. Il est tenu à jour à chaque évolution du jeu qui ajoute, modifie ou
supprime une donnée personnelle, dans le même commit que cette évolution.

- Responsable du traitement : Clemom (éditeur du projet), contact via le dépôt
  public [Clemom/royaumes](https://github.com/Clemom/royaumes).
- Date de dernière mise à jour : 2026-10-21.

## Sous-traitants

| Sous-traitant | Rôle | Localisation des données | Garanties à vérifier |
| --- | --- | --- | --- |
| Vercel | Hébergement de l'application, journaux techniques | Région de Francfort (fra1) pour les fonctions | Vercel publie un DPA ([Vercel DPA](https://vercel.com/legal/dpa)). Les fonctions peuvent être épinglées à Francfort, mais Vercel indique que certaines données d'exploitation, de contrôle et de support peuvent être traitées aux États-Unis ou dans d'autres pays ; les transferts sont encadrés par les clauses contractuelles types et, lorsque pertinent, le Data Privacy Framework. Le journal Vercel du plan Hobby est conservé une heure (les plans payants ont des durées différentes). |
| Neon | Hébergement de la base de données | Région de Francfort (AWS `eu-central-1`) | Neon documente la conformité RGPD et met à disposition un accord de traitement des données dans son cadre contractuel. Le projet est déployé dans une région AWS de l'Union européenne, mais le support, le plan de contrôle et certains sous-traitants peuvent impliquer des traitements hors de l'Union européenne ; les transferts et les sous-traitants doivent être vérifiés dans le DPA et la liste à jour de Neon avant la mise en production. |

## Traitements

| N° | Traitement | Finalité | Données | Personnes concernées | Base légale | Durée de conservation | Emplacement |
| --- | --- | --- | --- | --- | --- | --- | --- |
| T1 | Comptes des joueurs | Permettre l'accès au jeu et gérer les vérifications temporaires liées à l'authentification | Nom, adresse électronique, empreinte du mot de passe, date d'inscription ; identifiant, valeur et dates des vérifications temporaires | Joueurs, personnes concernées par une vérification | Exécution du contrat (conditions d'utilisation du jeu) | Comptes : jusqu'à la suppression du compte ; vérifications temporaires : durée de conservation effective à vérifier | `identity.user`, `identity.account`, `identity.verification` |
| T2 | Sessions et limitation des tentatives | Maintenir la connexion ; limiter les tentatives de connexion | Adresse IP, navigateur, dates de la session ; clé associée à une route et une adresse IP, nombre de tentatives et date de dernière tentative | Joueurs, visiteurs | Exécution du contrat ; intérêt légitime (sécurité) | Sessions : jusqu'à l'expiration ou la suppression du compte, purge des sessions expirées restant à mettre en œuvre ; compteurs de limitation : durée de conservation effective à vérifier | `identity.session`, `identity.rate_limit` |
| T3 | Activité de jeu | Faire fonctionner le Village, le Donjon, le Marché, le Classement et les Chroniques | Identifiant et nom du joueur, nom du village, actions de jeu, distinctions obtenues et dates d'obtention, participations aux expéditions | Joueurs | Exécution du contrat | Jusqu'à la suppression du compte pour les données personnelles ; les distinctions sont effacées et les événements historiques sont anonymisés ou pseudonymisés selon l'ADR 0008 | `platform.events`, `platform.outbox`, `ranking`, `dungeon`, `market`, `chronicle.achievements`, `chronicle.game_players` |
| T4 | Messagerie de la Taverne | Permettre aux joueurs de discuter | Contenu des messages, auteur, date | Joueurs | Exécution du contrat | Trente jours, ou jusqu'à la suppression du compte | `tavern.messages` |
| T5 | Présence dans la Taverne | Indiquer les joueurs présents | Identifiant, nom, date du dernier signal | Joueurs | Exécution du contrat | Deux minutes après le dernier signal | `tavern.presence` |
| T6 | Registre des effacements | Démontrer la réalisation des effacements | Date de l'effacement, nombre d'événements réécrits ; aucune donnée sur le joueur | Aucune personne identifiable | Obligation légale (responsabilité, article 5) | Illimitée | `platform.erasures` |
| T7 | Journaux techniques | Diagnostiquer les erreurs, assurer la sécurité | Adresse IP, adresses des requêtes, messages d'erreur | Joueurs, visiteurs | Intérêt légitime (sécurité, maintenance) | Une heure sur le plan Vercel Hobby | Vercel |

## Historique des mises à jour

| Étape | Modification |
| --- | --- |
| TD10 | Création du registre des traitements dans le cadre de la revue RGPD. Les traitements des comptes, sessions, données métier, messages, présence, effacements et journaux techniques sont recensés. |
| Après le TD11 | Complément du traitement T1 avec la table `identity.verification`, relevée comme manquante lors de la revue initiale. |
| Après le TD11 | Complément du traitement T2 avec la table `identity.rate_limit`, utilisée pour la limitation partagée des tentatives d'authentification introduite au TD11. |
| TD final | Ajout des Chroniques au traitement T3 : distinctions, participations aux expéditions, export et effacement des données personnelles. |

Ces modifications complètent le registre existant. Elles ne signifient pas que les tables ajoutées au registre ont été créées à ce moment-là : elles distinguent les évolutions techniques du projet des corrections apportées à sa documentation.

Les durées de conservation et les points restant à vérifier sont conservés tels quels tant qu'une nouvelle vérification ne justifie pas leur actualisation.

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