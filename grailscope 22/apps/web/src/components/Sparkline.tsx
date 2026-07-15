import type { PricePoint } from "@grailscope/core";

interface Props {
  data: PricePoint[];
  up: boolean;
  width?: number;
  height?: number;
  area?: boolean;
}

/** Lightweight dependency-free price chart (SVG path). */
export function Sparkline({ data, up, width = 110, height = 32, area = false }: Props) {
  if (!data.length) return null;
  const color = up ? "var(--up)" : "var(--down)";
  const vals = data.map((d) => d.p);
  const mn = Math.min(...vals);
  const mx = Math.max(...vals);
  const rg = mx - mn || 1;
  const pad = area ? 14 : 2;
  const pts = vals.map((v, i) => [
    (i / (vals.length - 1)) * width,
    height - ((v - mn) / rg) * (height - pad) - pad / 2,
  ]);
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const gid = "sg" + Math.random().toString(36).slice(2, 7);
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      {area && (
        <>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={color} stopOpacity="0.22" />
              <stop offset="1" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={`${d} L${width} ${height} L0 ${height} Z`} fill={`url(#${gid})`} />
        </>
      )}
      <path d={d} fill="none" stroke={color} strokeWidth={area ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round" />
      {area && <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r={4} fill={color} />}
    </svg>
  );
}
