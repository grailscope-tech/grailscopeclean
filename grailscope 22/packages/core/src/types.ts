/** GrailScope domain types — shared by web, mobile and server. */

export type Category = "Art" | "Luxe" | "Sport" | "Culture";

export type Signal = "BUY" | "SELL" | "HOLD";

export type Liquidity = "Très faible" | "Faible" | "Moyenne" | "Élevée";

/** Market availability of a piece. Off-market items are tracked for valuation
 *  even though they cannot currently be bought. */
export type Availability =
  | "Sur le marché"        // actively listed / tradable
  | "Hors marché"          // known piece, not currently listed
  | "Collection privée"    // held privately, not for sale
  | "Musée"                // institutional, effectively never for sale
  | "Enchères à venir"     // announced for an upcoming auction
  | "Jamais en vente";     // priceless / never sold

/** A past sale on record (anchors the valuation of off-market pieces). */
export interface LastSale {
  year: number;
  price: number;
  venue: string;
}

/** A single observed price point (median market price for the day). */
export interface PricePoint {
  /** ISO date (YYYY-MM-DD). */
  t: string;
  /** Price in the asset currency. */
  p: number;
}

/** A collectible tracked by GrailScope. */
export interface Asset {
  id: string;
  name: string;
  category: Category;
  /** Short meta line, e.g. "Réf. 6239 · acier". */
  meta: string;
  /** Emoji or asset glyph used as a lightweight thumbnail. */
  icon: string;
  currency: string;
  /** Latest observed median price. */
  price: number;
  /** 30-day change, percent. */
  change30d: number;
  /** Model-estimated fair value. */
  fairValue: number;
  liquidity: Liquidity;
  /** Average holding period, human readable. */
  avgHold: string;
  /** Volatility score 0..1. */
  volatility: number;
  /** Daily price history, oldest first. */
  history: PricePoint[];
  /** Market availability. */
  availability: Availability;
  /** True when `price` is a model estimate, not a live market quote
   *  (always true for off-market / museum / private pieces). */
  estimate: boolean;
  /** Current holder / location, when known. */
  provenance?: string;
  /** Last recorded sale, when known. */
  lastSale?: LastSale;
}

/** True when an asset can actually be traded right now. */
export function isTradable(a: { availability: Availability }): boolean {
  return a.availability === "Sur le marché" || a.availability === "Enchères à venir";
}

/** Output of the signal engine for one asset. */
export interface SignalResult {
  signal: Signal;
  /** Gap between price and fair value, percent (positive = overpriced). */
  fairGapPct: number;
  /** Short momentum read derived from history. */
  momentumPct: number;
  /** Human-readable rationale (FR). */
  rationale: string;
  /** 0..100 confidence of the call. */
  confidence: number;
}

/** A market index aggregated per category. */
export interface CategoryIndex {
  category: Category;
  value: number;
  change30d: number;
  history: PricePoint[];
}
