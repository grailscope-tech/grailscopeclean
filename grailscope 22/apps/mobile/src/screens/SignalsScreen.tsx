import { useMemo } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { topSignals, formatPct, signalLabel } from "@grailscope/core";
import { useStore } from "../store";
import { theme, sigColors } from "../theme";
import type { Nav } from "../navigation";

export function SignalsScreen() {
  const { assets } = useStore();
  const nav = useNavigation<Nav>();
  const signals = useMemo(() => topSignals(assets, 12), [assets]);

  return (
    <ScrollView style={{ backgroundColor: theme.bg }} contentContainerStyle={{ padding: 18, paddingBottom: 40 }}>
      <Text style={s.title}>Signaux</Text>
      <Text style={s.sub}>Meilleures fenêtres achat / vente détectées aujourd'hui</Text>
      <View style={{ marginTop: 14 }}>
        {signals.map(({ asset, result }) => {
          const c = sigColors(result.signal);
          const buy = result.signal === "BUY";
          return (
            <Pressable
              key={asset.id}
              style={[s.card, { borderLeftWidth: 4, borderLeftColor: buy ? theme.up : theme.down }]}
              onPress={() => nav.navigate("Detail", { id: asset.id })}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
                <View style={[s.pill, { backgroundColor: c.bg }]}>
                  <Text style={[s.pillTxt, { color: c.fg }]}>{signalLabel[result.signal]}</Text>
                </View>
                <Text style={s.nm}>{asset.name}</Text>
                <Text style={[s.gap, { color: result.fairGapPct > 0 ? theme.down : theme.up }]}>{formatPct(result.fairGapPct)}</Text>
              </View>
              <Text style={s.desc}>{result.rationale}</Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  title: { fontSize: 22, fontWeight: "800", color: theme.ink, letterSpacing: -0.6 },
  sub: { color: theme.muted, fontSize: 13, marginTop: 2 },
  card: { borderWidth: 1, borderColor: theme.line, borderRadius: 16, padding: 14, marginBottom: 11 },
  pill: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  pillTxt: { fontSize: 10, fontWeight: "800" },
  nm: { fontWeight: "700", fontSize: 14, color: theme.ink, flex: 1 },
  gap: { fontWeight: "800", fontSize: 13 },
  desc: { fontSize: 12.5, color: theme.muted, marginTop: 7, lineHeight: 18 },
});
