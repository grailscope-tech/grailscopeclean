import { useMemo, useState } from "react";
import { View, Text, ScrollView, TextInput, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useStore } from "../store";
import { theme } from "../theme";
import { AssetRow } from "../components/AssetRow";
import type { Nav } from "../navigation";

export function SearchScreen() {
  const { assets } = useStore();
  const nav = useNavigation<Nav>();
  const [q, setQ] = useState("");

  const list = useMemo(() => {
    const query = q.toLowerCase().trim();
    if (!query) return assets;
    return assets.filter(
      (a) =>
        a.name.toLowerCase().includes(query) ||
        a.category.toLowerCase().includes(query) ||
        a.meta.toLowerCase().includes(query),
    );
  }, [assets, q]);

  return (
    <ScrollView style={{ backgroundColor: theme.bg }} contentContainerStyle={{ padding: 18, paddingBottom: 40 }}>
      <Text style={s.title}>Recherche</Text>
      <TextInput style={s.search} placeholder="Objet, marque, artiste…" placeholderTextColor={theme.muted} value={q} onChangeText={setQ} autoFocus />
      <Text style={s.sub}>{q ? `${list.length} résultat(s)` : "Tapez pour filtrer le catalogue"}</Text>
      {list.map((a) => (
        <AssetRow key={a.id} asset={a} onPress={() => nav.navigate("Detail", { id: a.id })} />
      ))}
      {list.length === 0 && (
        <View style={{ alignItems: "center", padding: 50 }}>
          <Text style={{ fontSize: 40 }}>🔍</Text>
          <Text style={{ color: theme.muted, marginTop: 12 }}>Aucun objet trouvé.</Text>
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  title: { fontSize: 22, fontWeight: "800", color: theme.ink, letterSpacing: -0.6, marginBottom: 12 },
  search: { height: 44, borderRadius: 13, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.soft, paddingHorizontal: 14, fontSize: 15, color: theme.ink },
  sub: { color: theme.muted, fontSize: 13, marginTop: 10, marginBottom: 6 },
});
