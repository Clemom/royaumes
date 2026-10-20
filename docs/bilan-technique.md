# Bilan technique de Royaumes

- Date : 2026-10-20
- Version examinée : état final du projet (`td11-fin`)
- Auteur : équipe du projet

Ce bilan dresse l'état technique du projet au terme de son développement, à partir de ses
décisions d'architecture, de ses indicateurs de qualité, de sa dette technique et de
ses revues. Il s'adresse à la personne qui reprendrait le projet.

## 1. Le système livré

| Élément | Valeur |
| --- | --- |
| Modules métier | 6 (`realm`, `dungeon`, `market`, `ranking`, `tavern`, `system`) |
| Briques de la plateforme | 9 (`auth`, `cron`, `db`, `event-store`, `http`, `outbox`, `privacy`, `projection`, `realtime`) |
| Lignes de code, hors tests | Environ 8 150 |
| Fichiers de test, nombre de tests | 33 fichiers, 232 tests |
| Commits | 80 |
| Hébergement | Vercel (Francfort), base Neon (Francfort) |

| Module | Stockage | Lignes, hors tests |
| --- | --- | --- |
| `realm` | Event Sourcing | Environ 1 090 |
| `dungeon` | Event Sourcing, projection des expéditions ouvertes | 1 865 |
| `market` | Event Sourcing, projection des offres, saga | 1 153 |
| `ranking` | Projection du journal | 416 |
| `tavern` | Tables ordinaires | 604 |
| `system` | Aucun | 64 |
| `services/village` | Service autonome préparé, non déployé | Environ 82 |

Les neuf briques de la plateforme totalisent environ 1 455 lignes hors tests. Le Village
compte davantage que les autres modules car `realm` contient à la fois l'exécution locale
et la façade distante ; le service autonome est volontairement réduit à son assemblage
et à ses routes.

## 2. Les décisions d'architecture

| ADR | Décision | Mise à l'épreuve | Bilan |
| --- | --- | --- | --- |
| 0001 | Monolithe modulaire | Les règles de dependency-cruiser ont été appliquées pendant l'ajout des modules, puis l'extraction du Village a réellement exécuté la frontière hors processus. | Elle a tenu : le monolithe reste déployable seul et le Village est extractible. Prix : une racine de composition stricte et des entrées publiques à maintenir. |
| 0002 | Event Sourcing pour le Village | Les projections du TD8, l'export et l'effacement du TD10, puis le relais du journal du Village au TD11 ont relu et réécrit le flux. | Elle a tenu et a permis la reconstruction, le temps réel et l'extraction. Prix : reconstruction proportionnelle à l'historique et réécriture ciblée pour les données personnelles. |
| 0003 | Server-Sent Events alimentés par le journal | Les canaux du Village, du Donjon et du Classement ont été testés pour l'accès, la discrétion et la reprise par lecture du journal. | Elle a tenu. Prix : un flux par connexion et une charge qui croît avec le nombre de joueurs ; la charge n'est pas encore testée à grande échelle. |
| 0004 | Manches simultanées et échéances paresseuses | Les joueurs absents, les échéances et les ouvertures automatiques ont été exercés par les tests du Donjon. | Elle a tenu sans tâche de fond. Prix : une manche peut rester visible dans un état intermédiaire jusqu'à une prochaine lecture ou commande. |
| 0005 | Intelligence artificielle déterministe | Les stratégies des compagnons ont été exécutées dans la résolution des manches et contrôlées par les tests de confidentialité et de reproductibilité du Donjon. | Elle a tenu : l'IA ne révèle pas d'information supplémentaire et ne dépend pas d'un service externe. Prix : les stratégies restent couplées au modèle de résolution du Donjon. |
| 0006 | CQRS et projections rattrapées à la lecture | Le TD8 a remplacé le recalcul des expéditions ouvertes ; les mesures de performance avant/après ont éprouvé le coût des lectures et le rattrapage. | Elle a tenu et a amélioré le coût des lectures. Prix : positions, rattrapage et cohérence différée doivent être observés ; la reconstruction reste coûteuse si le journal grossit. |
| 0007 | Saga orchestrée et boîte d'envoi | La panne partielle de la partie 4, les acceptations concurrentes, les doublons et les messages abandonnés ont été testés. | Elle a tenu : aucune ressource n'est créée ni perdue et les reprises sont idempotentes. Prix : états intermédiaires, latence dépendante des déclenchements et gestion des lettres mortes. |
| 0008 | Taverne sans Event Sourcing, réécriture ciblée du journal | L'ajout de la Taverne, sa conservation de trente jours, la présence et l'effacement RGPD ont éprouvé la séparation entre tables ordinaires et journal. | Elle a tenu et évite d'alourdir le journal avec les messages éphémères. Prix : deux modèles de persistance et une procédure d'effacement qui doit traiter les deux. |
| 0009 | Extraction du Village, préparée mais non déployée | Les six tests de contrat ont exercé la passerelle, le relais, l'authentification, la saga, la reprise après panne et l'export/effacement. | Elle a tenu comme preuve de frontière, sans modifier la production. Prix : deux chemins d'exécution et trois dettes ouvertes avant tout déploiement du service. |

## 3. La qualité

| Caractéristique | Indicateur | Valeur | Appréciation |
| --- | --- | --- | --- |
| Adéquation fonctionnelle | Tests réussis ; couverture des domaines | 232/232 tests réussis ; couverture de 75 % des lignes | Le comportement livré est largement couvert et les parcours principaux sont validés. Les 25 % restants justifient de conserver les tests ciblés lors des évolutions. |
| Efficacité des performances | Débit et p99 des lectures ; respect du budget | Village 374 req/s, p99 132 ms ; expéditions 434 req/s, p99 72 ms ; classement 346 req/s, p99 119 ms ; marché 220 req/s, p99 165 ms ; Taverne 347 req/s, p99 105 ms ; 0 erreur | Tous les p99 restent sous la limite de 500 ms et le nombre maximal de connexions est de 20. Le budget est respecté, mais la charge croissante des flux temps réel doit encore être surveillée. |
| Fiabilité | Tests de concurrence, de reprise et d'idempotence ; messages abandonnés | Tests de concurrence, reprise et idempotence réussis ; 3 entrées ouvertes liées au service Village | Les garanties du journal et de la boîte d'envoi tiennent. Les dettes de migration, pagination du flux et distribution autonome restent à rembourser avant production du service. |
| Sécurité | Exigences des revues de sécurité | Authentification : 9 conformes, 6 non conformes ; Donjon : 14/14 conformes ; Marché : 10/10 conformes | Les domaines du jeu et les échanges sont correctement protégés. Les écarts d'authentification (limitation désactivable, cookies, secret et erreurs d'inscription/déconnexion) sont des actions prioritaires. |
| Maintenabilité | Règles d'architecture ; fonctions d'aptitude ; couverture | Règles vérifiées par `pnpm verify` ; 75 % de lignes couvertes ; fonctions d'aptitude présentes | Les frontières et les invariants sont lisibles et contrôlés. L'interface web est le point faible : aucun test automatique ne vérifie son comportement, contrairement aux API et au domaine. |
| Flexibilité | Extraction d'un module ; changement de base entre local et production | Extraction du Village démontrée par six contrats ; PGlite en local/test et Neon en production | La substitution de la base et l'exécution distante sont possibles sans changer les consommateurs. Le mode distant reste préparatoire, et son exploitation n'est pas encore industrialisée. |

## 4. La dette technique

| Indicateur | Valeur |
| --- | --- |
| Entrées consignées | 10 |
| Entrées remboursées, dont à l'échéance prévue | 7, toutes à l'échéance prévue |
| Entrées ouvertes | 3 (`DT-008`, `DT-009`, `DT-010`), toutes liées au service Village non déployé |

Analyse :

Les sept premières entrées ont été remboursées, pour la plupart au TD prévu. La dette
est donc pilotée lorsqu'elle est décrite, reliée à une échéance et vérifiée par un test
ou une mesure. Les trois entrées restantes ne signalent pas une défaillance du chemin
de production : elles matérialisent les conditions d'exploitation manquantes du
service extrait. Elles doivent toutefois être traitées avant son déploiement.

Les actions encore ouvertes des revues doivent être ajoutées à ce registre, notamment
les corrections d'authentification et les actions RGPD. Une action découverte seulement
au moment d'une revue, mais absente du registre et sans échéance, serait un signe de
pilotage insuffisant et risquerait d'être oubliée.

## 5. Les revues

| Revue | Exigences | Conformes | Non conformes ou en risque accepté | Actions ouvertes |
| --- | --- | --- | --- | --- |
| Sécurité de l'authentification | 16 | 9 | 6 non conformes, 1 exigence restante conforme dans la synthèse | Limiter la désactivation du rate limiting, imposer secret et HTTPS, générique d'inscription, politique de cookie, échec de déconnexion et test de réutilisation du cookie ; à inscrire dans la dette |
| Sécurité du Donjon | 14 | 14 | 0 | Aucune action corrective ; conserver les tests et rejouer la revue à chaque nouvelle route ou canal |
| Sécurité du Marché | 10 | 10 | 0 | Aucune action corrective ; conserver les tests et rejouer la revue à chaque évolution de la saga, des messages ou du temps réel |
| Conformité au RGPD | 10 | 6 | 2 non conformes, 2 à vérifier | Ajouter `identity.verification` au registre, purger les sessions expirées, vérifier l'effacement réel et auditer les journaux et la boîte d'envoi ; à inscrire dans la dette |

Les actions correctives de l'authentification et du RGPD sont explicitement signalées
ici comme devant être ajoutées au registre de la dette : elles ne doivent pas rester
uniquement dans les comptes rendus de revue.

## 6. Risques et recommandations

| N° | Risque | Signe avant-coureur | Recommandation |
| --- | --- | --- | --- |
| 1 | La charge des flux temps réel croît avec le nombre de joueurs connectés et peut dépasser les ressources d'une instance. | Hausse du nombre de connexions ouvertes, du p99 SSE ou des erreurs lorsque le nombre de joueurs augmente. | Mettre en place une mesure de charge dédiée aux flux, définir un budget de connexions et étudier une diffusion partagée avant de dépasser ce budget. |
| 2 | La croissance du journal allonge le rattrapage des projections et l'effacement d'un compte. | Temps de reconstruction ou d'effacement qui augmente avec l'historique, dépasse le délai d'une fonction ou crée des retards visibles. | Mesurer la taille et l'âge du journal, paginer les traitements, puis prévoir archivage ou instantanés sans casser l'Event Sourcing ni l'effacement ciblé. |
| 3 | L'interface web peut régresser sans être détectée par les tests automatiques. | Une API reste verte alors qu'un parcours navigateur, une page ou un abonnement temps réel ne fonctionne plus. | Ajouter des tests de parcours et de rendu pour les écrans critiques, au minimum connexion, Village, Marché, Donjon et temps réel, dans la construction. |

## 7. Conclusion

Le projet peut être repris et évoluer sans régression si les frontières vérifiées par
`pnpm verify`, les 232 tests et les contrats du Village restent obligatoires à chaque
construction. L'architecture a tenu ses principales mises à l'épreuve, et les mesures
de performance restent sous le budget ; elle n'est donc pas seulement documentaire.

La reprise doit néanmoins traiter les actions ouvertes des revues, ajouter ces actions
au registre de dette, et surveiller le journal et les flux temps réel. Le service Village
ne devra être déployé qu'après remboursement de ses trois dettes et mise en place de
l'observabilité, des migrations et des procédures de reprise correspondantes. Enfin,
la couverture de l'interface devra compléter la couverture actuelle du serveur.

## Usage de l'IA générative

Un assistant IA a été utilisé pour structurer et rédiger ce bilan à partir du code final,
des ADR, des revues de sécurité et RGPD, du registre de dette et des mesures de
performance. La couverture a été vérifiée par `pnpm test:coverage` : 232 tests réussis
et 75 % de lignes couvertes ; les autres chiffres ont été confrontés aux artefacts et
aux fichiers du dépôt.
