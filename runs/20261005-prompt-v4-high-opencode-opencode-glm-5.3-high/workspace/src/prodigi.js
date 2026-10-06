// Prodigi Print API v4 client (server-side only — the API key never leaves the server).
import { PRODIGI_KEY } from "./env.js";

const BASE =
  process.env.PRODIGI_API_BASE || "https://api.sandbox.prodigi.com/v4.0";

async function call(method, path, body) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30000);
  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        "X-API-Key": PRODIGI_KEY,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    });
    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      /* non-JSON error page */
    }
    if (!res.ok) {
      const msg =
        json?.errors?.map((e) => e.message || e.description).join("; ") ||
        json?.error?.message ||
        `Prodigi HTTP ${res.status}`;
      const err = new Error(`Prodigi: ${msg}`);
      err.status = res.status;
      err.body = json;
      throw err;
    }
    if (json && json.outcome && !["Ok", "Created"].includes(json.outcome)) {
      console.warn(`[prodigi] ${path} outcome=${json.outcome}`, JSON.stringify(json.issues || []));
    }
    return json;
  } finally {
    clearTimeout(timer);
  }
}

// Wholesale quote for one item to a destination (USD, Standard shipping).
export function quoteOrder({ attributes, destinationCountryCode }) {
  return call("POST", "/quotes", {
    shippingMethod: "Standard",
    destinationCountryCode,
    currencyCode: "USD",
    items: [
      {
        sku: "GLOBAL-TEE-GIL-64000",
        copies: 1,
        attributes,
        assets: [{ printArea: "front" }],
      },
    ],
  });
}

// Create & submit a fulfilment order with the print file.
export function createProdigiOrder({ merchantReference, recipient, attributes, printFileUrl, md5, recipientCost, metadata }) {
  return call("POST", "/Orders", {
    merchantReference,
    callbackUrl: process.env.PRODIGI_CALLBACK_URL || null,
    shippingMethod: "Standard",
    recipient,
    items: [
      {
        merchantReference,
        sku: "GLOBAL-TEE-GIL-64000",
        copies: 1,
        sizing: "fillPrintArea",
        attributes,
        recipientCost: { amount: recipientCost.toFixed(2), currency: "USD" },
        assets: [
          {
            printArea: "front",
            url: printFileUrl,
            ...(md5 ? { md5Hash: md5 } : {}),
          },
        ],
      },
    ],
    ...(metadata ? { metadata } : {}),
  });
}

export function getProdigiOrder(orderId) {
  return call("GET", `/Orders/${orderId}`);
}
