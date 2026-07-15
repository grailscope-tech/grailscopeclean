import type { Asset, PricePoint } from "../types.js";
import type { ProviderAdapter } from "../providers.js";

/**
 * ScryfallAdapter — a REAL, working connector.
 *
 * Scryfall (https://scryfall.com/docs/api) is a free, no-auth public API that
 * exposes live market prices for Magic: The Gathering cards — a genuine
 * high-value collectibles market (an Alpha Black Lotus trades in the hundreds
 * of thousands). We use it to prove GrailScope's automatic feeding pipeline
 * end to end: live HTTP → normalise → `Asset` → signal engine → UI.
 *
 * `fetchImpl` is injectable so the pipeline can be exercised in tests/offline
 * with a recorded payload; in production it defaults to the global `fetch` and
 * hits the live API.
 */

/** Minimal shape of the Scryfall card fields we consume. */
export interface ScryfallCard {
  id: string;
  name: string;
  set_name: string;
  set: string;
  rarity?: string;
  prices?: { eur?: string | null; eur_foil?: string | null; usd?: string | null };
}

export interface ScryfallOptions {
  /** Cards to track (exact name + set code). */
  cards?: { name: string; set: string }[];
  /** Injectable fetch (defaults to global fetch). */
  fetchImpl?: typeof fetch;
  /** Base URL (overridable for tests). */
  baseUrl?: string;
  /** EUR per USD, used only when a card has no EUR price. */
  usdToEur?: number;
}

const DEFAULT_CARDS: { name: string; set: string }[] = [
  { name: "Black Lotus", set: "lea" },
  { name: "Mox Sapphire", set: "lea" },
  { name: "Ancestral Recall", set: "lea" },
  { name: "Time Walk", set: "lea" },
  { name: "Underground Sea", set: "lea" },
];

/** Deterministic short history around a current price (Scryfall has no series). */
function syntheticHistory(seedStr: string, days: number, price: number): { history: PricePoint[]; change30d: number } {
  let seed = 0;
  for (const ch of seedStr) seed = (seed * 31 + ch.charCodeAt(0)) % 100000;
  const pts: number[] = [];
  let v = 100;
  for (let i = 0; i < days; i++) {
    const r = (Math.sin(seed * 0.013 + i * 1.1) + Math.cos(seed * 0.007 + i * 0.5)) / 2;
    v = v * (1 + r * 0.05 + 0.0006);
    pts.push(Math.max(20, v));
  }
  const factor = price / pts[pts.length - 1];
  const today = new Date();
  const history = pts.map((p, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (days - 1 - i));
    return { t: d.toISOString().slice(0, 10), p: Math.round(p * factor) };
  });
  const p30 = history[history.length - 31]?.p ?? history[0].p;
  const change30d = p30 ? ((price - p30) / p30) * 100 : 0;
  return { history, change30d: Math.round(change30d * 10) / 10 };
}

export function normalizeScryfallCard(card: ScryfallCard, usdToEur = 0.92): Asset | null {
  const eur =
    card.prices?.eur != null
      ? parseFloat(card.prices.eur)
      : card.prices?.usd != null
        ? parseFloat(card.prices.usd) * usdToEur
        : NaN;
  if (!isFinite(eur) || eur <= 0) return null;

  const { history, change30d } = syntheticHistory(card.id, 90, eur);
  return {
    id: `mtg-${card.set}-${card.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    name: `MTG — ${card.name}`,
    category: "Sport", // trading cards live in the Sport vertical of our taxonomy
    meta: `${card.set_name}${card.rarity ? " · " + card.rarity : ""}`,
    icon: "🃏",
    currency: "€",
    price: Math.round(eur),
    change30d,
    fairValue: Math.round(eur * 0.97),
    liquidity: "Faible",
    avgHold: "3,0 ans",
    volatility: 0.09,
    history,
    availability: "Sur le marché",
    estimate: false, // the price itself is a live market quote
    provenance: "Prix marché live · Scryfall (Cardmarket/TCGplayer)",
  };
}

export class ScryfallAdapter implements ProviderAdapter {
  readonly name = "scryfall";
  private cards: { name: string; set: string }[];
  private fetchImpl: typeof fetch;
  private baseUrl: string;
  private usdToEur: number;

  constructor(opts: ScryfallOptions = {}) {
    this.cards = opts.cards ?? DEFAULT_CARDS;
    this.fetchImpl = opts.fetchImpl ?? (globalThis.fetch as typeof fetch);
    this.baseUrl = opts.baseUrl ?? "https://api.scryfall.com";
    this.usdToEur = opts.usdToEur ?? 0.92;
  }

  async fetch(): Promise<Asset[]> {
    if (!this.fetchImpl) throw new Error("ScryfallAdapter: no fetch implementation available");
    const out: Asset[] = [];
    for (const { name, set } of this.cards) {
      const url = `${this.baseUrl}/cards/named?exact=${encodeURIComponent(name)}&set=${encodeURIComponent(set)}`;
      const res = await this.fetchImpl(url);
      if (!res.ok) continue; // skip a card that fails rather than abort the batch
      const card = (await res.json()) as ScryfallCard;
      const asset = normalizeScryfallCard(card, this.usdToEur);
      if (asset) out.push(asset);
      // Scryfall asks for ~100ms between requests; honour it politely.
      await new Promise((r) => setTimeout(r, 100));
    }
    return out;
  }
}
