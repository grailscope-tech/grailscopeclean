import { View, Text, ScrollView, StyleSheet, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { formatPrice, formatPct } from "@grailscope/core";
import { useStore } from "../store";
import { theme } from "../theme";
import { AssetRow } from "../components/AssetRow";
import { PortfolioChart } from "../components/PortfolioChart";
import { AllocationDonut } from "../components/AllocationDonut";
import type { Nav } from "../navigation";

export function WatchScreen() {
  const { assets, favs, email, logout, portfolio } = useStore();
  const nav = useNavigation<Nav>();
  const list = assets.filter((a) => favs.has(a.id));
  const pnlUp = (portfolio?.totalPnl ?? 0) >= 0;

  return (
    <ScrollView style={{ backgroundColor: theme.bg }} contentContainerStyle={{ padding: 18, paddingBottom: 40 }}>
      <Text style={s.title}>Watchlist {list.length ? `· ${list.length}` : ""}</Text>
      <Pressable
        style={s.account}
        onPress={() => (email ? logout() : nav.navigate("Login"))}
      >
        <Text style={s.accountTxt}>
          {email ? `☁︎ ${email} · Déconnexion` : "Se connecter pour synchroniser ›"}
        </Text>
      </Pressable>
      <Text style={s.sub}>{email ? "Synchronisée sur votre compte" : "Vos objets suivis (local)"}</Text>

      {email && portfolio && portfolio.items.length > 0 && (
        <View style={s.pf}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
            <Text style={s.pfLabel}>Portefeuille · {portfolio.items.length} position(s)</Text>
            <Text style={[s.pfPnl, { color: pnlUp ? theme.up : theme.down }]}>
              {pnlUp ? "+" : ""}{formatPrice(portfolio.totalPnl)} ({formatPct(portfolio.totalPnlPct)})
            </Text>
          </View>
          <Text style={s.pfValue}>{formatPrice(portfolio.totalValue)}</Text>
          {portfolio.history.length > 1 && (
            <View style={{ marginTop: 8 }}>
              <PortfolioChart data={portfolio.history} width={300} />
            </View>
          )}
          {portfolio.items.length > 0 && (
            <View style={{ marginTop: 12 }}>
              <Text style={s.pfLabel}>Allocation par catégorie</Text>
              <View style={{ marginTop: 8 }}>
                <AllocationDonut summary={portfolio} />
              </View>
            </View>
          )}
        </View>
      )}
      {list.length === 0 ? (
        <View style={{ alignItems: "center", padding: 50 }}>
          <Text style={{ fontSize: 40, color: "#d3d9e4" }}>★</Text>
          <Text style={{ color: theme.muted, marginTop: 12, textAlign: "center" }}>
            Aucun objet suivi.{"\n"}Ajoutez vos graals avec l'étoile depuis une fiche.
          </Text>
        </View>
      ) : (
        list.map((a) => <AssetRow key={a.id} asset={a} onPress={() => nav.navigate("Detail", { id: a.id })} />)
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  title: { fontSize: 22, fontWeight: "800", color: theme.ink, letterSpacing: -0.6 },
  sub: { color: theme.muted, fontSize: 13, marginTop: 2, marginBottom: 8 },
  account: { marginTop: 10, backgroundColor: theme.accentSoft, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 14 },
  accountTxt: { color: theme.accent, fontWeight: "700", fontSize: 13.5 },
  pf: { marginTop: 10, marginBottom: 4, backgroundColor: theme.soft, borderWidth: 1, borderColor: theme.line, borderRadius: 14, padding: 13 },
  pfLabel: { fontSize: 12, color: theme.muted, fontWeight: "600" },
  pfPnl: { fontSize: 13, fontWeight: "800" },
  pfValue: { fontSize: 22, fontWeight: "800", color: theme.ink, marginTop: 4 },
});
