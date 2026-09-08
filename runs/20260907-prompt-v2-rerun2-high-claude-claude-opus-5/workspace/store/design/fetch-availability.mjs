// Pulls the live Prodigi catalogue for our SKU and records, per colour+size,
// which countries it can actually be fulfilled to. Run this when the range changes.
import fs from "node:fs/promises";
import path from "node:path";

const SKU = "GLOBAL-TEE-GIL-64000";
const BASE = process.env.PRODIGI_API_BASE ?? "https://api.sandbox.prodigi.com/v4.0";
const root = path.resolve(import.meta.dirname, "..");

const res = await fetch(`${BASE}/products/${SKU}`, { headers: { "X-API-Key": process.env.PRODIGI_API_KEY } });
if (!res.ok) throw new Error(`catalogue fetch failed: ${res.status}`);
const { product } = await res.json();

// A colour+size can appear as several variants (one per production region);
// a country is reachable if ANY of them serves it.
const map = {};
for (const v of product.variants) {
  const k = `${v.attributes.color}|${v.attributes.size}`;
  map[k] = [...new Set([...(map[k] ?? []), ...v.shipsTo])].sort();
}
await fs.writeFile(path.join(root, "data/availability.json"),
  JSON.stringify({ sku: SKU, fetched: new Date().toISOString().slice(0, 10), shipsTo: map }, null, 0) + "\n");
console.log("✓ availability for", Object.keys(map).length, "variants");
