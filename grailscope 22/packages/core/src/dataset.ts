import type { Asset, PricePoint } from "./types.js";
import catalogue from "./catalogue.json";

/** Deterministic pseudo-history generator so demo data is stable across reloads. */
function genHistory(seed: number, days: number, vol: number, trend: number, endPrice: number): PricePoint[] {
  const points: number[] = [];
  let v = 100;
  for (let i = 0; i < days; i++) {
    const r = (Math.sin(seed * 9.7 + i * 1.3) + Math.cos(seed * 4.1 + i * 0.7)) / 2;
    v = v * (1 + r * vol + trend);
    points.push(Math.max(20, v));
  }
  const factor = endPrice / points[points.length - 1];
  const today = new Date("2026-06-15");
  return points.map((p, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (days - 1 - i));
    return { t: d.toISOString().slice(0, 10), p: Math.round(p * factor) };
  });
}

/** Shape of an entry in catalogue.json (everything except the generated history). */
type Seed = Omit<Asset, "history">;

let _cache: Asset[] | null = null;

/**
 * The bundled catalogue. A curated set of the world's most exclusive
 * collectibles — both actively traded pieces and famous OFF-MARKET grails
 * (museum, private collection, never-for-sale) tracked for valuation only.
 *
 * This is the seed set; the live providers (see /server + providers.ts) extend
 * it to the full market.
 */
export function demoAssets(): Asset[] {
  if (_cache) return _cache;
  const seeds = catalogue as unknown as (Seed & { trend?: number })[];
  _cache = seeds.map((s, i) => {
    const { trend = 0.001, ...rest } = s;
    return { ...rest, history: genHistory(i + 1, 90, s.volatility, trend, s.price) } as Asset;
  });
  return _cache;
}
