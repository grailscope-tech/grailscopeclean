import express from "express";
import type { Request, Response, NextFunction, RequestHandler } from "express";
import cors from "cors";
import {
  demoAssets,
  computeSignal,
  buildIndices,
  topSignals,
  aggregateProviders,
  ScryfallAdapter,
  PokemonTcgAdapter,
  computePortfolio,
  type Category,
  type Asset,
} from "@grailscope/core";
import { signToken, verifyToken } from "./auth.js";
import { getStore, type Store, type Kind } from "./store.js";
import { checkAlerts, createNotifier, type Notifier } from "./alerts.js";

const app = express();
app.use(cors());
app.use(express.json());

let store: Store;
let notifier: Notifier;

/** Wrap an async handler so rejections become 500s instead of crashing. */
const ah =
  (fn: (req: Request, res: Response) => Promise<unknown>): RequestHandler =>
  (req, res) =>
    fn(req, res).catch((e) => {
      console.error(e);
      if (!res.headersSent) res.status(500).json({ error: "erreur serveur" });
    });

/* ===================== catalogue + live feed ===================== */
let catalogue: Asset[] = demoAssets();

async function refreshLiveFeed() {
  if (process.env.LIVE_CARDS !== "1") return;
  try {
    const live = await aggregateProviders([new ScryfallAdapter(), new PokemonTcgAdapter()]);
    const ids = new Set(live.map((a) => a.id));
    catalogue = [...demoAssets().filter((a) => !ids.has(a.id)), ...live];
    console.log(`Live feed: merged ${live.length} items (catalogue=${catalogue.length}).`);
  } catch (e) {
    console.warn("Live feed failed:", (e as Error).message);
  }
}

app.get("/health", (_req, res) => res.json({ ok: true, assets: catalogue.length, live: process.env.LIVE_CARDS === "1" }));

/* ===================== market data ===================== */
app.get("/api/assets", (req, res) => {
  const category = req.query.category as Category | undefined;
  const q = (req.query.q as string | undefined)?.toLowerCase().trim();
  let list = catalogue;
  if (category) list = list.filter((a) => a.category === category);
  if (q) list = list.filter((a) => a.name.toLowerCase().includes(q) || a.category.toLowerCase().includes(q) || a.meta.toLowerCase().includes(q));
  res.json(list.sort((a, b) => b.change30d - a.change30d));
});

app.get("/api/assets/:id", (req, res) => {
  const asset = catalogue.find((a) => a.id === req.params.id);
  if (!asset) return res.status(404).json({ error: "not found" });
  res.json(asset);
});

app.get("/api/assets/:id/signal", (req, res) => {
  const asset = catalogue.find((a) => a.id === req.params.id);
  if (!asset) return res.status(404).json({ error: "not found" });
  res.json(computeSignal(asset));
});

app.get("/api/indices", (_req, res) => res.json(buildIndices(catalogue)));
app.get("/api/signals", (_req, res) => res.json(topSignals(catalogue, 8)));

/* ===================== auth ===================== */
interface AuthedRequest extends Request {
  userId?: string;
}
function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const payload = token ? verifyToken(token) : null;
  if (!payload || typeof payload.sub !== "string") return res.status(401).json({ error: "non authentifié" });
  req.userId = payload.sub;
  next();
}
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

app.post("/api/auth/register", ah(async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!EMAIL_RE.test(email ?? "")) return res.status(400).json({ error: "email invalide" });
  if (typeof password !== "string" || password.length < 8) return res.status(400).json({ error: "mot de passe : 8 caractères minimum" });
  if (await store.findUserByEmail(email)) return res.status(409).json({ error: "compte déjà existant" });
  const user = await store.createUser(email, password);
  res.json({ token: signToken({ sub: user.id, email: user.email }), user });
}));

app.post("/api/auth/login", ah(async (req, res) => {
  const { email, password } = req.body ?? {};
  const user = await store.authenticate(email ?? "", password ?? "");
  if (!user) return res.status(401).json({ error: "identifiants incorrects" });
  res.json({ token: signToken({ sub: user.id, email: user.email }), user });
}));

app.get("/api/me", requireAuth, (req: AuthedRequest, res) => res.json({ id: req.userId }));

/* ===================== watchlist ===================== */
app.get("/api/watchlist", requireAuth, ah(async (req: AuthedRequest, res) => res.json(await store.getWatchlist(req.userId!))));
app.put("/api/watchlist/:assetId", requireAuth, ah(async (req: AuthedRequest, res) => {
  await store.addWatch(req.userId!, req.params.assetId);
  res.json(await store.getWatchlist(req.userId!));
}));
app.delete("/api/watchlist/:assetId", requireAuth, ah(async (req: AuthedRequest, res) => {
  await store.removeWatch(req.userId!, req.params.assetId);
  res.json(await store.getWatchlist(req.userId!));
}));

/* ===================== alerts + notifications ===================== */
const KINDS: Kind[] = ["signal", "above", "below"];

app.get("/api/alerts", requireAuth, ah(async (req: AuthedRequest, res) => res.json(await store.listAlerts(req.userId!))));

app.put("/api/alerts", requireAuth, ah(async (req: AuthedRequest, res) => {
  const { assetId, kind, threshold } = req.body ?? {};
  if (!assetId || !KINDS.includes(kind)) return res.status(400).json({ error: "alerte invalide" });
  if ((kind === "above" || kind === "below") && typeof threshold !== "number")
    return res.status(400).json({ error: "seuil requis" });
  await store.upsertAlert(req.userId!, assetId, kind, kind === "signal" ? null : threshold);
  res.json(await store.listAlerts(req.userId!));
}));

app.delete("/api/alerts/:id", requireAuth, ah(async (req: AuthedRequest, res) => {
  await store.deleteAlert(req.userId!, req.params.id);
  res.json(await store.listAlerts(req.userId!));
}));

app.get("/api/notifications", requireAuth, ah(async (req: AuthedRequest, res) => res.json(await store.listNotifications(req.userId!))));
app.post("/api/notifications/read", requireAuth, ah(async (req: AuthedRequest, res) => {
  await store.markNotificationsRead(req.userId!);
  res.json({ ok: true });
}));

/** POST /api/push/register { token } — register an Expo push token (mobile). */
app.post("/api/push/register", requireAuth, ah(async (req: AuthedRequest, res) => {
  const { token } = req.body ?? {};
  if (typeof token !== "string" || !token) return res.status(400).json({ error: "token requis" });
  await store.savePushToken(req.userId!, token);
  res.json({ ok: true });
}));

/* ===================== portfolio (holdings + P&L) ===================== */
app.get("/api/portfolio", requireAuth, ah(async (req: AuthedRequest, res) => res.json(await store.listHoldings(req.userId!))));

app.get("/api/portfolio/summary", requireAuth, ah(async (req: AuthedRequest, res) => {
  res.json(computePortfolio(await store.listHoldings(req.userId!), catalogue));
}));

app.put("/api/portfolio", requireAuth, ah(async (req: AuthedRequest, res) => {
  const { assetId, quantity, unitCost } = req.body ?? {};
  if (!assetId || typeof quantity !== "number" || quantity <= 0 || typeof unitCost !== "number" || unitCost < 0)
    return res.status(400).json({ error: "position invalide" });
  if (!catalogue.some((a) => a.id === assetId)) return res.status(404).json({ error: "objet inconnu" });
  await store.upsertHolding(req.userId!, assetId, quantity, unitCost);
  res.json(computePortfolio(await store.listHoldings(req.userId!), catalogue));
}));

app.delete("/api/portfolio/:assetId", requireAuth, ah(async (req: AuthedRequest, res) => {
  await store.removeHolding(req.userId!, req.params.assetId);
  res.json(computePortfolio(await store.listHoldings(req.userId!), catalogue));
}));

/* manual trigger (handy for testing the alert engine) */
app.post("/api/alerts/run", ah(async (_req, res) => res.json({ fired: await checkAlerts(store, catalogue, notifier) })));

/* ===================== bootstrap ===================== */
const PORT = Number(process.env.PORT ?? 4000);
const ALERT_INTERVAL_MS = Number(process.env.ALERT_INTERVAL_MS ?? 5 * 60 * 1000);

async function main() {
  store = await getStore();
  notifier = await createNotifier();
  await refreshLiveFeed();
  setInterval(refreshLiveFeed, 60 * 60 * 1000);
  setInterval(() => {
    checkAlerts(store, catalogue, notifier).catch((e) => console.warn("alert check failed:", (e as Error).message));
  }, ALERT_INTERVAL_MS);
  app.listen(PORT, () => console.log(`GrailScope API on http://localhost:${PORT}`));
}
main();
