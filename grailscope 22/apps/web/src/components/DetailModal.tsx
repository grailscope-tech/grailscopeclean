import { useState } from "react";
import {
  type Asset,
  computeSignal,
  formatPrice,
  formatPct,
  signalLabel,
  categoryIcon,
  availabilityStyle,
} from "@grailscope/core";
import { PortfolioChart } from "./PortfolioChart";
import { useAuth } from "../auth";

interface Props {
  asset: Asset;
  isFav: boolean;
  onToggleFav: (id: string) => void;
  onClose: () => void;
}

const sigClass = (s: string) => (s === "BUY" ? "buy" : s === "SELL" ? "sell" : "hold");

export function DetailModal({ asset, isFav, onToggleFav, onClose }: Props) {
  const { email, hasSignalAlert, toggleSignalAlert, setAlert, hasHolding, setHolding, removeHolding } = useAuth();
  const [range, setRange] = useState(90);
  const [threshold, setThreshold] = useState<string>("");
  const [qty, setQty] = useState<string>("1");
  const [cost, setCost] = useState<string>("");
  const result = computeSignal(asset);
  const up = asset.change30d >= 0;
  const hist = asset.history.slice(-range);

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="mhead">
          <div className="thumb">{asset.icon}</div>
          <div>
            <h3>{asset.name}</h3>
            <div className="mt">
              {asset.category} · {asset.meta}
            </div>
          </div>
          <button className="mclose" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="mbody">
          <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
            {(() => {
              const st = availabilityStyle[asset.availability] ?? availabilityStyle["Hors marché"];
              return (
                <span style={{ background: st.bg, color: st.color, fontSize: 12, fontWeight: 700, padding: "5px 10px", borderRadius: 7 }}>
                  {st.glyph} {asset.availability}
                </span>
              );
            })()}
            {asset.estimate && (
              <span style={{ background: "var(--soft)", color: "var(--muted)", fontSize: 12, fontWeight: 700, padding: "5px 10px", borderRadius: 7 }}>
                Valeur estimée
              </span>
            )}
          </div>
          <div className="pricerow">
            <div className="big">
              {asset.estimate ? "≈ " : ""}
              {formatPrice(asset.price, asset.currency)}
            </div>
            <div className={`chg ${up ? "up" : "down"}`}>
              {up ? "▲" : "▼"} {formatPct(asset.change30d)}{" "}
              <span style={{ color: "var(--muted)", fontWeight: 500 }}>/ 30j</span>
            </div>
            <div style={{ marginLeft: "auto" }}>
              <span className={`pill ${sigClass(result.signal)}`} style={{ fontSize: 13, padding: "7px 12px" }}>
                {signalLabel[result.signal]}
              </span>
            </div>
          </div>
          {(asset.provenance || asset.lastSale) && (
            <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 6 }}>
              {asset.provenance && <>Détenteur : {asset.provenance}. </>}
              {asset.lastSale && (
                <>
                  Dernière vente : {formatPrice(asset.lastSale.price, asset.currency)} en {asset.lastSale.year} ({asset.lastSale.venue}).
                </>
              )}
            </div>
          )}

          <div className="chartbox">
            <PortfolioChart data={hist} height={210} />
            <div className="range">
              {[30, 60, 90].map((r) => (
                <div key={r} className={`chip ${range === r ? "active" : ""}`} onClick={() => setRange(r)}>
                  {r}j
                </div>
              ))}
            </div>
          </div>

          <div className="metrics">
            <div className="metric">
              <div className="lbl">Juste valeur</div>
              <div className="v">{formatPrice(asset.fairValue, asset.currency)}</div>
            </div>
            <div className="metric">
              <div className="lbl">Écart au prix</div>
              <div className={`v ${result.fairGapPct > 0 ? "down" : "up"}`}>{formatPct(result.fairGapPct)}</div>
            </div>
            <div className="metric">
              <div className="lbl">Confiance</div>
              <div className="v">{result.confidence}/100</div>
            </div>
            <div className="metric">
              <div className="lbl">Liquidité</div>
              <div className="v">{asset.liquidity}</div>
            </div>
            <div className="metric">
              <div className="lbl">Détention moy.</div>
              <div className="v">{asset.avgHold}</div>
            </div>
            <div className="metric">
              <div className="lbl">Catégorie</div>
              <div className="v">
                {categoryIcon[asset.category]} {asset.category}
              </div>
            </div>
          </div>

          <div className={`reco ${sigClass(result.signal)}`}>
            <div className="ic">{result.signal === "BUY" ? "📈" : result.signal === "SELL" ? "📉" : "⏸️"}</div>
            <div>
              <h4>
                Recommandation : {signalLabel[result.signal]}{" "}
                {result.signal === "BUY"
                  ? "— fenêtre favorable"
                  : result.signal === "SELL"
                    ? "— fenêtre de sortie"
                    : "— surveiller"}
              </h4>
              <p>{result.rationale}</p>
            </div>
          </div>

          {email && (
            <div style={{ marginTop: 14, border: "1px solid var(--line)", borderRadius: 14, padding: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--muted)", marginBottom: 10 }}>🔔 Alertes</div>
              <button
                className="btn out"
                onClick={() => toggleSignalAlert(asset.id)}
                style={{ width: "100%", background: hasSignalAlert(asset.id) ? "var(--accent-soft)" : "#fff", color: hasSignalAlert(asset.id) ? "var(--accent)" : "var(--ink)", borderColor: hasSignalAlert(asset.id) ? "var(--accent)" : "var(--line)" }}
              >
                {hasSignalAlert(asset.id) ? "✓ Alerte changement de signal active" : "M'alerter quand le signal change (Acheter/Vendre)"}
              </button>
              <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center" }}>
                <input
                  type="number"
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                  placeholder={`Seuil de cote (${asset.currency})`}
                  style={{ flex: 1, height: 40, borderRadius: 10, border: "1px solid var(--line)", background: "var(--soft)", padding: "0 12px", fontSize: 14, outline: "none" }}
                />
                <button className="btn out" style={{ height: 40 }} disabled={!threshold} onClick={() => { setAlert(asset.id, "above", Number(threshold)); setThreshold(""); }}>
                  Si ≥
                </button>
                <button className="btn out" style={{ height: 40 }} disabled={!threshold} onClick={() => { setAlert(asset.id, "below", Number(threshold)); setThreshold(""); }}>
                  Si ≤
                </button>
              </div>
            </div>
          )}
          {email && (
            <div style={{ marginTop: 12, border: "1px solid var(--line)", borderRadius: 14, padding: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--muted)", marginBottom: 10 }}>💼 Portefeuille</div>
              {hasHolding(asset.id) ? (
                <button className="btn out" style={{ width: "100%" }} onClick={() => removeHolding(asset.id)}>
                  ✓ Dans votre portefeuille — retirer
                </button>
              ) : (
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="Qté" style={{ width: 70, height: 40, borderRadius: 10, border: "1px solid var(--line)", background: "var(--soft)", padding: "0 10px", fontSize: 14, outline: "none" }} />
                  <input type="number" value={cost} onChange={(e) => setCost(e.target.value)} placeholder={`Prix payé / u (${asset.currency})`} style={{ flex: 1, height: 40, borderRadius: 10, border: "1px solid var(--line)", background: "var(--soft)", padding: "0 12px", fontSize: 14, outline: "none" }} />
                  <button
                    className="btn"
                    style={{ height: 40 }}
                    disabled={!qty || !cost || Number(qty) <= 0}
                    onClick={() => setHolding(asset.id, Number(qty), Number(cost))}
                  >
                    J'en possède
                  </button>
                </div>
              )}
            </div>
          )}
          <div className="mactions">
            <button className="btn out" onClick={() => onToggleFav(asset.id)}>
              {isFav ? "★ Suivi" : "☆ Suivre"}
            </button>
            <button className="btn">
              {asset.availability === "Sur le marché"
                ? "Voir les offres au juste prix"
                : asset.availability === "Enchères à venir"
                  ? "Détails de la vacation"
                  : "M'alerter si remise en vente"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
