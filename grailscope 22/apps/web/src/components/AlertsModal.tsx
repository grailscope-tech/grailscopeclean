import { useAuth } from "../auth";
import { formatPrice, type Asset } from "@grailscope/core";

const KIND_LABEL: Record<string, string> = {
  signal: "Changement de signal (Acheter/Vendre)",
  above: "Cote au-dessus de",
  below: "Cote en dessous de",
};

export function AlertsModal({ assets, onClose }: { assets: Asset[]; onClose: () => void }) {
  const { alerts, removeAlert } = useAuth();
  const byId = new Map(assets.map((a) => [a.id, a]));

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 540 }}>
        <div className="mhead">
          <div>
            <h3>Mes alertes</h3>
            <div className="mt">{alerts.length} alerte(s) active(s)</div>
          </div>
          <button className="mclose" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="mbody" style={{ paddingTop: 8 }}>
          {alerts.length === 0 ? (
            <div style={{ color: "var(--muted)", fontSize: 14, padding: "24px 0", textAlign: "center" }}>
              Aucune alerte. Ouvrez une fiche objet et utilisez « 🔔 M'alerter ».
            </div>
          ) : (
            alerts.map((a) => {
              const asset = byId.get(a.asset_id);
              return (
                <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid var(--line)" }}>
                  <div style={{ fontSize: 22 }}>{asset?.icon ?? "🔔"}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{asset?.name ?? a.asset_id}</div>
                    <div style={{ fontSize: 12.5, color: "var(--muted)" }}>
                      {KIND_LABEL[a.kind]}
                      {a.threshold != null && asset ? ` ${formatPrice(a.threshold, asset.currency)}` : ""}
                    </div>
                  </div>
                  <button className="btn out" style={{ height: 36, padding: "0 12px" }} onClick={() => removeAlert(a.id)}>
                    Supprimer
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
