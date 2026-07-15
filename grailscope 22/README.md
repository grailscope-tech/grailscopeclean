# GrailScope

> Track. Time. Trade fair.
> Le hub agrégateur — **sans transaction** — des objets de collection de grande
> valeur : art, luxe, sport, culture.

Monorepo : une app **web** (React + Vite), une app **mobile** (React Native /
Expo), un **package partagé** (`core`) qui contient tout le métier (données,
moteur de signaux, adaptateurs de sources), et une **API** (Express).

```
grailscope/
├── packages/core      # types, dataset démo, moteur de signaux, DataSource + adapters
├── apps/web           # React + Vite + TypeScript
├── apps/mobile        # Expo / React Native
├── server             # API Express (HttpDataSource)
├── design             # logo, tokens, guide de marque, brand board
└── docs/DATA_SOURCES.md
```

## Démarrage rapide

Prérequis : Node ≥ 18.

```bash
npm install              # installe tous les workspaces

npm run dev:web          # → http://localhost:5173   (app web)
npm run dev:server       # → http://localhost:4000   (API, optionnel)
npm run dev:mobile       # → Expo (scanner le QR avec Expo Go)
```

L'app web tourne en **mode démo** par défaut (aucune dépendance réseau).

## Les trois briques demandées

**1 · Vraie base de code React / React Native.**
Le web et le mobile partagent `@grailscope/core`. Aucune logique métier n'est
dupliquée : types, formatage, moteur de signaux et accès aux données vivent dans
`packages/core` et sont importés des deux côtés.

**2 · Source de données réelle, branchable.**
L'UI ne connaît qu'une interface : `DataSource`. Implémentations : `MockDataSource`
(démo), `HttpDataSource` (API GrailScope), et des `ProviderAdapter` côté serveur.
**Deux connecteurs réels gratuits sont déjà livrés** : `ScryfallAdapter` (cartes
Magic, prix live) et `PokemonTcgAdapter` (cartes Pokémon, prix Cardmarket live).
Preuve du pipeline sans réseau : `npm run demo:feed`. Live : `LIVE_CARDS=1 npm run dev:server`.
→ détails dans [`docs/DATA_SOURCES.md`](docs/DATA_SOURCES.md).

**Déploiement.** Stack prêt à mettre en ligne et auto-alimenté : `Dockerfile`,
`render.yaml` (blueprint API + web en un clic), `fly.toml`, `apps/web/vercel.json`,
CI GitHub Actions. → [`docs/DEPLOY.md`](docs/DEPLOY.md).

**3 · Identité & design system.**
Logo (`design/logo.svg`), tokens uniques (`design/tokens.css` + `tokens.ts`),
guide de marque (`design/brand.md`) et un aperçu visuel (`design/brand-board.html`).

## Fonctionnalités (V1)
- Dashboard de tendances + indices par catégorie
- Fiche objet / cote détaillée (graphique, juste valeur, écart, liquidité)
- Recherche & watchlist
- Signaux achat / vente avec recommandation argumentée et indice de confiance
- **Comptes utilisateurs** (inscription / connexion) et **watchlist persistée**
  côté serveur, synchronisée web + mobile
- **Alertes de prix** (signal Acheter/Vendre, seuils ↑/↓) + **notifications**
  in-app, e-mail (SMTP) et push mobile (Expo)
- **Portefeuille** : positions possédées + valorisation et plus-value en temps réel
- Persistance **SQLite ⇄ Postgres** → voir [`docs/ACCOUNTS.md`](docs/ACCOUNTS.md)

## Configuration de la source de données

`apps/web/.env` (copier depuis `.env.example`) :

```
VITE_DATA_SOURCE=mock          # ou "http"
VITE_API_URL=http://localhost:4000
```

## Statut
Prototype fonctionnel. Les prix sont **indicatifs** (jeu de démo). Brancher un
flux licencié par verticale pour passer en production — voir `docs/DATA_SOURCES.md`.
