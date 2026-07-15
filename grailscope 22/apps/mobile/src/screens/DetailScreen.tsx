import { useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, useWindowDimensions } from "react-native";
import { useRoute, type RouteProp } from "@react-navigation/native";
import {
  computeSignal,
  formatPrice,
  formatPct,
  signalLabel,
  categoryIcon,
  availabilityStyle,
} from "@grailscope/core";
import { useStore } from "../store";
import { theme, sigColors } from "../theme";
import { PortfolioChart } from "../components/PortfolioChart";
import type { RootStackParamList } from "../navigation";

export function DetailScreen() {
  const route = useRoute<RouteProp<RootStackParamList, "Detail">>();
  const { assets, favs, toggleFav, email, hasSignalAlert, toggleSignalAlert, hasHolding, setHolding, removeHolding } = useStore();
  const asset = assets.find((a) => a.id === route.params.id);
  const [range, setRange] = useState(90);
  const { width } = useWindowDimensions();

  if (!asset) return null;
  const result = computeSignal(asset);
  const up = asset.change30d >= 0;
  const c = sigColors(result.signal);
  const av = availabilityStyle[asset.availability] ?? availabilityStyle["Hors marché"];
  const isFav = favs.has(asset.id);
  const hist = asset.history.slice(-range);

  const Metric = ({ l, v, color }: { l: string; v: string; color?: string }) => (
    <View style={s.metric}>
      <Text style={s.metricLbl}>{l}</Text>
      <Text style={[s.metricVal, color ? { color } : null]}>{v}</Text>
    </View>
  );

  return (
    <ScrollView style={{ backgroundColor: theme.bg }} contentContainerStyle={{ padding: 18, paddingBottom: 40 }}>
      <View style={s.head}>
        <View style={s.thumb}>
          <Text style={{ fontSize: 28 }}>{asset.icon}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.name}>{asset.name}</Text>
          <Text style={s.meta}>
            {asset.category} · {asset.meta}
          </Text>
        </View>
        <Pressable onPress={() => toggleFav(asset.id)}>
          <Text style={{ fontSize: 24, color: isFav ? "#f5b301" : "#d3d9e4" }}>{isFav ? "★" : "☆"}</Text>
        </Pressable>
      </View>

      <View style={{ flexDirection: "row", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
        <View style={[s.pill, { backgroundColor: av.bg }]}>
          <Text style={[s.pillTxt, { color: av.color }]}>{av.glyph} {asset.availability}</Text>
        </View>
        {asset.estimate && (
          <View style={[s.pill, { backgroundColor: theme.soft }]}>
            <Text style={[s.pillTxt, { color: theme.muted }]}>Valeur estimée</Text>
          </View>
        )}
      </View>
      <View style={s.priceRow}>
        <Text style={s.price}>
          {asset.estimate ? "≈ " : ""}
          {formatPrice(asset.price, asset.currency)}
        </Text>
        <Text style={[s.chg, { color: up ? theme.up : theme.down }]}>
          {up ? "▲" : "▼"} {formatPct(asset.change30d)} 30j
        </Text>
      </View>
      <View style={[s.pill, { backgroundColor: c.bg, alignSelf: "flex-start", marginTop: 6 }]}>
        <Text style={[s.pillTxt, { color: c.fg }]}>{signalLabel[result.signal]}</Text>
      </View>
      {(asset.provenance || asset.lastSale) && (
        <Text style={{ fontSize: 12.5, color: theme.muted, marginTop: 8, lineHeight: 18 }}>
          {asset.provenance ? `Détenteur : ${asset.provenance}. ` : ""}
          {asset.lastSale
            ? `Dernière vente : ${formatPrice(asset.lastSale.price, asset.currency)} en ${asset.lastSale.year} (${asset.lastSale.venue}).`
            : ""}
        </Text>
      )}

      <View style={s.chartBox}>
        <PortfolioChart data={hist} width={width - 36 - 24} height={170} />
        <View style={{ flexDirection: "row", gap: 6, marginTop: 8 }}>
          {[30, 60, 90].map((r) => (
            <Pressable key={r} style={[s.range, range === r && s.rangeOn]} onPress={() => setRange(r)}>
              <Text style={[s.rangeTxt, range === r && { color: "#fff" }]}>{r}j</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={s.grid}>
        <Metric l="Juste valeur" v={formatPrice(asset.fairValue, asset.currency)} />
        <Metric l="Écart au prix" v={formatPct(result.fairGapPct)} color={result.fairGapPct > 0 ? theme.down : theme.up} />
        <Metric l="Confiance" v={`${result.confidence}/100`} />
        <Metric l="Liquidité" v={asset.liquidity} />
        <Metric l="Détention moy." v={asset.avgHold} />
        <Metric l="Catégorie" v={`${categoryIcon[asset.category]} ${asset.category}`} />
      </View>

      <View style={[s.reco, { backgroundColor: c.bg }]}>
        <Text style={{ fontSize: 22 }}>{result.signal === "BUY" ? "📈" : result.signal === "SELL" ? "📉" : "⏸️"}</Text>
        <View style={{ flex: 1 }}>
          <Text style={s.recoTitle}>
            {signalLabel[result.signal]}{" "}
            {result.signal === "BUY" ? "— fenêtre favorable" : result.signal === "SELL" ? "— fenêtre de sortie" : "— surveiller"}
          </Text>
          <Text style={s.recoTxt}>{result.rationale}</Text>
        </View>
      </View>

      {email && (
        <Pressable
          style={[s.btn, s.btnSec, { marginTop: 14, backgroundColor: hasSignalAlert(asset.id) ? theme.accentSoft : "#fff", borderColor: hasSignalAlert(asset.id) ? theme.accent : theme.line }]}
          onPress={() => toggleSignalAlert(asset.id)}
        >
          <Text style={[s.btnSecTxt, hasSignalAlert(asset.id) && { color: theme.accent }]}>
            {hasSignalAlert(asset.id) ? "🔔 Alerte signal active" : "🔔 M'alerter (changement de signal)"}
          </Text>
        </Pressable>
      )}
      {email && (
        <Pressable
          style={[s.btn, s.btnSec, { marginTop: 9, backgroundColor: hasHolding(asset.id) ? theme.accentSoft : "#fff", borderColor: hasHolding(asset.id) ? theme.accent : theme.line }]}
          onPress={() => (hasHolding(asset.id) ? removeHolding(asset.id) : setHolding(asset.id, 1, asset.price))}
        >
          <Text style={[s.btnSecTxt, hasHolding(asset.id) && { color: theme.accent }]}>
            {hasHolding(asset.id) ? "💼 Dans le portefeuille — retirer" : "💼 J'en possède (1 à la cote)"}
          </Text>
        </Pressable>
      )}
      <View style={{ flexDirection: "row", gap: 9, marginTop: 14 }}>
        <Pressable style={[s.btn, s.btnSec]} onPress={() => toggleFav(asset.id)}>
          <Text style={s.btnSecTxt}>{isFav ? "★ Suivi" : "☆ Suivre"}</Text>
        </Pressable>
        <Pressable style={[s.btn, s.btnPrim]}>
          <Text style={s.btnPrimTxt}>Offres au juste prix</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", gap: 13, marginBottom: 4 },
  thumb: { width: 58, height: 58, borderRadius: 16, backgroundColor: theme.soft, borderWidth: 1, borderColor: theme.line, alignItems: "center", justifyContent: "center" },
  name: { fontSize: 18, fontWeight: "800", color: theme.ink },
  meta: { fontSize: 12.5, color: theme.muted, marginTop: 2 },
  priceRow: { flexDirection: "row", alignItems: "baseline", gap: 12, marginTop: 14 },
  price: { fontSize: 30, fontWeight: "800", color: theme.ink, letterSpacing: -1 },
  chg: { fontSize: 14, fontWeight: "700" },
  pill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 7 },
  pillTxt: { fontSize: 12, fontWeight: "800" },
  chartBox: { borderWidth: 1, borderColor: theme.line, borderRadius: 16, padding: 12, marginVertical: 12 },
  range: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 9, borderWidth: 1, borderColor: theme.line },
  rangeOn: { backgroundColor: theme.ink, borderColor: theme.ink },
  rangeTxt: { fontSize: 12, fontWeight: "600", color: theme.muted },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  metric: { width: "47%", flexGrow: 1, backgroundColor: theme.soft, borderWidth: 1, borderColor: theme.line, borderRadius: 13, padding: 11 },
  metricLbl: { fontSize: 10.5, color: theme.muted, fontWeight: "700", textTransform: "uppercase" },
  metricVal: { fontSize: 16, fontWeight: "800", color: theme.ink, marginTop: 4 },
  reco: { flexDirection: "row", gap: 11, borderRadius: 16, padding: 14, marginTop: 12 },
  recoTitle: { fontSize: 14, fontWeight: "700", color: theme.ink, marginBottom: 3 },
  recoTxt: { fontSize: 12.5, color: "#33405a", lineHeight: 19 },
  btn: { flex: 1, height: 46, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  btnSec: { backgroundColor: "#fff", borderWidth: 1, borderColor: theme.line },
  btnSecTxt: { fontWeight: "700", color: theme.ink },
  btnPrim: { backgroundColor: theme.accent },
  btnPrimTxt: { fontWeight: "700", color: "#fff" },
});
