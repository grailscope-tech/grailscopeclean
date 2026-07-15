import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useStore } from "../store";
import { theme } from "../theme";

export function LoginScreen() {
  const { login, register } = useStore();
  const nav = useNavigation();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      if (mode === "login") await login(email.trim(), password);
      else await register(email.trim(), password);
      nav.goBack();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={{ backgroundColor: theme.bg }} contentContainerStyle={{ padding: 22 }}>
      <Text style={s.title}>{mode === "login" ? "Se connecter" : "Créer un compte"}</Text>
      <Text style={s.sub}>Synchronisez votre watchlist sur tous vos appareils.</Text>

      <Text style={s.label}>E-mail</Text>
      <TextInput
        style={s.input}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="vous@exemple.com"
        placeholderTextColor={theme.muted}
      />
      <Text style={s.label}>Mot de passe</Text>
      <TextInput
        style={s.input}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="8 caractères minimum"
        placeholderTextColor={theme.muted}
      />

      {error && <Text style={s.error}>{error}</Text>}

      <Pressable style={s.btn} onPress={submit} disabled={busy}>
        <Text style={s.btnTxt}>{busy ? "…" : mode === "login" ? "Se connecter" : "Créer mon compte"}</Text>
      </Pressable>

      <Pressable onPress={() => { setMode(mode === "login" ? "register" : "login"); setError(null); }}>
        <Text style={s.switch}>
          {mode === "login" ? "Pas encore de compte ? Créer un compte" : "Déjà inscrit ? Se connecter"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  title: { fontSize: 24, fontWeight: "800", color: theme.ink },
  sub: { color: theme.muted, fontSize: 13, marginTop: 4, marginBottom: 18 },
  label: { fontSize: 13, fontWeight: "700", color: theme.muted, marginTop: 14, marginBottom: 6 },
  input: { height: 46, borderRadius: 12, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.soft, paddingHorizontal: 14, fontSize: 15, color: theme.ink },
  error: { backgroundColor: theme.downSoft, color: theme.down, padding: 11, borderRadius: 10, fontSize: 13, fontWeight: "600", marginTop: 14, overflow: "hidden" },
  btn: { backgroundColor: theme.accent, height: 48, borderRadius: 13, alignItems: "center", justifyContent: "center", marginTop: 20 },
  btnTxt: { color: "#fff", fontWeight: "700", fontSize: 15 },
  switch: { color: theme.accent, fontWeight: "700", textAlign: "center", marginTop: 16 },
});
