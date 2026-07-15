import Svg, { Path, Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import type { PricePoint } from "@grailscope/core";
import { theme } from "../theme";

interface Props {
  data: PricePoint[];
  up: boolean;
  width?: number;
  height?: number;
  area?: boolean;
}

export function Sparkline({ data, up, width = 64, height = 30, area = false }: Props) {
  if (!data.length) return null;
  const color = up ? theme.up : theme.down;
  const vals = data.map((d) => d.p);
  const mn = Math.min(...vals);
  const mx = Math.max(...vals);
  const rg = mx - mn || 1;
  const pad = area ? 16 : 2;
  const pts = vals.map((v, i) => [
    (i / (vals.length - 1)) * width,
    height - ((v - mn) / rg) * (height - pad) - pad / 2,
  ]);
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  return (
    <Svg width={width} height={height}>
      {area && (
        <>
          <Defs>
            <LinearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color} stopOpacity={0.22} />
              <Stop offset="1" stopColor={color} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Path d={`${d} L${width} ${height} L0 ${height} Z`} fill="url(#grad)" />
        </>
      )}
      <Path d={d} fill="none" stroke={color} strokeWidth={area ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round" />
      {area && <Circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r={4} fill={color} />}
    </Svg>
  );
}
