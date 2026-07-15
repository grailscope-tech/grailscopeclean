import { useMemo, useRef, useState } from "react";
import { View, Text, PanResponder, StyleSheet } from "react-native";
import Svg, { Path, Circle, Line, Defs, LinearGradient, Stop } from "react-native-svg";
import { type PricePoint, formatPrice } from "@grailscope/core";
import { theme } from "../theme";

/** Touch-interactive portfolio value chart: drag to read the value at any day. */
export function PortfolioChart({ data, width, height = 130 }: { data: PricePoint[]; width: number; height?: number }) {
  const [active, setActive] = useState<number | null>(null);

  const { line, area, xs, ys, up } = useMemo(() => {
    const vals = data.map((d) => d.p);
    const mn = Math.min(...vals), mx = Math.max(...vals), rg = mx - mn || 1;
    const xs = data.map((_, i) => (i / (data.length - 1)) * width);
    const ys = vals.map((p) => height - ((p - mn) / rg) * (height - 22) - 11);
    const line = xs.map((x, i) => `${i ? "L" : "M"}${x.toFixed(1)} ${ys[i].toFixed(1)}`).join(" ");
    return { line, area: `${line} L${width} ${height} L0 ${height} Z`, xs, ys, up: vals[vals.length - 1] >= vals[0] };
  }, [data, width, height]);

  const locate = (px: number) => {
    const rel = Math.max(0, Math.min(1, px / width));
    setActive(Math.round(rel * (data.length - 1)));
  };
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => locate(e.nativeEvent.locationX),
      onPanResponderMove: (e) => locate(e.nativeEvent.locationX),
      onPanResponderRelease: () => setActive(null),
    }),
  ).current;

  if (data.length < 2) return null;
  const color = up ? theme.up : theme.down;
  const hi = active ?? data.length - 1;
  const point = data[hi];

  return (
    <View>
      <View style={s.header}>
        <Text style={s.date}>{new Date(point.t).toLocaleDateString("fr-FR")}</Text>
        <Text style={s.val}>{formatPrice(point.p)}</Text>
      </View>
      <View {...pan.panHandlers}>
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id="pfgm" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color} stopOpacity={0.22} />
              <Stop offset="1" stopColor={color} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Path d={area} fill="url(#pfgm)" />
          <Path d={line} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" />
          {active !== null && <Line x1={xs[hi]} y1={0} x2={xs[hi]} y2={height} stroke={theme.muted} strokeWidth={1} strokeDasharray="3 3" />}
          <Circle cx={xs[hi]} cy={ys[hi]} r={4.5} fill={color} stroke="#fff" strokeWidth={1.5} />
        </Svg>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  date: { fontSize: 11, color: theme.muted },
  val: { fontSize: 13, fontWeight: "800", color: theme.ink },
});
