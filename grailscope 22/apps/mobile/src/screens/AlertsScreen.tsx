import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useStore } from "../store";
import { theme } from "../theme";
import type { Nav } from "../navigation";

const KIND_LABEL: Record<string, string> = { signal: "Signal Acheter/Vendre", above: "Cote ≥", below: "Cote ≤" };

export function AlertsScreen() {
  const { email, notifications, alerts, removeAlert, assets, logout } = useStore();
  const nav = useNavigation<Nav>();
  const assetName = (id: string) => assets.find((a) => a.id === id)?.name ?? id;

  if (!email) {
    return (
      <ScrollView style={{ backgroundColor: theme.bg }} contentContainerStyle={{ padding: 18 }}>
        <Text style={s.title}>Alertes</Text>
        <View style={{ alignItems: "center", padding: 40 }}>
          <Text style={{ fontSize: 40 }}>🔔</Text>
          <Text style={{ color: theme.muted, marginTop: 12, textAlign: "center", lineHeight: 20 }}>
            Connectez-vous pour créer des alertes de prix{"\n"}et recevoir des notifications.
          </Text>
          <Pressable style={s.cta} onPress={() => nav.navigate("Login")}>
            <Text style={s.ctaTxt}>Se connecter</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: theme.bg }} contentContainerStyle={{ padding: 18, paddingBottom: 40 }}>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Text style={s.title}>Alertes</Text>
        <Pressable style={{ marginLeft: "auto" }} onPress={logout}>
          <Text style={{ color: theme.accent, fontWeight: "700", fontSize: 13 }}>Déconnexion</Text>
        </Pressable>
      </View>
      <Text style={s.sub}>☁︎ {email}</Text>

      <Text style={s.sectionTitle}>Notifications récentes</Text>
      {notifications.length === 0 ? (
        <Text style={s.empty}>Aucune notification pour l'instant.</Text>
      ) : (
        notifications.slice(0, 12).map((n) => (
          <View key={n.id} style={s.notif}>
            <Text style={s.notifTxt}>{n.message}</Text>
            <Text style={s.notifDate}>{new Date(n.created_at).toLocaleString("fr-FR")}</Text>
          </View>
        ))
      )}

      <Text style={s.sectionTitle}>Mes alertes ({alerts.length})</Text>
      {alerts.length === 0 ? (
        <Text style={s.empty}>Aucune alerte. Ouvrez une fiche objet et touchez « 🔔 M'alerter ».</Text>
      ) : (
        alerts.map((a) => (
          <View key={a.id} style={s.alertRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.alertName} numberOfLines={1}>{assetName(a.asset_id)}</Text>
              <Text style={s.alertKind}>
                {KIND_LABEL[a.kind]}
                {a.threshold != null ? ` ${a.threshold.toLocaleString("fr-FR")} €` : ""}
              </Text>
            </View>
            <Pressable onPress={() => removeAlert(a.id)} hitSlop={8}>
              <Text style={s.alertDel}>Supprimer</Text>
            </Pressable>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  title: { fontSize: 22, fontWeight: "800", color: theme.ink, letterSpacing: -0.6 },
  sub: { color: theme.muted, fontSize: 13, marginTop: 2 },
  sectionTitle: { fontSize: 12, fontWeight: "800", color: theme.muted, textTransform: "uppercase", marginTop: 20, marginBottom: 8 },
  empty: { color: theme.muted, fontSize: 13.5, lineHeight: 19 },
  notif: { backgroundColor: theme.soft, borderWidth: 1, borderColor: theme.line, borderRadius: 12, padding: 11, marginBottom: 7 },
  notifTxt: { fontSize: 13.5, color: theme.ink },
  notifDate: { fontSize: 11, color: theme.muted, marginTop: 3 },
  alertRow: { flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: theme.line, paddingVertical: 11 },
  alertName: { fontSize: 14, fontWeight: "700", color: theme.ink },
  alertKind: { fontSize: 12, color: theme.muted, marginTop: 1 },
  alertDel: { fontSize: 12.5, fontWeight: "700", color: theme.down },
  cta: { backgroundColor: theme.accent, borderRadius: 13, paddingVertical: 13, paddingHorizontal: 28, marginTop: 18 },
  ctaTxt: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
