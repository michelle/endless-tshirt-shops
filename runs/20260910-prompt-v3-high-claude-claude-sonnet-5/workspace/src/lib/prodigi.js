// Server-only helper for the Prodigi Print API.
import "server-only";

const BASE_URL = process.env.PRODIGI_API_BASE || "https://api.sandbox.prodigi.com/v4.0";

function apiKey() {
  const key = process.env.PRODIGI_API_KEY;
  if (!key) throw new Error("PRODIGI_API_KEY is not set");
  return key;
}

async function prodigiFetch(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey(),
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    const err = new Error(`Prodigi API ${path} failed: ${res.status}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

// Creates a print order. `idempotencyKey` should be the Stripe checkout
// session id so a webhook retry never places a duplicate physical order.
export async function createProdigiOrder({ idempotencyKey, merchantReference, recipient, items, callbackUrl }) {
  return prodigiFetch("/Orders", {
    method: "POST",
    body: JSON.stringify({
      merchantReference,
      idempotencyKey,
      shippingMethod: "Standard",
      callbackUrl,
      recipient,
      items,
    }),
  });
}

export async function getProdigiOrder(orderId) {
  return prodigiFetch(`/Orders/${orderId}`);
}
