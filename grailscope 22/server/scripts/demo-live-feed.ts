/**
 * Proves the automatic feeding pipeline end to end, across TWO real connectors.
 *
 *   OFFLINE (default):  node --import tsx server/scripts/demo-live-feed.ts
 *     → uses recorded payloads in core/src/connectors/__fixtures__
 *   LIVE:               LIVE=1 node --import tsx server/scripts/demo-live-feed.ts
 *     → hits the real api.scryfall.com + api.pokemontcg.io (needs network)
 *
 * Either way the SAME adapter code runs; only the fetch target differs.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  ScryfallAdapter,
  PokemonTcgAdapter,
  aggregateProviders,
  computeSignal,
  formatPrice,
} from "@grailscope/core";

const here = dirname(fileURLToPath(import.meta.url));
const fixDir = join(here, "..", "..", "packages", "core", "src", "connectors", "__fixtures__");

function fixtureFetch(file: string, key: "exact" | "q"): typeof fetch {
  const sample = JSON.parse(readFileSync(join(fixDir, file), "utf8")) as Record<string, unknown>;
  return (async (url: string | URL | Request) => {
    const u = new URL(String(url));
    const lookup = u.searchParams.get(key) ?? "";
    const payload = sample[lookup];
    return { ok: !!payload, status: payload ? 200 : 404, json: async () => payload } as Response;
  }) as typeof fetch;
}

const live = process.env.LIVE === "1";
const adapters = live
  ? [new ScryfallAdapter(), new PokemonTcgAdapter()]
  : [
      new ScryfallAdapter({ fetchImpl: fixtureFetch("scryfall-sample.json", "exact") }),
      new PokemonTcgAdapter({ fetchImpl: fixtureFetch("pokemontcg-sample.json", "q") }),
    ];

const assets = await aggregateProviders(adapters);
console.log(`\nSource: ${live ? "LIVE APIs" : "recorded fixtures"} — ${assets.length} items normalised from ${adapters.length} connectors\n`);
for (const a of assets) {
  const s = computeSignal(a);
  console.log(`  ${a.name.padEnd(28)} ${formatPrice(a.price).padStart(12)}  ${s.signal.padEnd(5)}  ${a.provenance ?? ""}`);
}
console.log("");
