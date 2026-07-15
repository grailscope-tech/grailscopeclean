/**
 * GrailScopeApi — typed client for the auth + watchlist endpoints, shared by
 * the web and mobile apps. Holds the bearer token in memory; the apps decide
 * how to persist it (localStorage on web, SecureStore/AsyncStorage on mobile).
 */
import type { Holding, PortfolioSummary } from "./portfolio.js";

export interface AuthUser {
  id: string;
  email: string;
}

export interface AuthResult {
  token: string;
  user: AuthUser;
}

export type AlertKind = "signal" | "above" | "below";

export interface Alert {
  id: string;
  asset_id: string;
  kind: AlertKind;
  threshold: number | null;
  last_state: string | null;
}

export interface Notification {
  id: string;
  asset_id: string;
  message: string;
  created_at: string;
  read: boolean;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

export class GrailScopeApi {
  private token: string | null = null;

  constructor(private baseUrl: string, private fetchImpl: typeof fetch = fetch) {}

  setToken(token: string | null) {
    this.token = token;
  }
  getToken() {
    return this.token;
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = { "Content-Type": "application/json", ...(init.headers as Record<string, string>) };
    if (this.token) headers.Authorization = `Bearer ${this.token}`;
    const res = await this.fetchImpl(`${this.baseUrl}${path}`, { ...init, headers });
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (!res.ok) throw new ApiError(res.status, data?.error || `Erreur ${res.status}`);
    return data as T;
  }

  // ---- auth ----
  async register(email: string, password: string): Promise<AuthResult> {
    const r = await this.request<AuthResult>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    this.token = r.token;
    return r;
  }

  async login(email: string, password: string): Promise<AuthResult> {
    const r = await this.request<AuthResult>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    this.token = r.token;
    return r;
  }

  logout() {
    this.token = null;
  }

  // ---- watchlist (requires auth) ----
  listWatchlist(): Promise<string[]> {
    return this.request<string[]>("/api/watchlist");
  }
  addWatch(assetId: string): Promise<string[]> {
    return this.request<string[]>(`/api/watchlist/${encodeURIComponent(assetId)}`, { method: "PUT" });
  }
  removeWatch(assetId: string): Promise<string[]> {
    return this.request<string[]>(`/api/watchlist/${encodeURIComponent(assetId)}`, { method: "DELETE" });
  }

  // ---- alerts ----
  listAlerts(): Promise<Alert[]> {
    return this.request<Alert[]>("/api/alerts");
  }
  setAlert(assetId: string, kind: AlertKind, threshold?: number): Promise<Alert[]> {
    return this.request<Alert[]>("/api/alerts", {
      method: "PUT",
      body: JSON.stringify({ assetId, kind, threshold }),
    });
  }
  deleteAlert(id: string): Promise<Alert[]> {
    return this.request<Alert[]>(`/api/alerts/${encodeURIComponent(id)}`, { method: "DELETE" });
  }

  // ---- notifications ----
  listNotifications(): Promise<Notification[]> {
    return this.request<Notification[]>("/api/notifications");
  }
  markNotificationsRead(): Promise<{ ok: boolean }> {
    return this.request<{ ok: boolean }>("/api/notifications/read", { method: "POST" });
  }

  // ---- mobile push ----
  registerPush(token: string): Promise<{ ok: boolean }> {
    return this.request<{ ok: boolean }>("/api/push/register", { method: "POST", body: JSON.stringify({ token }) });
  }

  // ---- portfolio ----
  listHoldings(): Promise<Holding[]> {
    return this.request<Holding[]>("/api/portfolio");
  }
  getPortfolio(): Promise<PortfolioSummary> {
    return this.request<PortfolioSummary>("/api/portfolio/summary");
  }
  setHolding(assetId: string, quantity: number, unitCost: number): Promise<PortfolioSummary> {
    return this.request<PortfolioSummary>("/api/portfolio", {
      method: "PUT",
      body: JSON.stringify({ assetId, quantity, unitCost }),
    });
  }
  removeHolding(assetId: string): Promise<PortfolioSummary> {
    return this.request<PortfolioSummary>(`/api/portfolio/${encodeURIComponent(assetId)}`, { method: "DELETE" });
  }
}
