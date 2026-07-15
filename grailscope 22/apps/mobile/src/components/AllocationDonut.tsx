import { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Svg, { Path, G, Text as SvgText } from "react-native-svg";
import { type PortfolioSummary, portfolioAllocation, categoryColor, formatPrice } from "@grailscope/core";
import { theme } from "../theme";

const R = 58, IR = 36, CX = 70, CY = 70;
function arc(start: number, end: number) {
  const p = (a: number, r: number) => [CX + r * Math.cos(a), CY + r * Math.sin(a)];
  const a0 = (start / 100) * 2 * Math.PI - Math.PI / 2;
  const a1 = (end / 100) * 2 * Math.PI - Math.PI / 2;
  const big = end - start > 50 ? 1 : 0;
  const [x0, y0] = p(a0, R), [x1, y1] = p(a1, R), [x2, y2] = p(a1, IR), [x3, y3] = p(a0, IR);
  return `M${x0} ${y0} A${R} ${R} 0 ${big} 1 ${x1} ${y1} L${x2} ${y2} A${IR} ${IR} 0 ${big} 0 ${x3} ${y3} Z`;
}

/** Tap a slice (or legend row) to focus a category. */
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
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <Svg width={140} height={140}>
        <G>
          {segs.map((s, i) => (
            <Path
              key={s.category}
              d={arc(s.start, s.end)}
              fill={categoryColor[s.category]}
              opacity={active === null || active === i ? 1 : 0.35}
              stroke="#fff"
              strokeWidth={1.5}
              onPress={() => setActive(active === i ? null : i)}
            />
          ))}
          <SvgText x={CX} y={CY - 3} fontSize={10} fill={theme.muted} textAnchor="middle">
            {focus ? focus.category : "Total"}
          </SvgText>
          <SvgText x={CX} y={CY + 12} fontSize={13} fontWeight="800" fill={theme.ink} textAnchor="middle">
            {focus ? `${focus.pct.toFixed(0)}%` : formatPrice(summary.totalValue).replace("€ ", "")}
          </SvgText>
        </G>
      </Svg>
      <View style={{ flex: 1 }}>
        {segs.map((s, i) => (
          <Pressable
            key={s.category}
            onPress={() => setActive(active === i ? null : i)}
            style={[st.row, { opacity: active === null || active === i ? 1 : 0.5 }]}
          >
            <View style={[st.dot, { backgroundColor: categoryColor[s.category] }]} />
            <Text style={st.cat}>{s.category}</Text>
            <Text style={st.pct}>{s.pct.toFixed(0)}%</Text>
            <Text style={st.val}>{formatPrice(s.value)}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: theme.line },
  dot: { width: 10, height: 10, borderRadius: 3 },
  cat: { flex: 1, fontSize: 13, fontWeight: "600", color: theme.ink },
  pct: { fontSize: 12, color: theme.muted, width: 38, textAlign: "right" },
  val: { fontSize: 12.5, fontWeight: "700", color: theme.ink, width: 78, textAlign: "right" },
});
