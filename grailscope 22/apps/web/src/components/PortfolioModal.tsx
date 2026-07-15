import { useAuth } from "../auth";
import { formatPrice, formatPct } from "@grailscope/core";
import { PortfolioChart } from "./PortfolioChart";
import { AllocationDonut } from "./AllocationDonut";

export function PortfolioModal({ onClose }: { onClose: () => void }) {
  const { portfolio, removeHolding } = useAuth();
  const p = portfolio;
  const up = (p?.totalPnl ?? 0) >= 0;

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 620 }}>
        <div className="mhead">
          <div>
            <h3>Mon portefeuille</h3>
            <div className="mt">{p?.items.length ?? 0} position(s)</div>
          </div>
          <button className="mclose" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="mbody" style={{ paddingTop: 8 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 14 }}>
            <div className="metric">
              <div className="lbl">Valeur actuelle</div>
              <div className="v">{formatPrice(p?.totalValue ?? 0)}</div>
            </div>
            <div className="metric">
              <div className="lbl">Investi</div>
              <div className="v">{formatPrice(p?.totalCost ?? 0)}</div>
            </div>
            <div className="metric">
              <div className="lbl">Plus/moins-value</div>
              <div className={`v ${up ? "up" : "down"}`}>
                {up ? "+" : ""}
                {formatPrice(p?.totalPnl ?? 0)} ({formatPct(p?.totalPnlPct ?? 0)})
              </div>
            </div>
          </div>

          {p && p.history.length > 1 && (
            <div style={{ border: "1px solid var(--line)", borderRadius: 14, padding: "14px 14px 6px", marginBottom: 14, background: "linear-gradient(180deg,#fbfcff,#fff)" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", marginBottom: 4 }}>
                Évolution de la valeur · 90j
              </div>
              <PortfolioChart data={p.history} />
            </div>
          )}

          {p && p.items.length > 0 && (
            <div style={{ border: "1px solid var(--line)", borderRadius: 14, padding: 14, marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", marginBottom: 10 }}>
                Allocation par catégorie
              </div>
              <AllocationDonut summary={p} />
            </div>
          )}

          {!p || p.items.length === 0 ? (
            <div style={{ color: "var(--muted)", fontSize: 14, padding: "20px 0", textAlign: "center" }}>
              Aucune position. Ouvrez une fiche et utilisez « J'en possède » pour déclarer un achat.
            </div>
          ) : (
            <table style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th>Objet</th>
                  <th className="r">Qté</th>
                  <th className="r">Valeur</th>
                  <th className="r">P&L</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {p.items.map((it) => {
                  const iu = it.pnl >= 0;
                  return (
                    <tr key={it.asset.id}>
                      <td>
                        <div className="asset">
                          <div className="thumb" style={{ width: 34, height: 34, fontSize: 17 }}>
                            {it.asset.icon}
                          </div>
                          <div>
                            <div className="nm" style={{ fontSize: 13.5 }}>
                              {it.asset.name}
                            </div>
                            <div className="mt">PRU {formatPrice(it.unitCost, it.asset.currency)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="r">{it.quantity}</td>
                      <td className="r price">{formatPrice(it.value, it.asset.currency)}</td>
                      <td className={`r ${iu ? "up" : "down"}`} style={{ fontWeight: 700 }}>
                        {iu ? "+" : ""}
                        {formatPrice(it.pnl, it.asset.currency)}
                        <div style={{ fontSize: 11, fontWeight: 500 }}>{formatPct(it.pnlPct)}</div>
                      </td>
                      <td className="r">
                        <button className="star" title="Retirer" onClick={() => removeHolding(it.asset.id)}>
                          ✕
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
