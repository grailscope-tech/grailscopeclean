import type { Asset, SignalResult, CategoryIndex, Category, PricePoint } from "./types.js";
import { isTradable } from "./types.js";

/**
 * Signal engine.
 *
 * The buy/sell/hold call combines two transparent inputs:
 *   1. fair-value gap  — how far the market price sits from the model fair value
 *   2. momentum        — short-term trend from recent history
 *
 * Thresholds are intentionally simple and explainable; a production model would
 * blend auction comparables, supply/scarcity and macro liquidity, but the shape
 * of the API stays the same.
 */

const BUY_DISCOUNT = -4; // price this % (or more) below fair value → lean buy
const SELL_PREMIUM = 12; // price this % (or more) above fair value → lean sell

export function momentumPct(history: PricePoint[], window = 14): number {
  if (history.length < 2) return 0;
  const recent = history.slice(-window);
  const first = recent[0].p;
  const last = recent[recent.length - 1].p;
  if (first === 0) return 0;
  return ((last - first) / first) * 100;
}

export function fairGapPct(asset: Asset): number {
  if (!asset.fairValue) return 0;
  return ((asset.price - asset.fairValue) / asset.fairValue) * 100;
}

export function computeSignal(asset: Asset): SignalResult {
  const gap = fairGapPct(asset);
  const mom = momentumPct(asset.history);

  // Off-market pieces can't be traded — return a watch/valuation read only.
  if (!isTradable(asset)) {
    return {
      signal: "HOLD",
      fairGapPct: gap,
      momentumPct: mom,
      confidence: 60,
      rationale: `Pièce ${asset.availability.toLowerCase()} — non négociable actuellement. Valeur estimée à ${
        asset.lastSale ? `partir de la dernière vente connue (${asset.lastSale.year})` : "partir de comparables"
      } ; à suivre si elle revient sur le marché.`,
    };
  }

  let signal: "BUY" | "SELL" | "HOLD";
  let rationale: string;

  if (gap <= BUY_DISCOUNT || (gap < 5 && mom > 6)) {
    signal = "BUY";
    rationale =
      gap <= BUY_DISCOUNT
        ? `Prix ${Math.abs(gap).toFixed(0)}% sous la juste valeur estimée — décote attractive avec liquidité ${asset.liquidity.toLowerCase()}.`
        : `Momentum positif (${mom.toFixed(0)}% sur 14j) et prix proche de la juste valeur — fenêtre d'entrée favorable.`;
  } else if (gap >= SELL_PREMIUM) {
    signal = "SELL";
    rationale = `Prime de ${gap.toFixed(0)}% sur la juste valeur après emballement — fenêtre de sortie estimée optimale.`;
  } else {
    signal = "HOLD";
    rationale = `Prix proche de la juste valeur (écart ${gap >= 0 ? "+" : ""}${gap.toFixed(
      0,
    )}%), pas de catalyseur court terme — conserver et surveiller.`;
  }

  // Confidence: higher when gap and momentum agree and liquidity is decent.
  const liqScore = { "Très faible": 0.4, Faible: 0.6, Moyenne: 0.8, Élevée: 1 }[asset.liquidity];
  const agreement = signal === "HOLD" ? 0.5 : Math.min(1, (Math.abs(gap) / 20 + Math.abs(mom) / 20) / 1.5);
  const confidence = Math.round(Math.min(95, Math.max(40, agreement * 70 + liqScore * 25)));

  return { signal, fairGapPct: gap, momentumPct: mom, rationale, confidence };
}

/** Aggregate a per-category index from the asset list. */
export function buildIndices(assets: Asset[]): CategoryIndex[] {
  const cats: Category[] = ["Art", "Luxe", "Sport", "Culture"];
  return cats.map((category) => {
    const items = assets.filter((a) => a.category === category);
    const change30d = items.length
      ? items.reduce((s, a) => s + a.change30d, 0) / items.length
      : 0;
    // Synthetic index level: base + weighted by item momentum.
    const value = Math.round(1000 + items.length * 40 + change30d * 6);
    // Average the normalised histories to draw an index sparkline.
    const len = items[0]?.history.length ?? 0;
    const history: PricePoint[] = [];
    for (let i = 0; i < len; i++) {
      const avg =
        items.reduce((s, a) => s + (a.history[i]?.p ?? 0) / (a.history[0]?.p || 1), 0) /
        (items.length || 1);
      history.push({ t: items[0].history[i].t, p: avg * 100 });
    }
    return { category, value, change30d, history };
  });
}

/** Rank assets that currently carry an actionable signal. */
export function topSignals(assets: Asset[], limit = 6): { asset: Asset; result: SignalResult }[] {
  return assets
    .map((asset) => ({ asset, result: computeSignal(asset) }))
    .filter((x) => x.result.signal !== "HOLD")
    .sort((a, b) => Math.abs(b.result.fairGapPct) - Math.abs(a.result.fairGapPct))
    .slice(0, limit);
}
