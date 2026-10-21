# Bilan technique de Royaumes

- Date : 21 octobre 2026
- Version examinée : branche `main`, commit `8595667`, après la réalisation du TD11
- Auteur : équipe du projet

Ce bilan présente l'état technique de Royaumes au terme des TD0 à TD11. Il s'appuie sur le code, les décisions d'architecture, les tests, les mesures de performance, le registre de dette technique et les revues de sécurité et de conformité. Il s'adresse notamment à une personne amenée à reprendre ou faire évoluer le projet.

## 1. Le système livré

| Élément | Valeur |
| --- | --- |
| Modules | 6 (`realm`, `dungeon`, `market`, `ranking`, `tavern`, `system`) |
| Briques de la plateforme | 9 (`auth`, `cron`, `db`, `event-store`, `http`, `outbox`, `privacy`, `projection`, `realtime`) |
| Lignes de code hors tests | Environ 8 150, estimation à confirmer par comptage |
| Tests automatisés | 232 tests répartis dans 33 fichiers |
| Commits | 91 sur `main` au moment de l'audit |
| Hébergement | Vercel, région de Francfort |
| Base de données | PGlite en local et pour les tests ; Neon PostgreSQL en production |

| Module | Stockage | Lignes de code hors tests, estimées |
| --- | --- | --- |
| `realm` | Event Sourcing | 1 090 |
| `dungeon` | Event Sourcing et projection des expéditions ouvertes | 1 865 |
| `market` | Event Sourcing, projection des offres et saga | 1 153 |
| `ranking` | Projection du journal | 416 |
| `tavern` | Tables ordinaires | 604 |
| `system` | Aucun stockage métier | 64 |
| `services/village` | Service autonome préparé, non déployé | 82 |

La plateforme rassemble les fonctions techniques transversales : authentification, persistance, communication temps réel, journal d'événements, projections, boîte d'envoi et gestion des données personnelles.

Les modules métier possèdent leurs propres règles et responsabilités. Leur séparation est contrôlée automatiquement par `dependency-cruiser`.

Le Village dispose désormais de deux modes d'exécution : directement dans le monolithe ou au sein d'un service autonome. Ce dernier mode est préparé et testé, mais n'est pas déployé en production.

## 2. Les décisions d'architecture

| ADR | Décision | Mise à l'épreuve | Bilan |
| --- | --- | --- | --- |
| 0001 | Monolithe modulaire | Ajout progressif des modules et extraction du Village au TD11. | Décision maintenue. Les frontières permettent l'évolution indépendante des modules, au prix de règles d'encapsulation strictes. |
| 0002 | Event Sourcing pour le Village | Persistance, reconstruction, projections, effacement RGPD et relais du Village extrait. | Décision maintenue. Le journal facilite la reconstruction et la diffusion des événements, mais sa croissance augmente certains coûts de traitement. |
| 0003 | Server-Sent Events pour le temps réel | Mise à jour du Village, du Donjon, du Classement, du Marché et de la Taverne. | Solution adaptée au projet. La consommation de ressources augmente toutefois avec le nombre de connexions ouvertes. |
| 0004 | Manches simultanées et échéances paresseuses | Résolution des manches du Donjon, joueurs absents et échéances. | Les règles sont vérifiées par les tests. Certaines transitions sont matérialisées à la prochaine lecture ou commande. |
| 0005 | Intelligence artificielle déterministe | Compagnons, stratégies de monstres, niveaux de difficulté et simulations. | L'IA fonctionne sans service externe et peut être testée de manière reproductible. |
| 0006 | CQRS et projections | Introduction des projections au TD8 et optimisation de leur rattrapage au TD11. | Les lectures utilisent des modèles dédiés. Une projection à jour évite désormais une transaction inutile. La reconstruction reste coûteuse lorsque le journal grandit. |
| 0007 | Saga orchestrée et boîte d'envoi transactionnelle | Échanges du Marché, acceptations concurrentes, messages répétés et reprise après panne. | La cohérence des échanges est protégée par les transactions locales, l'idempotence et les reprises. Les états intermédiaires et messages abandonnés nécessitent une surveillance. |
| 0008 | Stockage classique pour la Taverne et effacement ciblé des données personnelles | Conservation limitée des messages, export et suppression de compte. | Le choix évite d'intégrer les messages éphémères au journal d'événements. L'effacement doit néanmoins couvrir plusieurs modèles de stockage. |
| 0009 | Extraction du Village en service autonome | Six tests de contrat, notamment pour le relais d'événements, le Marché, les pannes et les données personnelles. | Les frontières du module sont démontrées. Le service reste volontairement non déployé, avec trois dettes techniques à traiter avant son exploitation autonome. |

Les neuf ADR sont présents dans `docs/adr/` et référencés depuis le registre des décisions.

## 3. La qualité

| Caractéristique | Indicateur | Valeur ou constat | Appréciation |
| --- | --- | --- | --- |
| Adéquation fonctionnelle | Tests automatisés | 232 tests réussis sur 232, répartis dans 33 fichiers. Couverture de 75 % des lignes (1 176 sur 1 568), 73,41 % des instructions, 64,20 % des branches et 70,05 % des fonctions. | Les principales règles métier, les API et les interactions entre modules disposent de tests automatisés. La couverture des lignes atteint le niveau du projet de référence. Les parcours complets de l'interface ne sont toutefois pas couverts par des tests automatiques. |
| Efficacité des performances | Débit, p99 et erreurs | 5 scénarios conformes au budget après optimisation ; 0 erreur | La dernière mesure respecte le budget fixé. Les conditions de comparaison entre les mesures avant et après doivent toutefois être interprétées avec prudence. |
| Fiabilité | Tests de concurrence, de reprise et d'idempotence | Tests réussis ; gestion des messages abandonnés présente | Les mécanismes essentiels de cohérence sont vérifiés. Le service Village extrait reste limité à un usage de démonstration. |
| Sécurité | Revues d'authentification, du Donjon et du Marché | Authentification : 11/16 conformes ; Donjon : 14/14 ; Marché : 10/10 | Les protections principales sont présentes, mais cinq exigences de sécurité de l'authentification restent déclarées non conformes. |
| Maintenabilité | Vérifications automatiques et fonctions d'aptitude | `pnpm verify` réussi ; règles d'architecture et tests présents | Les frontières entre modules sont contrôlées. L'absence de tests automatiques de l'interface constitue une limite. |
| Flexibilité | Changement de base et extraction de module | PGlite/Neon ; six tests de contrat du Village extrait | Les choix techniques permettent plusieurs modes d'exécution sans modifier les consommateurs du module. |

### 3.1 Résultats des tests automatisés

La dernière exécution communiquée de `pnpm verify` s'est terminée avec :

- **33 fichiers de tests réussis ;**
- **232 tests réussis sur 232 ;**
- aucune erreur de vérification signalée lors de cette exécution.

Cette commande réunit Biome, TypeScript, les règles d'architecture et Vitest.

La couverture a été mesurée avec pnpm test:coverage. Elle atteint 75 % des lignes de code, soit 1 176 lignes couvertes sur 1 568. Les 232 tests ont été exécutés avec succès.

### 3.2 Performance avant et après optimisation

Le budget défini dans `perf/budget.json` impose :

- 20 connexions simultanées ;
- un p99 inférieur ou égal à 500 millisecondes ;
- aucune erreur.

Les deux fichiers `perf/avant.json` et `perf/apres.json` sont désormais présents et versionnés.

| Scénario | Débit avant (req/s) | Débit après (req/s) | p99 avant | p99 après |
| --- | ---: | ---: | ---: | ---: |
| Village | 102 | 510 | 282 ms | 62 ms |
| Expéditions ouvertes | 57 | 376 | 510 ms | 73 ms |
| Classement | 49 | 305 | 647 ms | 86 ms |
| Marché | 46 | 265 | 552 ms | 86 ms |
| Taverne | 88 | 425 | 547 ms | 69 ms |

Aucune erreur n'a été enregistrée dans ces deux fichiers.

**Résultat :** le budget est respecté pour les cinq scénarios de la mesure après optimisation. Avant optimisation, quatre scénarios sur cinq dépassaient le seuil de 500 ms.

L'optimisation réalisée dans `src/platform/projection/projection.ts` évite d'ouvrir une transaction lorsqu'une projection est déjà à jour. Son comportement est également protégé par un test automatisé.

**Limite d'interprétation :** les améliorations observées concernent aussi le Village et la Taverne, qui n'utilisent pas les projections optimisées. Les conditions d'exécution ont donc vraisemblablement influencé la comparaison. Les mesures prouvent que le dernier test respecte le budget, mais ne permettent pas d'attribuer l'intégralité des gains observés à cette seule modification du code.

Des mesures supplémentaires réalisées dans des conditions strictement identiques permettraient de quantifier plus précisément son effet.

## 4. La dette technique

Le registre `docs/qualite/dette-technique.md` contient dix entrées numérotées DT-001 à DT-010.

| Indicateur | Valeur |
| --- | --- |
| Dettes recensées | 10 |
| Dettes remboursées | 7, de DT-001 à DT-007 |
| Dettes ouvertes | 3, de DT-008 à DT-010 |

Les sept premières dettes ont été remboursées au cours des TD successifs, notamment grâce à l'authentification réelle, à l'Event Sourcing, aux projections et aux améliorations apportées au TD11.

Les trois dettes ouvertes concernent le service Village extrait :

- **DT-008 :** migrations autonomes du service à préparer.
- **DT-009 :** pagination du flux d'événements publié à mettre en place.
- **DT-010 :** distribution périodique de la boîte d'envoi du service à prévoir.

Ces dettes n'empêchent pas le fonctionnement du monolithe actuellement déployé, mais doivent être traitées avant une mise en production autonome du service Village.

Les revues de sécurité et de conformité identifient également des actions correctives qui ne figurent pas encore toutes dans ce registre.

Conformément au TD11, ces actions doivent être ajoutées au suivi de dette avec une échéance. Le décompte de dix entrées reflète donc l'état actuel du registre, avant cette consolidation.

## 5. Les revues

| Revue | Exigences | Conformes | Autres statuts | Actions ouvertes |
| --- | ---: | ---: | --- | --- |
| Sécurité de l'authentification | 16 | 11 | 5 non conformes | Corriger ou réévaluer S3, S5, S7, S9 et S14. |
| Sécurité du Donjon | 14 | 14 | 0 | Aucune action corrective recensée. |
| Sécurité du Marché | 10 | 10 | 0 | Aucune action corrective recensée. |
| Conformité RGPD | 10 | 5 | 2 non conformes, 3 à vérifier | Réévaluer R1, traiter R8 et poursuivre les vérifications R4, R9 et R10. |

### 5.1 Authentification

La revue identifie cinq non-conformités :

- **S3 :** possibilité de désactiver la limitation des tentatives en dehors de Vercel, sans restriction explicite au développement.
- **S5 :** politique `SameSite=Lax`, qui ne satisfait pas l'exigence stricte formulée dans la revue.
- **S7 :** absence du secret de signature bloquante uniquement sur Vercel, et non dans tous les environnements de production.
- **S9 :** réponse d'inscription susceptible de révéler qu'une adresse est déjà enregistrée.
- **S14 :** invalidation effective de la session à la déconnexion insuffisamment démontrée par les tests.

Le stockage partagé des compteurs dans `identity.rate_limit` est néanmoins bien présent depuis le TD11, ce qui a permis de rembourser DT-004.

### 5.2 Donjon et Marché

Les deux revues ne signalent aucune exigence non conforme.

Les contrôles portent notamment sur la confidentialité des informations du Donjon, la séparation des joueurs, la protection des canaux, l'intégrité des échanges du Marché et l'idempotence des messages.

Les tests existants doivent être conservés lors des évolutions futures.

### 5.3 RGPD

La revue RGPD actuellement versionnée compte cinq exigences conformes, deux non conformes et trois à vérifier.

L'exigence **R1**, encore indiquée comme non conforme dans la revue, repose sur l'absence de `identity.verification` dans le registre des traitements. Cette table a depuis été ajoutée au registre, de même que `identity.rate_limit`. Il convient donc de **réévaluer R1 et de mettre à jour le statut et la synthèse de la revue**.

L'exigence **R8**, relative à la purge des sessions expirées, reste non conforme.

Les exigences **R4, R9 et R10** nécessitent des vérifications supplémentaires portant sur l'effacement réel des comptes, les journaux techniques et les éventuels liens résiduels après suppression.

Ces actions doivent être conservées dans un suivi explicite, avec leurs échéances et leurs preuves de vérification.

## 6. Risques et recommandations

| N° | Risque | Signe avant-coureur | Recommandation |
| --- | --- | --- | --- |
| 1 | Augmentation de la charge des flux temps réel | Hausse du nombre de connexions, des temps de réponse ou des erreurs. | Mesurer la charge des flux SSE et prévoir une stratégie d'évolution lorsque leur volume augmente. |
| 2 | Croissance du journal d'événements | Rattrapage des projections, reconstruction et effacement des comptes de plus en plus longs. | Surveiller la taille du journal et les durées de traitement, puis étudier une stratégie d'archivage ou d'instantanés si nécessaire. |
| 3 | Régression non détectée de l'interface | Tests API réussis malgré un dysfonctionnement dans le navigateur. | Ajouter progressivement des tests de bout en bout sur les parcours essentiels : connexion, Village, Donjon et Marché. |

## 7. Conclusion

Royaumes dispose d'une architecture modulaire cohérente, appuyée par neuf décisions d'architecture, des règles de dépendances automatisées et 232 tests réussis.

Les fonctionnalités développées du TD0 au TD11 sont présentes. Les mécanismes de persistance, de temps réel, de projection, de saga et de gestion des données personnelles ont été éprouvés par des tests. L'extraction du Village démontre également que les frontières du monolithe permettent une exécution séparée du module.

Le dernier test de charge respecte le budget défini : cinq scénarios conformes au p99, avec vingt connexions simultanées et aucune erreur. Les différences entre les mesures avant et après doivent néanmoins être interprétées avec prudence.

Le projet peut être repris et évoluer à condition de conserver les vérifications automatisées, de suivre les limites techniques documentées et de traiter les actions ouvertes des revues de sécurité et RGPD.

Les prochaines priorités sont la consolidation du suivi de dette, la confirmation de la couverture du code, les vérifications finales en production et l'amélioration de la couverture de l'interface.

Enfin, le tag annoté `td11-fin` existe sur GitHub, mais pointe vers le commit `db708aa`, antérieur aux dernières corrections documentaires et à l'enregistrement de `perf/avant.json`. La branche `main` représente donc un état plus récent que cette étiquette. Ce décalage doit être pris en compte lors de la livraison finale.

## Usage de l'IA générative

Un assistant IA a été utilisé pour accompagner la rédaction et la structuration du bilan, comparer les documents du cours avec le dépôt et vérifier la cohérence des informations présentées.

Les 232 tests ont été exécutés avec succès par le développeur. La couverture du code a été vérifiée par l'exécution de pnpm test:coverage, qui confirme 75 % des lignes couvertes et 232 tests réussis. Les performances présentées correspondent aux résultats enregistrés dans `perf/avant.json` et `perf/apres.json`.

Les limites de vérification et les points nécessitant une confirmation supplémentaire sont signalés dans les sections concernées.