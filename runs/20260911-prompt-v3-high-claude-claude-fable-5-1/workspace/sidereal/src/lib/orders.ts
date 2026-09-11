import { get, list, put } from "@vercel/blob";
import type { Design } from "./design";

// Order records live in Vercel Blob as small JSON documents keyed by the
// Stripe Checkout Session id. Stripe remains the source of truth for payment
// and the full shipping address; we only keep what the storefront needs.

export type OrderStatus = "paid" | "submitted" | "failed";

export interface OrderRecord {
  id: string; // Stripe checkout session id
  createdAt: string;
  updatedAt: string;
  status: OrderStatus;
  email: string | null;
  customerName: string | null;
  country: string | null;
  design: Design;
  designEncoded: string;
  size: string;
  quantity: number;
  amountTotal: number;
  currency: string;
  shippingMethod: string;
  paymentIntentId: string | null;
  printUrl?: string;
  prodigiOrderId?: string;
  prodigiOutcome?: string;
  error?: string;
  events: { at: string; message: string }[];
}

const PREFIX = "orders/";

function pathFor(id: string) {
  return `${PREFIX}${id}.json`;
}

export async function getOrder(id: string): Promise<OrderRecord | null> {
  if (!/^cs_[A-Za-z0-9_]+$/.test(id)) return null;
  try {
    const res = await get(pathFor(id), { access: "public", useCache: false });
    if (!res || !res.stream) return null;
    const text = await new Response(res.stream).text();
    return JSON.parse(text) as OrderRecord;
  } catch (err) {
    if ((err as { name?: string })?.name === "BlobNotFoundError") return null;
    throw err;
  }
}

export async function saveOrder(rec: OrderRecord): Promise<void> {
  rec.updatedAt = new Date().toISOString();
  await put(pathFor(rec.id), JSON.stringify(rec, null, 2), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 0,
  });
}

export async function listOrders(limit = 100): Promise<OrderRecord[]> {
  const { blobs } = await list({ prefix: PREFIX, limit });
  const recs = await Promise.all(
    blobs.map(async (b) => {
      const r = await fetch(b.url, { cache: "no-store" });
      return (await r.json()) as OrderRecord;
    }),
  );
  return recs.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function storePrintFile(id: string, png: Buffer): Promise<string> {
  const res = await put(`prints/${id}.png`, png, {
    access: "public",
    contentType: "image/png",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  return res.url;
}
