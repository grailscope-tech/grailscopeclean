import { useState } from "react";
import { type PortfolioSummary, portfolioAllocation, categoryColor, formatPrice, formatPct } from "@grailscope/core";

const R = 70, IR = 44, CX = 90, CY = 90;

function arc(start: number, end: number) {
  const p = (a: number, r: number) => [CX + r * Math.cos(a), CY + r * Math.sin(a)];
  const a0 = (start / 100) * 2 * Math.PI - Math.PI / 2;
  const a1 = (end / 100) * 2 * Math.PI - Math.PI / 2;
  const big = end - start > 50 ? 1 : 0;
  const [x0, y0] = p(a0, R), [x1, y1] = p(a1, R), [x2, y2] = p(a1, IR), [x3, y3] = p(a0, IR);
  return `M${x0} ${y0} A${R} ${R} 0 ${big} 1 ${x1} ${y1} L${x2} ${y2} A${IR} ${IR} 0 ${big} 0 ${x3} ${y3} Z`;
}

/** Interactive allocation donut: hover a slice or legend row to focus it. */
export function AllocationDonut({ summary }: { summary: PortfolioSummary }) {
  const slices = portfolioAllocation(summary);
  const [active, setActive] = useState<number | null>(null);
  if (!slices.length) return null;

  let acc = 0;
  const segs = slices.map((s) => {
    const seg = { ...s, start: acc, end: acc + s.pct };
    acc += s.pct;
    return seg;
  });
  const focus = active !== null ? segs[active] : null;

  return (
    <div style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
      <svg width="180" height="180" viewBox="0 0 180 180" style={{ flexShrink: 0 }}>
        {segs.map((s, i) => (
          <path
            key={s.category}
            d={arc(s.start, s.end)}
            fill={categoryColor[s.category]}
            opacity={active === null || active === i ? 1 : 0.35}
            stroke="#fff"
            strokeWidth="1.5"
            style={{ cursor: "pointer", transition: "opacity .12s" }}
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
          />
        ))}
        <text x={CX} y={CY - 6} textAnchor="middle" style={{ fontSize: 11, fill: "var(--muted)" }}>
          {focus ? focus.category : "Total"}
        </text>
        <text x={CX} y={CY + 12} textAnchor="middle" style={{ fontSize: 14, fontWeight: 800, fill: "var(--ink)" }}>
          {focus ? `${focus.pct.toFixed(0)}%` : formatPrice(summary.totalValue).replace("€ ", "")}
        </text>
      </svg>
      <div style={{ flex: 1, minWidth: 180 }}>
        {segs.map((s, i) => {
          const up = s.pnl >= 0;
          return (
            <div
              key={s.category}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: "1px solid var(--line)", opacity: active === null || active === i ? 1 : 0.5, cursor: "pointer" }}
            >
              <span style={{ width: 11, height: 11, borderRadius: 3, background: categoryColor[s.category], flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600 }}>{s.category}</span>
              <span style={{ fontSize: 13, fontWeight: 700 }}>{formatPrice(s.value)}</span>
              <span style={{ fontSize: 12, color: "var(--muted)", width: 42, textAlign: "right" }}>{s.pct.toFixed(0)}%</span>
              <span className={up ? "up" : "down"} style={{ fontSize: 12, fontWeight: 700, width: 56, textAlign: "right" }}>
                {formatPct(summary.totalValue ? (s.pnl / (s.value - s.pnl || 1)) * 100 : 0)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
