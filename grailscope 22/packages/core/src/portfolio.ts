import type { Asset, PricePoint, Category } from "./types.js";

/** A position the user owns: quantity at an average unit cost. */
export interface Holding {
  asset_id: string;
  quantity: number;
  unit_cost: number;
}

/** One holding enriched with the current market valuation. */
export interface PortfolioItem {
  asset: Asset;
  quantity: number;
  unitCost: number;
  cost: number; // quantity * unitCost
  value: number; // quantity * current price
  pnl: number; // value - cost
  pnlPct: number; // pnl / cost * 100
}

export interface PortfolioSummary {
  items: PortfolioItem[];
  totalValue: number;
  totalCost: number;
  totalPnl: number;
  totalPnlPct: number;
  /** Total portfolio value per day (Σ quantity × price), oldest first. */
  history: PricePoint[];
}

/** Share of total value held in each category, with that slice's P&L. */
export interface AllocationSlice {
  category: Category;
  value: number;
  pct: number;
  pnl: number;
}

export function portfolioAllocation(summary: PortfolioSummary): AllocationSlice[] {
  const byCat = new Map<Category, { value: number; pnl: number }>();
  for (const it of summary.items) {
    const cur = byCat.get(it.asset.category) ?? { value: 0, pnl: 0 };
    cur.value += it.value;
    cur.pnl += it.pnl;
    byCat.set(it.asset.category, cur);
  }
  const total = summary.totalValue || 1;
  return [...byCat.entries()]
    .map(([category, v]) => ({ category, value: v.value, pnl: v.pnl, pct: (v.value / total) * 100 }))
    .sort((a, b) => b.value - a.value);
}

/**
 * Reconstruct the portfolio's total value over time from each asset's price
 * history (value_day = Σ quantity × price_that_day). Uses the shortest common
 * history so all positions are aligned to the same dates.
 */
export function portfolioHistory(items: { quantity: number; asset: Asset }[]): PricePoint[] {
  const withHist = items.filter((i) => i.asset.history.length > 0);
  if (!withHist.length) return [];
  const len = Math.min(...withHist.map((i) => i.asset.history.length));
  const ref = withHist[0].asset.history;
  const out: PricePoint[] = [];
  for (let i = 0; i < len; i++) {
    const idxFromEnd = len - 1 - i;
    let total = 0;
    for (const { quantity, asset } of withHist) {
      const h = asset.history;
      total += quantity * h[h.length - 1 - idxFromEnd].p;
    }
    out.push({ t: ref[ref.length - 1 - idxFromEnd].t, p: Math.round(total) });
  }
  return out;
}

/**
 * Value a set of holdings against the current catalogue. Pure function — shared
 * by the server (authoritative prices) and the apps (optimistic display).
 */
export function computePortfolio(holdings: Holding[], assets: Asset[]): PortfolioSummary {
  const byId = new Map(assets.map((a) => [a.id, a]));
  const items: PortfolioItem[] = [];
  for (const h of holdings) {
    const asset = byId.get(h.asset_id);
    if (!asset) continue;
    const cost = h.quantity * h.unit_cost;
    const value = h.quantity * asset.price;
    const pnl = value - cost;
    items.push({
      asset,
      quantity: h.quantity,
      unitCost: h.unit_cost,
      cost,
      value,
      pnl,
      pnlPct: cost ? (pnl / cost) * 100 : 0,
    });
  }
  items.sort((a, b) => b.value - a.value);
  const totalValue = items.reduce((s, i) => s + i.value, 0);
  const totalCost = items.reduce((s, i) => s + i.cost, 0);
  const totalPnl = totalValue - totalCost;
  return {
    items,
    totalValue,
    totalCost,
    totalPnl,
    totalPnlPct: totalCost ? (totalPnl / totalCost) * 100 : 0,
    history: portfolioHistory(items.map((i) => ({ quantity: i.quantity, asset: i.asset }))),
  };
}
