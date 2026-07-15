import { View, Text, Pressable, StyleSheet } from "react-native";
import { type Asset, computeSignal, formatPrice, formatPct, signalLabel, availabilityStyle } from "@grailscope/core";
import { theme, sigColors } from "../theme";
import { Sparkline } from "./Sparkline";

export function AssetRow({ asset, onPress }: { asset: Asset; onPress: () => void }) {
  const up = asset.change30d >= 0;
  const sig = computeSignal(asset).signal;
  const c = sigColors(sig);
  const av = availabilityStyle[asset.availability] ?? availabilityStyle["Hors marché"];
  return (
    <Pressable style={s.row} onPress={onPress}>
      <View style={s.thumb}>
        <Text style={{ fontSize: 22 }}>{asset.icon}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={s.nm} numberOfLines={1}>
          {asset.name}
        </Text>
        <Text style={s.mt}>
          {asset.category} · {asset.meta}
        </Text>
        <View style={{ flexDirection: "row", gap: 6, marginTop: 4 }}>
          <View style={[s.pill, { backgroundColor: c.bg }]}>
            <Text style={[s.pillTxt, { color: c.fg }]}>{signalLabel[sig]}</Text>
          </View>
          <View style={[s.pill, { backgroundColor: av.bg }]}>
            <Text style={[s.pillTxt, { color: av.color }]} numberOfLines={1}>
              {av.glyph} {asset.availability}
            </Text>
          </View>
        </View>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={s.price}>
          {asset.estimate ? "≈ " : ""}
          {formatPrice(asset.price, asset.currency)}
        </Text>
        <Text style={[s.chg, { color: up ? theme.up : theme.down }]}>{formatPct(asset.change30d)}</Text>
        <View style={{ marginTop: 3 }}>
          <Sparkline data={asset.history} up={up} />
        </View>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.line },
  thumb: { width: 46, height: 46, borderRadius: 13, backgroundColor: theme.soft, borderWidth: 1, borderColor: theme.line, alignItems: "center", justifyContent: "center" },
  nm: { fontWeight: "700", fontSize: 14.5, color: theme.ink },
  mt: { fontSize: 12, color: theme.muted, marginTop: 1 },
  pill: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  pillTxt: { fontSize: 10, fontWeight: "800" },
  price: { fontWeight: "700", fontSize: 14, color: theme.ink },
  chg: { fontSize: 12.5, fontWeight: "700", marginTop: 1 },
});
