import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { GrailScopeApi, type Alert, type Notification, type PortfolioSummary } from "@grailscope/core";

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:4000";
const api = new GrailScopeApi(API_URL);

const LS_TOKEN = "gs_token";
const LS_EMAIL = "gs_email";

interface AuthState {
  email: string | null;
  favs: Set<string>;
  isFav: (id: string) => boolean;
  toggleFav: (id: string) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  // alerts + notifications
  alerts: Alert[];
  notifications: Notification[];
  unread: number;
  hasSignalAlert: (assetId: string) => boolean;
  toggleSignalAlert: (assetId: string) => void;
  setAlert: (assetId: string, kind: "signal" | "above" | "below", threshold?: number) => Promise<void>;
  removeAlert: (id: string) => Promise<void>;
  markNotificationsRead: () => void;
  // portfolio
  portfolio: PortfolioSummary | null;
  hasHolding: (assetId: string) => boolean;
  setHolding: (assetId: string, quantity: number, unitCost: number) => Promise<void>;
  removeHolding: (assetId: string) => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [email, setEmail] = useState<string | null>(null);
  const [favs, setFavs] = useState<Set<string>>(new Set());
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null);

  async function loadUserData() {
    const [ids, al, notifs, pf] = await Promise.all([
      api.listWatchlist(),
      api.listAlerts(),
      api.listNotifications(),
      api.getPortfolio(),
    ]);
    setFavs(new Set(ids));
    setAlerts(al);
    setNotifications(notifs);
    setPortfolio(pf);
  }

  // Restore a saved session on first load and pull the user's data.
  useEffect(() => {
    const token = localStorage.getItem(LS_TOKEN);
    const savedEmail = localStorage.getItem(LS_EMAIL);
    if (token) {
      api.setToken(token);
      setEmail(savedEmail);
      loadUserData().catch(() => {
        localStorage.removeItem(LS_TOKEN);
        localStorage.removeItem(LS_EMAIL);
        api.setToken(null);
        setEmail(null);
      });
    }
  }, []);

  // Poll notifications while logged in so fired alerts surface live.
  useEffect(() => {
    if (!email) return;
    const t = setInterval(() => {
      api.listNotifications().then(setNotifications).catch(() => {});
    }, 60_000);
    return () => clearInterval(t);
  }, [email]);

  async function afterAuth(token: string, userEmail: string) {
    localStorage.setItem(LS_TOKEN, token);
    localStorage.setItem(LS_EMAIL, userEmail);
    setEmail(userEmail);
    await loadUserData();
  }

  const value = useMemo<AuthState>(
    () => ({
      email,
      favs,
      isFav: (id) => favs.has(id),
      toggleFav: (id) => {
        const next = new Set(favs);
        const adding = !next.has(id);
        adding ? next.add(id) : next.delete(id);
        setFavs(next); // optimistic
        if (email) {
          const call = adding ? api.addWatch(id) : api.removeWatch(id);
          call.then((ids) => setFavs(new Set(ids))).catch(() => setFavs(favs)); // revert on error
        }
      },
      login: async (e, p) => {
        const r = await api.login(e, p);
        await afterAuth(r.token, r.user.email);
      },
      register: async (e, p) => {
        const r = await api.register(e, p);
        await afterAuth(r.token, r.user.email);
      },
      logout: () => {
        api.logout();
        localStorage.removeItem(LS_TOKEN);
        localStorage.removeItem(LS_EMAIL);
        setEmail(null);
        setFavs(new Set());
        setAlerts([]);
        setNotifications([]);
        setPortfolio(null);
      },
      alerts,
      notifications,
      unread: notifications.filter((n) => !n.read).length,
      hasSignalAlert: (assetId) => alerts.some((a) => a.asset_id === assetId && a.kind === "signal"),
      toggleSignalAlert: (assetId) => {
        if (!email) return;
        const existing = alerts.find((a) => a.asset_id === assetId && a.kind === "signal");
        const call = existing ? api.deleteAlert(existing.id) : api.setAlert(assetId, "signal");
        call.then(setAlerts).catch(() => {});
      },
      setAlert: async (assetId, kind, threshold) => {
        if (!email) return;
        setAlerts(await api.setAlert(assetId, kind, threshold));
      },
      removeAlert: async (id) => {
        if (!email) return;
        setAlerts(await api.deleteAlert(id));
      },
      markNotificationsRead: () => {
        if (!email || notifications.every((n) => n.read)) return;
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true }))); // optimistic
        api.markNotificationsRead().catch(() => {});
      },
      portfolio,
      hasHolding: (assetId) => !!portfolio?.items.some((i) => i.asset.id === assetId),
      setHolding: async (assetId, quantity, unitCost) => {
        if (!email) return;
        setPortfolio(await api.setHolding(assetId, quantity, unitCost));
      },
      removeHolding: async (assetId) => {
        if (!email) return;
        setPortfolio(await api.removeHolding(assetId));
      },
    }),
    [email, favs, alerts, notifications, portfolio],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used within AuthProvider");
  return v;
}
