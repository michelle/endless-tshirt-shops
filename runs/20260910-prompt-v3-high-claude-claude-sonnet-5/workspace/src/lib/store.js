// Server-only order persistence, backed by Vercel Blob.
// There's no database in this build (see README "Gaps") — each order is a
// small JSON document stored in Blob, keyed by a random order id. Good
// enough to bridge Stripe -> Prodigi safely; a real DB is a follow-up.
import "server-only";
import { put } from "@vercel/blob";

async function putJson(pathname, data) {
  const blob = await put(pathname, JSON.stringify(data), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  return blob.url;
}

async function getJson(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

export async function savePendingOrder(orderId, data) {
  return putJson(`orders/${orderId}/pending.json`, data);
}

export async function getPendingOrder(url) {
  return getJson(url);
}

export async function saveOrderResult(orderId, data) {
  return putJson(`orders/${orderId}/result.json`, data);
}

// Because blob pathnames are deterministic (addRandomSuffix: false), the
// result document for an order lives at the same base URL as its pending
// document, just a different filename - no database lookup required.
export function pendingUrlToResultUrl(pendingUrl) {
  return pendingUrl.replace(/\/pending\.json$/, "/result.json");
}

export async function getOrderResult(pendingUrl) {
  return getJson(pendingUrlToResultUrl(pendingUrl));
}
