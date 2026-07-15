/** Locale-aware formatting helpers (FR). */

export function formatPrice(value: number, currency = "€"): string {
  return `${currency} ${Math.round(value).toLocaleString("fr-FR")}`;
}

export function formatPct(value: number, withSign = true): string {
  const sign = withSign && value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

export function formatCompact(value: number): string {
  if (value >= 1_000_000) return (value / 1_000_000).toFixed(1).replace(".0", "") + " M";
  if (value >= 1_000) return (value / 1_000).toFixed(0) + " k";
  return value.toString();
}

export const signalLabel: Record<string, string> = {
  BUY: "Acheter",
  SELL: "Vendre",
  HOLD: "Conserver",
};

export const categoryIcon: Record<string, string> = {
  Art: "🖼️",
  Luxe: "⌚",
  Sport: "🃏",
  Culture: "🎸",
};

/** Distinct colours per category (used by the allocation donut). */
export const categoryColor: Record<string, string> = {
  Art: "#2f6bff",
  Luxe: "#b07b00",
  Sport: "#0aa66e",
  Culture: "#7a4dd0",
};

/** Colour + short glyph for an availability status (used by badges). */
export const availabilityStyle: Record<string, { color: string; bg: string; glyph: string }> = {
  "Sur le marché": { color: "#0aa66e", bg: "#e6f7f0", glyph: "●" },
  "Enchères à venir": { color: "#2f6bff", bg: "#eaf0ff", glyph: "◷" },
  "Hors marché": { color: "#6b7689", bg: "#eef1f6", glyph: "○" },
  "Collection privée": { color: "#7a4dd0", bg: "#f1ebfb", glyph: "🔒" },
  "Musée": { color: "#b07b00", bg: "#fff6e0", glyph: "🏛" },
  "Jamais en vente": { color: "#0c1424", bg: "#e8ebf2", glyph: "∞" },
};

