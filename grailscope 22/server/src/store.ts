import { randomUUID } from "node:crypto";
import type { Holding } from "@grailscope/core";
import { hashPassword, verifyPassword } from "./auth.js";

/**
 * Persistence abstraction. One async interface, two backends:
 *   - SqliteStore   (node:sqlite)  — default, zero-config, great for dev/single host
 *   - PostgresStore (pg)           — set DATABASE_URL for durable production
 *
 * Selecting a backend never touches the API handlers — they only see `Store`.
 */

export interface UserRow {
  id: string;
  email: string;
  created_at: string;
}
export type Kind = "signal" | "above" | "below";
export interface AlertRow {
  id: string;
  user_id: string;
  asset_id: string;
  kind: Kind;
  threshold: number | null;
  last_state: string | null;
  created_at: string;
}
export interface NotificationRow {
  id: string;
  user_id: string;
  asset_id: string;
  message: string;
  created_at: string;
  read: boolean;
}

export interface Store {
  init(): Promise<void>;
  createUser(email: string, password: string): Promise<UserRow>;
  findUserByEmail(email: string): Promise<(UserRow & { password: string }) | undefined>;
  getUserEmail(userId: string): Promise<string | null>;
  authenticate(email: string, password: string): Promise<UserRow | null>;
  savePushToken(userId: string, token: string): Promise<void>;
  getPushTokens(userId: string): Promise<string[]>;
  getWatchlist(userId: string): Promise<string[]>;
  addWatch(userId: string, assetId: string): Promise<void>;
  removeWatch(userId: string, assetId: string): Promise<void>;
  listAlerts(userId: string): Promise<AlertRow[]>;
  allAlerts(): Promise<AlertRow[]>;
  upsertAlert(userId: string, assetId: string, kind: Kind, threshold: number | null): Promise<AlertRow>;
  setAlertState(id: string, state: string): Promise<void>;
  deleteAlert(userId: string, id: string): Promise<void>;
  addNotification(userId: string, assetId: string, message: string): Promise<void>;
  listNotifications(userId: string): Promise<NotificationRow[]>;
  markNotificationsRead(userId: string): Promise<void>;
  listHoldings(userId: string): Promise<Holding[]>;
  upsertHolding(userId: string, assetId: string, quantity: number, unitCost: number): Promise<void>;
  removeHolding(userId: string, assetId: string): Promise<void>;
}

/* ===================== SQLite (node:sqlite) ===================== */
class SqliteStore implements Store {
  private db: any;
  async init() {
    const { DatabaseSync } = await import("node:sqlite");
    this.db = new DatabaseSync(process.env.DB_PATH || "./grailscope.db");
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, created_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS watchlist (user_id TEXT NOT NULL, asset_id TEXT NOT NULL, created_at TEXT NOT NULL, PRIMARY KEY (user_id, asset_id));
      CREATE TABLE IF NOT EXISTS alerts (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, asset_id TEXT NOT NULL, kind TEXT NOT NULL, threshold REAL, last_state TEXT, created_at TEXT NOT NULL, UNIQUE(user_id, asset_id, kind));
      CREATE TABLE IF NOT EXISTS notifications (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, asset_id TEXT NOT NULL, message TEXT NOT NULL, created_at TEXT NOT NULL, read INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS push_tokens (user_id TEXT NOT NULL, token TEXT NOT NULL, PRIMARY KEY (user_id, token));
      CREATE TABLE IF NOT EXISTS holdings (user_id TEXT NOT NULL, asset_id TEXT NOT NULL, quantity REAL NOT NULL, unit_cost REAL NOT NULL, created_at TEXT NOT NULL, PRIMARY KEY (user_id, asset_id));
    `);
  }
  async createUser(email: string, password: string) {
    const id = randomUUID(), created_at = new Date().toISOString(), e = email.toLowerCase().trim();
    this.db.prepare("INSERT INTO users (id,email,password,created_at) VALUES (?,?,?,?)").run(id, e, hashPassword(password), created_at);
    return { id, email: e, created_at };
  }
  async findUserByEmail(email: string) {
    return this.db.prepare("SELECT * FROM users WHERE email=?").get(email.toLowerCase().trim());
  }
  async getUserEmail(userId: string) {
    const row = this.db.prepare("SELECT email FROM users WHERE id=?").get(userId);
    return row ? row.email : null;
  }
  async savePushToken(userId: string, token: string) {
    this.db.prepare("INSERT OR IGNORE INTO push_tokens (user_id,token) VALUES (?,?)").run(userId, token);
  }
  async getPushTokens(userId: string) {
    return (this.db.prepare("SELECT token FROM push_tokens WHERE user_id=?").all(userId) as any[]).map((r) => r.token);
  }
  async authenticate(email: string, password: string) {
    const row = await this.findUserByEmail(email);
    if (!row || !verifyPassword(password, row.password)) return null;
    return { id: row.id, email: row.email, created_at: row.created_at };
  }
  async getWatchlist(userId: string) {
    return (this.db.prepare("SELECT asset_id FROM watchlist WHERE user_id=? ORDER BY created_at DESC").all(userId) as any[]).map((r) => r.asset_id);
  }
  async addWatch(userId: string, assetId: string) {
    this.db.prepare("INSERT OR IGNORE INTO watchlist (user_id,asset_id,created_at) VALUES (?,?,?)").run(userId, assetId, new Date().toISOString());
  }
  async removeWatch(userId: string, assetId: string) {
    this.db.prepare("DELETE FROM watchlist WHERE user_id=? AND asset_id=?").run(userId, assetId);
  }
  async listAlerts(userId: string) {
    return this.db.prepare("SELECT * FROM alerts WHERE user_id=? ORDER BY created_at DESC").all(userId) as AlertRow[];
  }
  async allAlerts() {
    return this.db.prepare("SELECT * FROM alerts").all() as AlertRow[];
  }
  async upsertAlert(userId: string, assetId: string, kind: Kind, threshold: number | null) {
    const existing = this.db.prepare("SELECT * FROM alerts WHERE user_id=? AND asset_id=? AND kind=?").get(userId, assetId, kind);
    if (existing) {
      this.db.prepare("UPDATE alerts SET threshold=? WHERE id=?").run(threshold, existing.id);
      return { ...existing, threshold };
    }
    const id = randomUUID(), created_at = new Date().toISOString();
    this.db.prepare("INSERT INTO alerts (id,user_id,asset_id,kind,threshold,last_state,created_at) VALUES (?,?,?,?,?,?,?)").run(id, userId, assetId, kind, threshold, null, created_at);
    return { id, user_id: userId, asset_id: assetId, kind, threshold, last_state: null, created_at };
  }
  async setAlertState(id: string, state: string) {
    this.db.prepare("UPDATE alerts SET last_state=? WHERE id=?").run(state, id);
  }
  async deleteAlert(userId: string, id: string) {
    this.db.prepare("DELETE FROM alerts WHERE id=? AND user_id=?").run(id, userId);
  }
  async addNotification(userId: string, assetId: string, message: string) {
    this.db.prepare("INSERT INTO notifications (id,user_id,asset_id,message,created_at,read) VALUES (?,?,?,?,?,0)").run(randomUUID(), userId, assetId, message, new Date().toISOString());
  }
  async listNotifications(userId: string) {
    return (this.db.prepare("SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 50").all(userId) as any[]).map((r) => ({ ...r, read: !!r.read })) as NotificationRow[];
  }
  async markNotificationsRead(userId: string) {
    this.db.prepare("UPDATE notifications SET read=1 WHERE user_id=?").run(userId);
  }
  async listHoldings(userId: string) {
    return this.db.prepare("SELECT asset_id, quantity, unit_cost FROM holdings WHERE user_id=?").all(userId) as Holding[];
  }
  async upsertHolding(userId: string, assetId: string, quantity: number, unitCost: number) {
    this.db.prepare(
      "INSERT INTO holdings (user_id,asset_id,quantity,unit_cost,created_at) VALUES (?,?,?,?,?) ON CONFLICT(user_id,asset_id) DO UPDATE SET quantity=excluded.quantity, unit_cost=excluded.unit_cost",
    ).run(userId, assetId, quantity, unitCost, new Date().toISOString());
  }
  async removeHolding(userId: string, assetId: string) {
    this.db.prepare("DELETE FROM holdings WHERE user_id=? AND asset_id=?").run(userId, assetId);
  }
}

/* ===================== Postgres (pg) ===================== */
class PostgresStore implements Store {
  private pool: any;
  async init() {
    const { Pool } = await import("pg");
    this.pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.PGSSL === "1" ? { rejectUnauthorized: false } : undefined });
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, created_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS watchlist (user_id TEXT NOT NULL, asset_id TEXT NOT NULL, created_at TEXT NOT NULL, PRIMARY KEY (user_id, asset_id));
      CREATE TABLE IF NOT EXISTS alerts (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, asset_id TEXT NOT NULL, kind TEXT NOT NULL, threshold DOUBLE PRECISION, last_state TEXT, created_at TEXT NOT NULL, UNIQUE(user_id, asset_id, kind));
      CREATE TABLE IF NOT EXISTS notifications (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, asset_id TEXT NOT NULL, message TEXT NOT NULL, created_at TEXT NOT NULL, read BOOLEAN NOT NULL DEFAULT FALSE);
      CREATE TABLE IF NOT EXISTS push_tokens (user_id TEXT NOT NULL, token TEXT NOT NULL, PRIMARY KEY (user_id, token));
      CREATE TABLE IF NOT EXISTS holdings (user_id TEXT NOT NULL, asset_id TEXT NOT NULL, quantity DOUBLE PRECISION NOT NULL, unit_cost DOUBLE PRECISION NOT NULL, created_at TEXT NOT NULL, PRIMARY KEY (user_id, asset_id));
    `);
  }
  private q<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    return this.pool.query(sql, params).then((r: any) => r.rows);
  }
  async createUser(email: string, password: string) {
    const id = randomUUID(), created_at = new Date().toISOString(), e = email.toLowerCase().trim();
    await this.q("INSERT INTO users (id,email,password,created_at) VALUES ($1,$2,$3,$4)", [id, e, hashPassword(password), created_at]);
    return { id, email: e, created_at };
  }
  async findUserByEmail(email: string) {
    return (await this.q("SELECT * FROM users WHERE email=$1", [email.toLowerCase().trim()]))[0];
  }
  async getUserEmail(userId: string) {
    return (await this.q<{ email: string }>("SELECT email FROM users WHERE id=$1", [userId]))[0]?.email ?? null;
  }
  async savePushToken(userId: string, token: string) {
    await this.q("INSERT INTO push_tokens (user_id,token) VALUES ($1,$2) ON CONFLICT DO NOTHING", [userId, token]);
  }
  async getPushTokens(userId: string) {
    return (await this.q<{ token: string }>("SELECT token FROM push_tokens WHERE user_id=$1", [userId])).map((r) => r.token);
  }
  async authenticate(email: string, password: string) {
    const row = await this.findUserByEmail(email);
    if (!row || !verifyPassword(password, (row as any).password)) return null;
    return { id: row.id, email: row.email, created_at: row.created_at };
  }
  async getWatchlist(userId: string) {
    return (await this.q("SELECT asset_id FROM watchlist WHERE user_id=$1 ORDER BY created_at DESC", [userId])).map((r) => r.asset_id);
  }
  async addWatch(userId: string, assetId: string) {
    await this.q("INSERT INTO watchlist (user_id,asset_id,created_at) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING", [userId, assetId, new Date().toISOString()]);
  }
  async removeWatch(userId: string, assetId: string) {
    await this.q("DELETE FROM watchlist WHERE user_id=$1 AND asset_id=$2", [userId, assetId]);
  }
  async listAlerts(userId: string) {
    return this.q<AlertRow>("SELECT * FROM alerts WHERE user_id=$1 ORDER BY created_at DESC", [userId]);
  }
  async allAlerts() {
    return this.q<AlertRow>("SELECT * FROM alerts");
  }
  async upsertAlert(userId: string, assetId: string, kind: Kind, threshold: number | null) {
    const id = randomUUID(), created_at = new Date().toISOString();
    const rows = await this.q<AlertRow>(
      `INSERT INTO alerts (id,user_id,asset_id,kind,threshold,last_state,created_at) VALUES ($1,$2,$3,$4,$5,NULL,$6)
       ON CONFLICT (user_id,asset_id,kind) DO UPDATE SET threshold=EXCLUDED.threshold RETURNING *`,
      [id, userId, assetId, kind, threshold, created_at],
    );
    return rows[0];
  }
  async setAlertState(id: string, state: string) {
    await this.q("UPDATE alerts SET last_state=$1 WHERE id=$2", [state, id]);
  }
  async deleteAlert(userId: string, id: string) {
    await this.q("DELETE FROM alerts WHERE id=$1 AND user_id=$2", [id, userId]);
  }
  async addNotification(userId: string, assetId: string, message: string) {
    await this.q("INSERT INTO notifications (id,user_id,asset_id,message,created_at,read) VALUES ($1,$2,$3,$4,$5,FALSE)", [randomUUID(), userId, assetId, message, new Date().toISOString()]);
  }
  async listNotifications(userId: string) {
    return this.q<NotificationRow>("SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50", [userId]);
  }
  async markNotificationsRead(userId: string) {
    await this.q("UPDATE notifications SET read=TRUE WHERE user_id=$1", [userId]);
  }
  async listHoldings(userId: string) {
    return this.q<Holding>("SELECT asset_id, quantity, unit_cost FROM holdings WHERE user_id=$1", [userId]);
  }
  async upsertHolding(userId: string, assetId: string, quantity: number, unitCost: number) {
    await this.q(
      "INSERT INTO holdings (user_id,asset_id,quantity,unit_cost,created_at) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (user_id,asset_id) DO UPDATE SET quantity=EXCLUDED.quantity, unit_cost=EXCLUDED.unit_cost",
      [userId, assetId, quantity, unitCost, new Date().toISOString()],
    );
  }
  async removeHolding(userId: string, assetId: string) {
    await this.q("DELETE FROM holdings WHERE user_id=$1 AND asset_id=$2", [userId, assetId]);
  }
}

let _store: Store | null = null;
export async function getStore(): Promise<Store> {
  if (_store) return _store;
  _store = process.env.DATABASE_URL ? new PostgresStore() : new SqliteStore();
  await _store.init();
  console.log(`Store: ${process.env.DATABASE_URL ? "PostgreSQL" : "SQLite (" + (process.env.DB_PATH || "./grailscope.db") + ")"}`);
  return _store;
}
