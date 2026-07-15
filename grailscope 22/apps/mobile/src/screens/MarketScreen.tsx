import { useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, TextInput } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { type Category, buildIndices, formatPct, categoryIcon } from "@grailscope/core";
import { useStore } from "../store";
import { theme } from "../theme";
import { Sparkline } from "../components/Sparkline";
import { AssetRow } from "../components/AssetRow";
import type { Nav } from "../navigation";

const CATS: (Category | "all")[] = ["all", "Art", "Luxe", "Sport", "Culture"];

export function MarketScreen() {
  const { assets } = useStore();
  const nav = useNavigation<Nav>();
  const [cat, setCat] = useState<Category | "all">("all");
  const [q, setQ] = useState("");

  const indices = useMemo(() => buildIndices(assets), [assets]);
  const list = useMemo(() => {
    const query = q.toLowerCase().trim();
    return assets
      .filter((a) => cat === "all" || a.category === cat)
      .filter((a) => !query || a.name.toLowerCase().includes(query) || a.meta.toLowerCase().includes(query))
      .sort((a, b) => b.change30d - a.change30d);
  }, [assets, cat, q]);

  return (
    <ScrollView style={{ backgroundColor: theme.bg }} contentContainerStyle={{ padding: 18, paddingBottom: 40 }}>
      <Text style={s.title}>Marché</Text>
      <Text style={s.subtitle}>Indices par catégorie · 30 jours</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 12 }}>
        {indices.map((idx) => {
          const up = idx.change30d >= 0;
          return (
            <Pressable key={idx.category} style={s.idxCard} onPress={() => setCat(idx.category)}>
              <Text style={s.idxCat}>
                {categoryIcon[idx.category]} {idx.category}
              </Text>
              <Text style={s.idxVal}>{idx.value.toLocaleString("fr-FR")}</Text>
              <Text style={[s.idxChg, { color: up ? theme.up : theme.down }]}>
                {up ? "▲" : "▼"} {formatPct(idx.change30d)}
              </Text>
              <View style={{ marginTop: 4 }}>
                <Sparkline data={idx.history} up={up} width={120} height={28} />
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      <TextInput style={s.search} placeholder="Rechercher un graal…" placeholderTextColor={theme.muted} value={q} onChangeText={setQ} />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 12 }}>
        {CATS.map((c) => {
          const active = cat === c;
          return (
            <Pressable key={c} style={[s.chip, active && s.chipOn]} onPress={() => setCat(c)}>
              <Text style={[s.chipTxt, active && { color: "#fff" }]}>{c === "all" ? "Tout" : c}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {list.map((a) => (
        <AssetRow key={a.id} asset={a} onPress={() => nav.navigate("Detail", { id: a.id })} />
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  title: { fontSize: 22, fontWeight: "800", color: theme.ink, letterSpacing: -0.6 },
  subtitle: { color: theme.muted, fontSize: 13, marginTop: 2 },
  idxCard: { width: 150, borderWidth: 1, borderColor: theme.line, borderRadius: 16, padding: 13, marginRight: 12 },
  idxCat: { fontSize: 12, color: theme.muted, fontWeight: "600" },
  idxVal: { fontSize: 18, fontWeight: "800", color: theme.ink, marginTop: 6 },
  idxChg: { fontSize: 12, fontWeight: "700", marginTop: 1 },
  search: { height: 42, borderRadius: 13, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.soft, paddingHorizontal: 14, fontSize: 14, color: theme.ink },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99, borderWidth: 1, borderColor: theme.line, backgroundColor: "#fff", marginRight: 8 },
  chipOn: { backgroundColor: theme.ink, borderColor: theme.ink },
  chipTxt: { fontSize: 13, fontWeight: "600", color: theme.muted },
});
