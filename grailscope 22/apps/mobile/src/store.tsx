import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { type Asset, type Alert, type Notification, type PortfolioSummary, createDataSource, GrailScopeApi } from "@grailscope/core";

/**
 * App-wide store: data source + auth + watchlist.
 * Set API_URL to your deployed GrailScope API. The token is kept in memory for
 * the session; a production build would persist it via expo-secure-store.
 */
const API_URL = "http://localhost:4000";
const dataSource = createDataSource({ mode: "mock" });
const api = new GrailScopeApi(API_URL);

interface Store {
  assets: Asset[];
  favs: Set<string>;
  email: string | null;
  notifications: Notification[];
  alerts: Alert[];
  unread: number;
  hasSignalAlert: (assetId: string) => boolean;
  toggleSignalAlert: (assetId: string) => void;
  removeAlert: (id: string) => void;
  portfolio: PortfolioSummary | null;
  hasHolding: (assetId: string) => boolean;
  setHolding: (assetId: string, quantity: number, unitCost: number) => void;
  removeHolding: (assetId: string) => void;
  toggleFav: (id: string) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

/** Register this device for Expo push and send the token to the API. */
async function registerForPush(): Promise<void> {
  try {
    const Notifications = await import("expo-notifications");
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== "granted") return;
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    if (token) await api.registerPush(token);
  } catch {
    /* native module unavailable (e.g. web) — ignore */
  }
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [favs, setFavs] = useState<Set<string>>(new Set());
  const [email, setEmail] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null);

  useEffect(() => {
    dataSource.listAssets().then(setAssets);
  }, []);

  // Poll notifications while logged in.
  useEffect(() => {
    if (!email) return;
    const t = setInterval(() => {
      api.listNotifications().then(setNotifications).catch(() => {});
    }, 60_000);
    return () => clearInterval(t);
  }, [email]);

  async function afterAuth(userEmail: string) {
    setEmail(userEmail);
    try {
      const [ids, al, notifs, pf] = await Promise.all([api.listWatchlist(), api.listAlerts(), api.listNotifications(), api.getPortfolio()]);
      setFavs(new Set(ids));
      setAlerts(al);
      setNotifications(notifs);
      setPortfolio(pf);
      registerForPush();
    } catch {
      /* keep local state */
    }
  }

  const value = useMemo<Store>(
    () => ({
      assets,
      favs,
      email,
      notifications,
      alerts,
      unread: notifications.filter((n) => !n.read).length,
      hasSignalAlert: (assetId) => alerts.some((a) => a.asset_id === assetId && a.kind === "signal"),
      toggleSignalAlert: (assetId) => {
        if (!email) return;
        const existing = alerts.find((a) => a.asset_id === assetId && a.kind === "signal");
        (existing ? api.deleteAlert(existing.id) : api.setAlert(assetId, "signal")).then(setAlerts).catch(() => {});
      },
      removeAlert: (id) => {
        if (!email) return;
        api.deleteAlert(id).then(setAlerts).catch(() => {});
      },
      portfolio,
      hasHolding: (assetId) => !!portfolio?.items.some((i) => i.asset.id === assetId),
      setHolding: (assetId, quantity, unitCost) => {
        if (!email) return;
        api.setHolding(assetId, quantity, unitCost).then(setPortfolio).catch(() => {});
      },
      removeHolding: (assetId) => {
        if (!email) return;
        api.removeHolding(assetId).then(setPortfolio).catch(() => {});
      },
      toggleFav: (id) => {
        const next = new Set(favs);
        const adding = !next.has(id);
        adding ? next.add(id) : next.delete(id);
        setFavs(next);
        if (email) {
          (adding ? api.addWatch(id) : api.removeWatch(id))
            .then((ids) => setFavs(new Set(ids)))
            .catch(() => setFavs(favs));
        }
      },
      login: async (e, p) => {
        const r = await api.login(e, p);
        await afterAuth(r.user.email);
      },
      register: async (e, p) => {
        const r = await api.register(e, p);
        await afterAuth(r.user.email);
      },
      logout: () => {
        api.logout();
        setEmail(null);
        setFavs(new Set());
        setAlerts([]);
        setNotifications([]);
        setPortfolio(null);
      },
    }),
    [assets, favs, email, alerts, notifications, portfolio],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore must be used within StoreProvider");
  return v;
}
