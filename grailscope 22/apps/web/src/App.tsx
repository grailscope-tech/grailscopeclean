import { useEffect, useMemo, useState } from "react";
import {
  type Asset,
  type Category,
  buildIndices,
  computeSignal,
  topSignals,
  formatPrice,
  formatPct,
  signalLabel,
  availabilityStyle,
  isTradable,
} from "@grailscope/core";

type AvailFilter = "all" | "tradable" | "off";

function AvailBadge({ a, small }: { a: Asset; small?: boolean }) {
  const st = availabilityStyle[a.availability] ?? availabilityStyle["Hors marché"];
  return (
    <span
      style={{
        background: st.bg,
        color: st.color,
        fontSize: small ? 10 : 11,
        fontWeight: 700,
        padding: small ? "2px 6px" : "3px 8px",
        borderRadius: 6,
        whiteSpace: "nowrap",
      }}
    >
      {st.glyph} {a.availability}
    </span>
  );
}
import { dataSource } from "./data";
import { useAuth } from "./auth";
import { Sparkline } from "./components/Sparkline";
import { DetailModal } from "./components/DetailModal";
import { AuthModal } from "./components/AuthModal";
import { AlertsModal } from "./components/AlertsModal";
import { PortfolioModal } from "./components/PortfolioModal";

const CATS: (Category | "all")[] = ["all", "Art", "Luxe", "Sport", "Culture"];
const sigClass = (s: string) => (s === "BUY" ? "buy" : s === "SELL" ? "sell" : "hold");

export function App() {
  const { favs, toggleFav, email, logout, notifications, unread, markNotificationsRead, portfolio } = useAuth();
  const [bellOpen, setBellOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [portfolioOpen, setPortfolioOpen] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [filter, setFilter] = useState<Category | "all">("all");
  const [avail, setAvail] = useState<AvailFilter>("all");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    dataSource.listAssets().then(setAssets);
  }, []);

  const indices = useMemo(() => buildIndices(assets), [assets]);
  const signals = useMemo(() => topSignals(assets, 4), [assets]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return assets
      .filter((a) => filter === "all" || a.category === filter)
      .filter((a) => avail === "all" || (avail === "tradable" ? isTradable(a) : !isTradable(a)))
      .filter((a) => !q || a.name.toLowerCase().includes(q) || a.category.toLowerCase().includes(q) || a.meta.toLowerCase().includes(q))
      .sort((a, b) => b.change30d - a.change30d);
  }, [assets, filter, avail, query]);

  const watchlist = assets.filter((a) => favs.has(a.id));
  const openAsset = assets.find((a) => a.id === openId) ?? null;

  return (
    <>
      <header>
        <div className="wrap nav">
          <div className="logo" onClick={() => setFilter("all")}>
            <span className="mark">◎</span> GrailScope <small>BETA</small>
          </div>
          <div className="links">
            {CATS.map((c) => (
              <button key={c} className={filter === c ? "active" : ""} onClick={() => setFilter(c)}>
                {c === "all" ? "Marché" : c}
              </button>
            ))}
          </div>
          <div className="search">
            <input placeholder="Rechercher un objet, une marque, un artiste…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          {email ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10, position: "relative" }}>
              <button className="btn ghost" title="Mon portefeuille" onClick={() => setPortfolioOpen(true)}>
                💼 {portfolio && portfolio.items.length > 0 ? new Intl.NumberFormat("fr-FR", { notation: "compact" }).format(portfolio.totalValue) + " €" : "Portefeuille"}
              </button>
              <button
                className="btn ghost"
                title="Notifications"
                onClick={() => {
                  setBellOpen((o) => !o);
                  if (!bellOpen) markNotificationsRead();
                }}
                style={{ position: "relative", width: 44, padding: 0 }}
              >
                🔔
                {unread > 0 && (
                  <span style={{ position: "absolute", top: 4, right: 4, background: "var(--down)", color: "#fff", fontSize: 10, fontWeight: 800, borderRadius: 9, minWidth: 16, height: 16, lineHeight: "16px", padding: "0 4px" }}>
                    {unread}
                  </span>
                )}
              </button>
              {bellOpen && (
                <div style={{ position: "absolute", top: 50, right: 0, width: 320, maxHeight: 380, overflow: "auto", background: "#fff", border: "1px solid var(--line)", borderRadius: 14, boxShadow: "0 20px 50px rgba(0,0,0,.2)", zIndex: 60 }}>
                  <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: "var(--ink)" }}>Alertes</span>
                    <button
                      onClick={() => { setBellOpen(false); setAlertsOpen(true); }}
                      style={{ background: "none", border: "none", color: "var(--accent)", fontWeight: 700, fontSize: 12.5, cursor: "pointer", padding: 0 }}
                    >
                      Gérer mes alertes
                    </button>
                  </div>
                  {notifications.length === 0 ? (
                    <div style={{ padding: 20, color: "var(--muted)", fontSize: 13, textAlign: "center" }}>
                      Aucune alerte pour l'instant.
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div key={n.id} style={{ padding: "11px 14px", borderBottom: "1px solid var(--line)", fontSize: 13, color: "var(--ink)" }}>
                        {n.message}
                        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 3 }}>{new Date(n.created_at).toLocaleString("fr-FR")}</div>
                      </div>
                    ))
                  )}
                </div>
              )}
              <span style={{ fontSize: 13, color: "#c4cfe6" }} title={email}>
                {email}
              </span>
              <button className="btn ghost" onClick={logout}>
                Déconnexion
              </button>
            </div>
          ) : (
            <button className="btn ghost" onClick={() => setAuthOpen(true)}>
              Se connecter
            </button>
          )}
        </div>
      </header>

      <div className="wrap hero">
        <h1>Le marché des objets de collection, enfin lisible.</h1>
        <p>
          GrailScope agrège les données de l'art, du luxe, du sport et de la culture en un seul hub. Suivez les
          tendances, repérez le bon moment pour acheter ou vendre, au juste prix.{" "}
          <span className="tag">Sans transaction · données indicatives</span>
        </p>
        <div className="indices">
          {indices.map((idx) => {
            const up = idx.change30d >= 0;
            return (
              <div key={idx.category} className="idx" onClick={() => setFilter(idx.category)}>
                <div className="cat">
                  <span className="dot" style={{ background: up ? "var(--up)" : "var(--down)" }} />
                  Indice {idx.category}
                </div>
                <div className="val">{idx.value.toLocaleString("fr-FR")} pts</div>
                <div className={`chg ${up ? "up" : "down"}`}>
                  {up ? "▲" : "▼"} {formatPct(idx.change30d)} · 30j
                </div>
                <div style={{ marginTop: 8 }}>
                  <Sparkline data={idx.history} up={up} width={160} height={34} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="wrap grid">
        <div>
          <div className="card">
            <h2>Tendances du marché</h2>
            <div className="sub">
              {filtered.length} objets · cote ou estimation · inclut les pièces hors-marché
            </div>
            <div className="filters">
              {CATS.map((c) => (
                <div key={c} className={`chip ${filter === c ? "active" : ""}`} onClick={() => setFilter(c)}>
                  {c === "all" ? "Tout" : c}
                </div>
              ))}
              <span style={{ width: 1, background: "var(--line)", margin: "0 4px" }} />
              {(
                [
                  ["all", "Tous statuts"],
                  ["tradable", "● Négociables"],
                  ["off", "🔒 Hors marché"],
                ] as [AvailFilter, string][]
              ).map(([v, label]) => (
                <div key={v} className={`chip ${avail === v ? "active" : ""}`} onClick={() => setAvail(v)}>
                  {label}
                </div>
              ))}
            </div>
            <table>
              <thead>
                <tr>
                  <th style={{ width: 30 }} />
                  <th>Objet</th>
                  <th>Signal</th>
                  <th className="r">Cote</th>
                  <th className="r">30j</th>
                  <th>Tendance</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => {
                  const up = a.change30d >= 0;
                  const sig = computeSignal(a).signal;
                  return (
                    <tr key={a.id} className="row" onClick={() => setOpenId(a.id)}>
                      <td>
                        <button
                          className={`star ${favs.has(a.id) ? "on" : ""}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFav(a.id);
                          }}
                        >
                          {favs.has(a.id) ? "★" : "☆"}
                        </button>
                      </td>
                      <td>
                        <div className="asset">
                          <div className="thumb">{a.icon}</div>
                          <div>
                            <div className="nm">{a.name}</div>
                            <div className="mt" style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                              <span>
                                {a.category} · {a.meta}
                              </span>
                              <AvailBadge a={a} small />
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`pill ${sigClass(sig)}`}>{signalLabel[sig]}</span>
                      </td>
                      <td className="r price">
                        {a.estimate ? "≈ " : ""}
                        {formatPrice(a.price, a.currency)}
                      </td>
                      <td className={`r ${up ? "up" : "down"}`} style={{ fontWeight: 700 }}>
                        {formatPct(a.change30d)}
                      </td>
                      <td>
                        <Sparkline data={a.history} up={up} />
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", color: "var(--muted)", padding: 30 }}>
                      Aucun objet ne correspond.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <div className="card" style={{ marginBottom: 22 }}>
            <h2>
              Ma watchlist{" "}
              <span style={{ color: "var(--muted)", fontWeight: 500 }}>{watchlist.length ? `(${watchlist.length})` : ""}</span>
            </h2>
            <div className="sub">
              {email ? "Synchronisée sur votre compte ☁︎" : "Cliquez ★ pour suivre · "}
              {!email && (
                <button onClick={() => setAuthOpen(true)} style={{ background: "none", border: "none", color: "var(--accent)", fontWeight: 700, cursor: "pointer", padding: 0, font: "inherit" }}>
                  connectez-vous pour la synchroniser
                </button>
              )}
            </div>
            <div style={{ marginTop: 8 }}>
              {watchlist.length === 0 ? (
                <div className="wl-empty">
                  Aucun objet suivi.
                  <br />
                  Ajoutez vos « graals » avec l'étoile ★.
                </div>
              ) : (
                watchlist.map((a) => {
                  const up = a.change30d >= 0;
                  return (
                    <div key={a.id} className="wl-item" onClick={() => setOpenId(a.id)}>
                      <div className="thumb" style={{ width: 36, height: 36, fontSize: 17 }}>
                        {a.icon}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="nm" style={{ fontWeight: 700, fontSize: 13.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {a.name}
                        </div>
                        <div className="mt" style={{ fontSize: 12, color: "var(--muted)" }}>
                          {formatPrice(a.price, a.currency)}
                        </div>
                      </div>
                      <div className={up ? "up" : "down"} style={{ fontWeight: 700, fontSize: 13 }}>
                        {formatPct(a.change30d)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="card">
            <h2>Signaux du jour</h2>
            <div className="sub">Meilleures fenêtres achat / vente détectées</div>
            <div style={{ marginTop: 6 }}>
              {signals.map(({ asset, result }) => (
                <div key={asset.id} className="signal-card" onClick={() => setOpenId(asset.id)}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span className={`pill ${sigClass(result.signal)}`}>{signalLabel[result.signal]}</span>
                    <span style={{ fontWeight: 700, fontSize: 13.5 }}>{asset.name}</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 5 }}>
                    {formatPct(result.fairGapPct)} vs juste valeur · confiance {result.confidence}/100
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <footer>
        <div className="wrap footrow">
          <div>
            <strong>GrailScope</strong> — Track. Time. Trade fair.
          </div>
          <div>Données indicatives · {assets.length} objets suivis</div>
        </div>
      </footer>

      {openAsset && (
        <DetailModal asset={openAsset} isFav={favs.has(openAsset.id)} onToggleFav={toggleFav} onClose={() => setOpenId(null)} />
      )}
      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
      {alertsOpen && <AlertsModal assets={assets} onClose={() => setAlertsOpen(false)} />}
      {portfolioOpen && <PortfolioModal onClose={() => setPortfolioOpen(false)} />}
    </>
  );
}
