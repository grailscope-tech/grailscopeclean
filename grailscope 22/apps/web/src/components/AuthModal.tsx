import { useState } from "react";
import { useAuth } from "../auth";

export function AuthModal({ onClose }: { onClose: () => void }) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "login") await login(email, password);
      else await register(email, password);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 420 }}>
        <div className="mhead">
          <div>
            <h3>{mode === "login" ? "Se connecter" : "Créer un compte"}</h3>
            <div className="mt">Synchronisez votre watchlist sur tous vos appareils</div>
          </div>
          <button className="mclose" onClick={onClose}>
            ✕
          </button>
        </div>
        <form className="mbody" onSubmit={submit}>
          <label style={{ fontSize: 13, fontWeight: 700, color: "var(--muted)" }}>E-mail</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
            style={inputStyle}
            placeholder="vous@exemple.com"
          />
          <label style={{ fontSize: 13, fontWeight: 700, color: "var(--muted)", marginTop: 14, display: "block" }}>
            Mot de passe
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            style={inputStyle}
            placeholder="8 caractères minimum"
          />
          {error && (
            <div style={{ background: "var(--down-soft)", color: "var(--down)", padding: "10px 12px", borderRadius: 10, fontSize: 13, marginTop: 14, fontWeight: 600 }}>
              {error}
            </div>
          )}
          <button className="btn" type="submit" disabled={busy} style={{ width: "100%", height: 46, marginTop: 18 }}>
            {busy ? "…" : mode === "login" ? "Se connecter" : "Créer mon compte"}
          </button>
          <div style={{ textAlign: "center", fontSize: 13, color: "var(--muted)", marginTop: 14 }}>
            {mode === "login" ? "Pas encore de compte ? " : "Déjà inscrit ? "}
            <button
              type="button"
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setError(null);
              }}
              style={{ background: "none", border: "none", color: "var(--accent)", fontWeight: 700, cursor: "pointer" }}
            >
              {mode === "login" ? "Créer un compte" : "Se connecter"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 44,
  borderRadius: 12,
  border: "1px solid var(--line)",
  background: "var(--soft)",
  padding: "0 14px",
  fontSize: 14,
  outline: "none",
  marginTop: 6,
};
