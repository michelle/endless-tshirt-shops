// Order records stored on disk so the order-status page can show what we
// shipped. In production this would be a database; for the MVP a JSON file
// in `data/` is enough. The Stripe + Prodigi relationship is identified by
// both the Stripe session id and the Prodigi order id so a future dashboard
// can look up either way.

import fs from "node:fs/promises";
import path from "node:path";
import type { Design } from "./design";

export interface OrderRecord {
  key: string;
  stripeSessionId: string;
  stripePaymentIntentId: string | null;
  amountTotal: number | null;
  currency: string | null;
  design: Design;
  prodigiOrderId: string | null;
  prodigiOutcome: string | null;
  prodigiIssues: { code: string | null; description: string | null }[];
  createdAt: string;
  updatedAt: string;
}

const DATA_DIR = path.join(process.cwd(), "data");

async function ensureDir(): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch {
    // ignore - mkdir recursive; this just races with itself.
  }
}

function fileFor(key: string): string {
  // Stripe session ids start with "cs_test_" - they're URL-safe.
  const safe = key.replace(/[^a-zA-Z0-9_-]/g, "_");
  return path.join(DATA_DIR, `${safe}.json`);
}

export async function saveOrderRecord(rec: OrderRecord): Promise<void> {
  await ensureDir();
  const file = fileFor(rec.key);
  await fs.writeFile(file, JSON.stringify(rec, null, 2), "utf8");
}

export function getOrderRecord(key: string): OrderRecord | null {
  try {
    // Lazy require so Next can tree-shake it from client bundles.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fsSync = require("node:fs") as typeof import("node:fs");
    const file = fileFor(key);
    const txt = fsSync.readFileSync(file, "utf8");
    return JSON.parse(txt) as OrderRecord;
  } catch {
    return null;
  }
}

export function listOrderRecords(): OrderRecord[] {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fsSync = require("node:fs") as typeof import("node:fs");
    return fsSync
      .readdirSync(DATA_DIR)
      .filter((f) => f.endsWith(".json"))
      .map((f) => {
        try {
          return JSON.parse(
            fsSync.readFileSync(path.join(DATA_DIR, f), "utf8"),
          ) as OrderRecord;
        } catch {
          return null;
        }
      })
      .filter((r): r is OrderRecord => r !== null);
  } catch {
    return [];
  }
}
