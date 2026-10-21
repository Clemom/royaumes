# Architecture de Royaumes

Ce document décrit la structure du système selon le modèle C4, du plus général au plus détaillé. Les raisons des choix qui y apparaissent sont consignées dans les [décisions d'architecture](adr/README.md).

Les diagrammes sont rédigés en Mermaid : ils sont versionnés avec le code, et mis à jour dans le même commit que la modification qu'ils décrivent.

## Niveau 1 - Contexte

```mermaid
flowchart TB
  joueur["Joueur<br/>[Personne]<br/>Joue depuis un navigateur,<br/>sur ordinateur ou sur téléphone"]
  royaumes["Royaumes<br/>[Système logiciel]<br/>Jeu web multijoueur : village, donjon,<br/>classement, marché, taverne et chroniques"]
  joueur -->|"Gère son village, joue avec les autres joueurs,<br/>reçoit les changements et les succès en direct (HTTPS)"| royaumes
```

Royaumes ne dépend d'aucun système externe : il n'envoie aucun courrier électronique et ne fait appel à aucun service de paiement ni à aucun fournisseur d'identité. Les comptes des joueurs sont gérés par le système lui-même.

## Niveau 2 - Conteneurs

```mermaid
flowchart TB
  joueur["Joueur<br/>[Personne]"]
  subgraph royaumes["Système Royaumes"]
    web["Interface web<br/>[Conteneur : React, dans le navigateur]<br/>Pages du jeu et page de connexion"]
    serveur["Application serveur<br/>[Conteneur : Next.js et Hono, fonctions Vercel, Francfort]<br/>Rendu des pages, API JSON,<br/>authentification, flux temps réel"]
    base[("Base de données<br/>[Conteneur : PostgreSQL, Neon, Francfort]<br/>Schéma platform : journal, points de reprise,<br/>boîte d'envoi, registre des effacements<br/>Schéma identity : comptes et sessions<br/>Schémas ranking, dungeon, market et chronicle :<br/>modèles de lecture<br/>Schéma tavern : messages et présence")]
  end
  joueur -->|"Utilise"| web
  web -->|"Pages, appels de l'API avec le cookie de session<br/>(HTTPS, JSON)"| serveur
  serveur -->|"Événements des canaux autorisés<br/>(Server-Sent Events)"| web
  serveur -->|"Lit et écrit<br/>(SQL, connexion mutualisée)"| base
```

| Conteneur | Technologies | Responsabilités |
| --- | --- | --- |
| Interface web | React, composants des modules (`ui.tsx`) | Affichage des vues, envoi des actions du joueur, abonnement aux canaux temps réel |
| Application serveur | Next.js, Hono, Better Auth, Drizzle | Contrôle d'accès, règles du jeu, enregistrement des événements, diffusion des flux |
| Base de données | PostgreSQL (Neon en production, PGlite en local et en test) | Conservation du journal d'événements, des comptes et des sessions ; modèles de lecture des modules |

Le journal d'événements est la seule source de vérité des modules Village, Donjon et Marché. La Taverne n'enregistre pas d'événements : ses tables sont sa propre source de vérité (ADR 0008).

Les tables des schémas `ranking`, `dungeon`, `market` et `chronicle` sont des modèles de lecture, dérivés du journal par des projections. Le schéma `chronicle` conserve les distinctions obtenues et la liste temporaire des joueurs participant aux expéditions. Ces modèles peuvent être reconstruits à partir du journal, sous réserve de respecter les règles d'effacement des données personnelles.

L'interface web ne communique jamais directement avec la base : toute lecture et toute écriture passent par l'application serveur, qui applique le contrôle d'accès.

## Niveau 3 - Composants de l'application serveur

```mermaid
flowchart TB
  route["Route d'API<br/>[app/api/[[...route]]/route.ts]<br/>Transmet toute requête /api à Hono"]
  pages["Pages du jeu<br/>[app/(jeu)/]<br/>Vérifient la session avant tout rendu"]
  subgraph bootstrap["src/bootstrap"]
    server["server.ts<br/>Instance unique de l'application,<br/>de la base et de l'authentification"]
    createapi["create-api.ts<br/>Assemble plateforme et modules,<br/>protège les routes"]
  end
  subgraph modules["src/modules"]
    system["system<br/>Route de santé"]
    realm["realm<br/>Village : domaine, service,<br/>dépôt fondé sur le journal, API, canal,<br/>version distante (remote.ts)"]
    dungeon["dungeon<br/>Donjon : domaine et IA, service,<br/>dépôt fondé sur le journal, API, canal discret,<br/>projection des expéditions ouvertes"]
    ranking["ranking<br/>Classement : projection,<br/>lecture, API, canal global"]
    chronicle["chronicle<br/>Chroniques : règles des succès,<br/>projection, API, canal global discret"]
    market["market<br/>Marché : orchestrateur de la saga,<br/>projection des offres, API, canal global"]
    tavern["tavern<br/>Taverne : messages et présence<br/>en tables, API, canal à source propre"]
  end
  subgraph platform["src/platform"]
    auth["auth<br/>Port AuthPort,<br/>adaptateur Better Auth"]
    http["http<br/>Intergiciel requireUser,<br/>validation des requêtes,<br/>authentification entre services"]
    realtime["realtime<br/>Flux SSE, règles d'accès<br/>aux canaux, canaux discrets et globaux"]
    store["event-store<br/>Journal d'événements,<br/>concurrence optimiste"]
    projection["projection<br/>Rattrapage et reconstruction<br/>des projections"]
    outbox["outbox<br/>Boîte d'envoi, distributeur,<br/>boîte de réception"]
    privacy["privacy<br/>Export et effacement,<br/>registre des effacements"]
    cron["cron<br/>Route des tâches<br/>quotidiennes"]
    db["db<br/>Client Drizzle<br/>(Neon ou PGlite)"]
  end
  base[("Base de données")]
  route --> server
  pages --> server
  server --> createapi
  createapi --> system & realm & dungeon & ranking & chronicle & market & tavern & auth & http & realtime & projection & outbox & privacy & cron
  realm --> store & realtime & http & outbox
  market --> store & projection & realtime & http & outbox
  dungeon --> store & projection & realtime & http
  ranking --> projection & realtime & http
  chronicle --> projection & realtime & http
  tavern --> realtime & http & db
  realm & dungeon & market & ranking & chronicle & tavern --> privacy
  privacy --> store
  auth --> privacy
  realtime --> store & http
  projection --> db
  store --> outbox
  outbox --> db
  http --> auth
  auth --> db
  store --> db
  db --> base
```

Une flèche signifie « dépend de ». Le diagramme ne montre que les dépendances principales : `server.ts` crée également lui-même la base, le journal et l'adaptateur d'authentification, qu'il transmet à `create-api.ts`.

Les modules `dungeon`, `ranking` et `chronicle` écrivent dans leurs propres tables au sein des transactions fournies par le moteur des projections.

Le module `ranking` lit des événements du Village et du Donjon, mais n'importe aucun de leurs fichiers en dehors de leurs contrats : il ne dépend que de leur langage publié, c'est-à-dire du nom et des données de leurs événements, ainsi que du préfixe de leurs flux.

Le module `chronicle` suit la même approche. Il lit les événements du Village (`VillageFounded`, `BuildingUpgraded`) et du Donjon (`GameCreated`, `PlayerJoined`, `GameEnded`) sans appeler leurs services métier.

Une projection attribue une seule fois les distinctions au joueur concerné, dans les tables du schéma `chronicle`. Le point de reprise de cette projection est conservé par la plateforme.

Le canal SSE global `chronicle` annonce les événements sans transmettre leurs données ; l'interface consulte ensuite `GET /api/chronicle/achievements`, réservé au joueur connecté, et compare les distinctions pour afficher une notification. Le composant visuel partagé `src/ui/notification.tsx` reste indépendant du module métier (ADR 0010 et ADR 0011).

Le module `market` modifie les villages sans jamais importer le code du Village : il enregistre des messages dans la boîte d'envoi, que le distributeur remet aux gestionnaires du Village.

La seule dépendance directe porte sur les contrats du Village (`REALM_TOPICS`, `ResourceAmounts`), qui décrivent ces messages. Chaque transaction ne modifie que les données d'un seul module, et la boîte d'envoi (ADR 0007).

Chaque module déclare ses données personnelles à la brique `privacy`, au moyen d'un fichier `personal-data.ts` : il les exporte, désigne les champs personnels de ses événements, et les efface de ses tables.

La brique `privacy` contient la seule fonction du projet qui modifie un événement enregistré : la réécriture ciblée des champs personnels, lors de la suppression d'un compte (ADR 0008).

Pour les Chroniques, `personal-data.ts` exporte les distinctions et supprime les données des tables du module. Un point reste à contrôler avant la livraison : une reconstruction ultérieure de la projection ne doit pas recréer les distinctions d'un compte effacé à partir d'anciens événements.

Les règles suivantes sont vérifiées automatiquement par dependency-cruiser (`.dependency-cruiser.cjs`) à chaque exécution de `pnpm verify` :

- la plateforme ne dépend d'aucun module ;
- un module n'est accessible que par ses entrées publiques (`index.ts`, `contracts.ts`, `ui.tsx`) ;
- le domaine d'un module ne dépend d'aucune bibliothèque technique ;
- la couche application d'un module ne dépend pas de sa couche infrastructure ;
- le code destiné au navigateur ne dépend d'aucun code serveur ;
- aucune dépendance circulaire n'est admise ;
- un module n'importe jamais les tables de la plateforme : il passe par ses fonctions.

Deux fonctions d'aptitude complètent ces règles, sous la forme de tests (`src/bootstrap/architecture.test.ts`) : chaque table est rangée dans le schéma d'une brique de la plateforme ou d'un module, et chaque module qui conserve des données déclare ses données personnelles.

Seule la racine de composition connaît à la fois la plateforme et l'ensemble des modules.

## Parcours d'un succès - Diagramme de séquence

Exemple : le joueur améliore un bâtiment pour la première fois. Le Village publie l'événement ; les Chroniques en déduisent la distinction *Bâtisseur*. Le signal temps réel ne transporte pas les données de l'événement et ne remplace pas la consultation de l'API.

```mermaid
sequenceDiagram
  actor Joueur
  participant UI as Interface React
  participant Village as API Village
  participant Journal as Journal d'événements
  participant SSE as Canal SSE chronicle
  participant API as API Chroniques
  participant Projection as Projection Chroniques
  participant DB as PostgreSQL

  UI->>SSE: Ouvre GET /api/stream/chronicle
  Joueur->>UI: Améliore un bâtiment
  UI->>Village: POST /api/realm/village/upgrade
  Village->>Journal: Enregistre BuildingUpgraded
  Village-->>UI: Réponse à la commande
  SSE->>Journal: Lit les nouveaux événements
  Journal-->>SSE: BuildingUpgraded
  SSE-->>UI: domain-event (données masquées)
  UI->>API: GET /api/chronicle/achievements
  API->>Projection: Rattrape la projection
  Projection->>Journal: Lit les événements non traités
  Journal-->>Projection: BuildingUpgraded
  Projection->>DB: Insère Bâtisseur si absent
  API->>DB: Lit les distinctions du joueur connecté
  DB-->>API: Distinctions obtenues
  API-->>UI: Réponse JSON
  UI->>UI: Compare avec les distinctions connues
  opt Nouvelle distinction
    UI-->>Joueur: Affiche « Succès débloqué ! »
  end
```

La première lecture de l'interface sert de référence : elle n'affiche pas de notification pour les succès déjà obtenus. La projection est rattrapée à la lecture, comme pour le Classement ; une notification n'est donc pas un accusé de réception garanti.

## Extraction du Village

Le Village peut s'exécuter dans un service autonome, distinct de l'application serveur (ADR 0009). Cette configuration n'est utilisée qu'en local, lorsque les variables `REALM_SERVICE_URL` et `SERVICE_SECRET` sont définies ; elle n'est pas déployée.

```mermaid
flowchart LR
  web["Interface web"] -->|"/api/realm"| app["Application serveur<br/>passerelle et module distant"]
  app -->|"requêtes du joueur, messages de la saga,<br/>export et effacement (secret partagé)"| village["Service Village<br/>[Hono, Node.js, port 4000]<br/>src/services/village"]
  village -->|"réponses de la saga<br/>(/api/internal/messages)"| app
  app -->|"relais du flux publié<br/>(GET /events)"| village
  app --- base[("Base de l'application<br/>.data/pglite")]
  village --- base2[("Base du service<br/>.data/village")]
```

L'application reçoit alors une version distante du module Village (`remote.ts`), de même forme que la version exécutée dans le processus : le reste de l'application ne voit pas la différence.

Le relais recopie les événements publiés par le service dans le journal de l'application, où le Classement et le canal temps réel du village continuent de les lire.

Le service est assemblé par sa propre racine de composition, `src/services/village`, qui n'utilise le module Village que par son point d'entrée public.

## Niveau 4 - Code

Ce niveau n'est pas dessiné : il est décrit par le code lui-même et par ses tests, que tout diagramme maintenu à la main ne tarderait pas à contredire.

## Déploiement

```mermaid
flowchart LR
  poste["Poste de développement"] -->|"git push"| github["GitHub<br/>Dépôt royaumes"]
  github -->|"Déclenche"| build["Construction Vercel<br/>verify, db:migrate, next build"]
  build -->|"Migrations<br/>(connexion directe)"| neon[("Neon<br/>Francfort")]
  build -->|"Publie"| fonctions["Fonctions Vercel<br/>Francfort (fra1)"]
  fonctions -->|"SQL<br/>(connexion mutualisée)"| neon
  cron["Tâche planifiée Vercel<br/>chaque jour à 4 h UTC"] -->|"GET /api/cron/daily<br/>(secret CRON_SECRET)"| fonctions
```

Chaque envoi sur la branche `main` déclenche un déploiement. Le code n'est publié que si l'ensemble des contrôles a réussi, et les migrations ne sont appliquées qu'après ces contrôles.

La tâche planifiée, déclarée dans `vercel.json`, exécute chaque jour les tâches quotidiennes : la distribution des messages restés en attente dans la boîte d'envoi, et l'application des durées de conservation de la Taverne. Elle ne s'exécute que sur le déploiement de production.

Le service Village extrait n'est pas déployé : en production, le Village s'exécute dans les fonctions Vercel, comme les autres modules (ADR 0009).