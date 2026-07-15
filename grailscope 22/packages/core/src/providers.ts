import type { Asset } from "./types.js";

/**
 * Provider adapters — server-side connectors that normalise a third-party
 * market feed into GrailScope `Asset` objects.
 *
 * NOTE: high-value collectibles pricing is proprietary. There is no single free
 * public API covering art + watches + sports cards + memorabilia. In production
 * you license one feed per vertical and merge them here. Each adapter below is a
 * documented stub: implement `fetch` against the real endpoint + API key.
 *
 * Verticals & typical sources (as of 2025):
 *   - Watches / handbags : Chrono24, WatchCharts, Everdrop API
 *   - Sports cards       : Card Ladder, PSA, Market Movers
 *   - Art / prints       : Artsy, Artnet Price Database, MutualArt
 *   - Memorabilia        : auction house result feeds (Sotheby's, Heritage)
 *
 * They all conform to one interface, so adding a vertical never touches the apps.
 */
export interface ProviderAdapter {
  readonly name: string;
  /** Pull and normalise the latest catalogue slice this provider covers. */
  fetch(): Promise<Asset[]>;
}

export interface ProviderConfig {
  apiKey?: string;
  baseUrl?: string;
}

/** Example: a watch-market provider (Chrono24-style REST). */
export class WatchMarketAdapter implements ProviderAdapter {
  readonly name = "watch-market";
  constructor(private cfg: ProviderConfig) {}

  async fetch(): Promise<Asset[]> {
    if (!this.cfg.apiKey) throw new Error("WatchMarketAdapter: missing apiKey");
    // const res = await fetch(`${this.cfg.baseUrl}/v1/models?segment=grail`, {
    //   headers: { Authorization: `Bearer ${this.cfg.apiKey}` },
    // });
    // const raw = await res.json();
    // return raw.items.map(normaliseWatch);
    return []; // TODO: implement against the licensed endpoint
  }
}

/** Example: a sports-card provider (Card Ladder-style). */
export class CardMarketAdapter implements ProviderAdapter {
  readonly name = "card-market";
  constructor(private cfg: ProviderConfig) {}
  async fetch(): Promise<Asset[]> {
    if (!this.cfg.apiKey) throw new Error("CardMarketAdapter: missing apiKey");
    return [];
  }
}

/** Example: an art / auction-results provider. */
export class ArtMarketAdapter implements ProviderAdapter {
  readonly name = "art-market";
  constructor(private cfg: ProviderConfig) {}
  async fetch(): Promise<Asset[]> {
    if (!this.cfg.apiKey) throw new Error("ArtMarketAdapter: missing apiKey");
    return [];
  }
}

/**
 * Merge several providers into one catalogue. Falls back to whatever succeeds,
 * so one provider outage doesn't take the whole feed down.
 */
export async function aggregateProviders(adapters: ProviderAdapter[]): Promise<Asset[]> {
  const results = await Promise.allSettled(adapters.map((a) => a.fetch()));
  const assets: Asset[] = [];
  for (const r of results) if (r.status === "fulfilled") assets.push(...r.value);
  return assets;
}
