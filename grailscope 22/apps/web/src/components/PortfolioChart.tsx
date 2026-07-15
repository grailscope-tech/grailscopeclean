import { useRef, useState } from "react";
import { type PricePoint, formatPrice } from "@grailscope/core";

/** Interactive area chart: hover/touch shows a crosshair + value tooltip. */
export function PortfolioChart({ data, height = 200 }: { data: PricePoint[]; height?: number }) {
  const W = 680;
  const H = height;
  const ref = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  if (data.length < 2) return null;
  const vals = data.map((d) => d.p);
  const mn = Math.min(...vals);
  const mx = Math.max(...vals);
  const rg = mx - mn || 1;
  const up = vals[vals.length - 1] >= vals[0];
  const color = up ? "var(--up)" : "var(--down)";
  const x = (i: number) => (i / (data.length - 1)) * W;
  const y = (p: number) => H - ((p - mn) / rg) * (H - 30) - 15;
  const line = data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(d.p).toFixed(1)}`).join(" ");

  function locate(clientX: number) {
    const svg = ref.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const rel = (clientX - rect.left) / rect.width;
    const idx = Math.max(0, Math.min(data.length - 1, Math.round(rel * (data.length - 1))));
    setHover(idx);
  }

  const hi = hover ?? data.length - 1;
  const point = data[hi];

  return (
    <div style={{ position: "relative" }}>
      <svg
        ref={ref}
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        preserveAspectRatio="none"
        style={{ display: "block", touchAction: "none", cursor: "crosshair" }}
        onMouseMove={(e) => locate(e.clientX)}
        onMouseLeave={() => setHover(null)}
        onTouchStart={(e) => locate(e.touches[0].clientX)}
        onTouchMove={(e) => locate(e.touches[0].clientX)}
        onTouchEnd={() => setHover(null)}
      >
        <defs>
          <linearGradient id="pfg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity="0.22" />
            <stop offset="1" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[1, 2, 3].map((i) => (
          <line key={i} x1="0" y1={(H / 4) * i} x2={W} y2={(H / 4) * i} stroke="#eef1f7" strokeWidth="1" />
        ))}
        <path d={`${line} L${W} ${H} L0 ${H} Z`} fill="url(#pfg)" />
        <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" />
        {hover !== null && (
          <line x1={x(hi)} y1="0" x2={x(hi)} y2={H} stroke="var(--muted)" strokeWidth="1" strokeDasharray="3 3" />
        )}
        <circle cx={x(hi)} cy={y(point.p)} r="4.5" fill={color} stroke="#fff" strokeWidth="1.5" />
      </svg>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, display: "flex", justifyContent: "space-between", pointerEvents: "none", padding: "0 2px" }}>
        <span style={{ fontSize: 12, color: "var(--muted)" }}>{new Date(point.t).toLocaleDateString("fr-FR")}</span>
        <span style={{ fontSize: 13, fontWeight: 700 }}>{formatPrice(point.p)}</span>
      </div>
    </div>
  );
}
