# Brancher des données de marché réelles

GrailScope sépare strictement l'UI de la donnée. Les apps web et mobile ne
connaissent qu'**une seule interface** : `DataSource` (`packages/core/src/dataSource.ts`).
Passer de la démo à une vraie source ne touche jamais l'interface.

## Les trois niveaux

```
UI (web + mobile)
      │  ne dépend que de…
      ▼
DataSource  ──►  MockDataSource     (données de démo embarquées)
                 HttpDataSource     (appelle l'API GrailScope /server)
                                          │  agrège…
                                          ▼
                                    ProviderAdapter[]   (Chrono24, Card Ladder, Artnet…)
```

## 1. Démo (par défaut)

```
VITE_DATA_SOURCE=mock
```

Catalogue de 12 objets avec 90 jours d'historique généré. Zéro réseau.

## 2. API GrailScope (HttpDataSource)

Démarrer le serveur :

```bash
npm run dev:server        # http://localhost:4000
```

Puis, dans `apps/web/.env` :

```
VITE_DATA_SOURCE=http
VITE_API_URL=http://localhost:4000
```

Le serveur sert aujourd'hui le même catalogue de démo, mais via HTTP — la chaîne
complète UI → DataSource → API fonctionne déjà de bout en bout.

## 3. Sources réelles (ProviderAdapter)

Il n'existe **pas** d'API publique gratuite unique couvrant art + montres + cartes
+ memorabilia. En production, on licencie un flux par verticale et on les fusionne
côté serveur dans `aggregateProviders([...])`.

| Verticale            | Sources typiques (2025)                                  |
|----------------------|----------------------------------------------------------|
| Montres / maroquinerie | Chrono24, WatchCharts                                  |
| Cartes de sport      | Card Ladder, PSA, Market Movers                          |
| Art / éditions       | Artsy, Artnet Price Database, MutualArt                  |
| Memorabilia          | Flux de résultats d'enchères (Sotheby's, Heritage)       |

Chaque connecteur implémente `ProviderAdapter` (`packages/core/src/providers.ts`) :

```ts
export class WatchMarketAdapter implements ProviderAdapter {
  readonly name = "watch-market";
  constructor(private cfg: ProviderConfig) {}
  async fetch(): Promise<Asset[]> {
    const res = await fetch(`${this.cfg.baseUrl}/v1/models?segment=grail`, {
      headers: { Authorization: `Bearer ${this.cfg.apiKey}` },
    });
    const raw = await res.json();
    return raw.items.map(normaliseWatch); // → Asset
  }
}
```

Puis dans `server/src/index.ts`, on remplace `demoAssets()` par :

```ts
const adapters = [
  new WatchMarketAdapter({ apiKey: process.env.WATCH_KEY, baseUrl: "https://api.chrono24…" }),
  new CardMarketAdapter({ apiKey: process.env.CARD_KEY }),
  new ArtMarketAdapter({ apiKey: process.env.ART_KEY }),
];
let catalogue = await aggregateProviders(adapters);
// rafraîchir périodiquement (cron 15 min) et mettre en cache
```

`aggregateProviders` tolère les pannes : si un fournisseur tombe, les autres
continuent d'alimenter le catalogue.

## Connecteur réel inclus : Scryfall (cartes à collectionner)

Un connecteur **fonctionnel** est livré : `ScryfallAdapter`
(`packages/core/src/connectors/scryfall.ts`). Scryfall est une API publique
**gratuite et sans clé** qui expose les prix de marché live des cartes Magic:
The Gathering — un vrai marché de collection (un Black Lotus Alpha vaut plusieurs
centaines de milliers d'euros). Il prouve la chaîne d'alimentation automatique de
bout en bout : HTTP live → normalisation → `Asset` → moteur de signaux → UI.

Démo (le même code tourne en ligne ou hors-ligne, seule la cible de `fetch` change) :

```bash
# hors-ligne, à partir d'un payload Scryfall enregistré (aucun réseau requis)
node --import tsx server/scripts/demo-live-feed.ts

# en ligne, contre la vraie API api.scryfall.com
LIVE=1 node --import tsx server/scripts/demo-live-feed.ts
```

Et dans le serveur, le feed se déclenche tout seul :

```bash
LIVE_CARDS=1 npm run dev:server   # fusionne les cartes Scryfall au démarrage, refresh horaire
```

`fetchImpl` est injectable : en production il utilise le `fetch` global et tape
l'API réelle ; en test on injecte un payload enregistré. Les autres verticales
(montres, art, enchères) suivent exactement le même patron `ProviderAdapter`.

## Le moteur de signaux

`computeSignal()` (`packages/core/src/signals.ts`) combine deux entrées lisibles :
écart à la juste valeur + momentum récent. Les seuils sont volontairement simples
et explicables ; un modèle de production y ajouterait comparables d'enchères,
rareté/offre et liquidité macro — mais **la forme de l'API ne change pas**, donc
l'UI n'a jamais à être modifiée.
