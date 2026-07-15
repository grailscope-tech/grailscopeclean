import type { Asset, Category } from "./types.js";
import { demoAssets } from "./dataset.js";

/**
 * DataSource is the single seam between the apps and where the data comes from.
 * The web and mobile UIs ONLY know this interface — swapping the demo data for
 * a real market feed is a one-line change (see createDataSource below).
 */
export interface DataSource {
  /** Full catalogue, optionally filtered by category and/or free-text query. */
  listAssets(opts?: { category?: Category | "all"; query?: string }): Promise<Asset[]>;
  /** A single asset by id (with full price history). */
  getAsset(id: string): Promise<Asset | null>;
}

/** ---------------------------------------------------------------------------
 * 1) MockDataSource — bundled demo catalogue. Zero network. Default in dev.
 * ------------------------------------------------------------------------- */
export class MockDataSource implements DataSource {
  private data = demoAssets();

  async listAssets(opts?: { category?: Category | "all"; query?: string }): Promise<Asset[]> {
    let list = this.data;
    if (opts?.category && opts.category !== "all") {
      list = list.filter((a) => a.category === opts.category);
    }
    if (opts?.query) {
      const q = opts.query.toLowerCase().trim();
      list = list.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.category.toLowerCase().includes(q) ||
          a.meta.toLowerCase().includes(q),
      );
    }
    return list;
  }

  async getAsset(id: string): Promise<Asset | null> {
    return this.data.find((a) => a.id === id) ?? null;
  }
}

/** ---------------------------------------------------------------------------
 * 2) HttpDataSource — talks to the GrailScope API (see /server). This is what
 *    you point at a real backend in staging/production.
 * ------------------------------------------------------------------------- */
export class HttpDataSource implements DataSource {
  constructor(private baseUrl: string) {}

  async listAssets(opts?: { category?: Category | "all"; query?: string }): Promise<Asset[]> {
    const params = new URLSearchParams();
    if (opts?.category && opts.category !== "all") params.set("category", opts.category);
    if (opts?.query) params.set("q", opts.query);
    const res = await fetch(`${this.baseUrl}/api/assets?${params.toString()}`);
    if (!res.ok) throw new Error(`GrailScope API ${res.status}`);
    return (await res.json()) as Asset[];
  }

  async getAsset(id: string): Promise<Asset | null> {
    const res = await fetch(`${this.baseUrl}/api/assets/${encodeURIComponent(id)}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`GrailScope API ${res.status}`);
    return (await res.json()) as Asset;
  }
}

/**
 * Factory: choose the data source from environment configuration.
 *
 *   VITE_DATA_SOURCE = "mock" | "http"
 *   VITE_API_URL     = "https://api.grailscope.app"   (when http)
 *
 * The apps call createDataSource() once and inject it everywhere.
 */
export function createDataSource(cfg?: { mode?: string; apiUrl?: string }): DataSource {
  const mode = cfg?.mode ?? "mock";
  if (mode === "http" && cfg?.apiUrl) return new HttpDataSource(cfg.apiUrl);
  return new MockDataSource();
}
