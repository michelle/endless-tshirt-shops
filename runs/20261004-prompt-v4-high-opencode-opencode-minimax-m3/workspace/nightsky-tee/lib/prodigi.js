// Prodigi Print API client.
//
// We POST orders once payment has succeeded (Stripe webhook firing).
// Sandbox base URL is api.sandbox.prodigi.com; the live key would
// override PRODIGI_BASE_URL via env.
//
// Authentication is via the `X-API-Key: <key>` header.
//
// API reference:
//   https://www.prodigi.com/print-api/docs/reference/

const SANDBOX_BASE = "https://api.sandbox.prodigi.com";
const LIVE_BASE    = "https://api.prodigi.com";

// T-shirt SKU we use. Prodigi picks the lab closest to the recipient.
// Parent SKU accepts attributes { color, size }.
export const TEE_SKU = "GLOBAL-TEE-BC-3001";

// Front-print area, where we land the customer artwork.
// (BC-3001 also supports back/neck/sleeve but we only use the front.)
const PRINT_AREA = "front";

// Translate our storefront color names to the exact SKU strings Prodigi
// lists for BC-3001. Querying the SKU returns the full allowed color list;
// these are the ones we expose.
const COLOR_MAP = {
  "black":    "black",
  "navy":     "navy blue",
  "charcoal": "asphalt"
};

export class ProdigiClient {
  constructor({ apiKey, baseUrl, live = false } = {}) {
    if (!apiKey) throw new Error("Prodigi API key required");
    this.apiKey = apiKey;
    this.baseUrl = baseUrl
      || (live ? LIVE_BASE : SANDBOX_BASE);
  }

  // Place an order. Async — returns Stripe-ish response payload from Prodigi.
  // Side-effect: hits POST /v4.0/Orders.
  async placeOrder({
    assetUrl,
    color,
    size,
    recipient,
    merchantReference,
    idempotencyKey,
    shippingMethod = "Standard",
    recipientCost
  }) {
    const order = {
      merchantReference,
      idempotencyKey,
      shippingMethod,
      recipient: {
        name: recipient.name,
        email: recipient.email || null,
        phoneNumber: recipient.phone || null,
        address: {
          line1: recipient.line1,
          line2: recipient.line2 || null,
          postalOrZipCode: recipient.zip,
          countryCode: recipient.country,
          townOrCity: recipient.city,
          stateOrCounty: recipient.state || null
        }
      },
      items: [{
        merchantReference: `${merchantReference}-item`,
        sku: TEE_SKU,
        copies: 1,
        sizing: "fillPrintArea",
        attributes: {
          color: COLOR_MAP[color] || color,
          size
        },
        recipientCost: recipientCost
          ? { amount: recipientCost.amount, currency: recipientCost.currency }
          : null,
        assets: [{
          printArea: PRINT_AREA,
          url: assetUrl
        }]
      }]
    };

    const url = `${this.baseUrl}/v4.0/Orders`;
    console.log(`[prodigi-client] POST ${url} merchantReference=${merchantReference}`);
    const t0 = Date.now();
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 30_000);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "X-API-Key": this.apiKey,
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(order),
        signal: controller.signal
      });
      console.log(`[prodigi-client] ${url} -> ${res.status} in ${Date.now() - t0}ms`);
      const text = await res.text();
      let json;
      try { json = JSON.parse(text); } catch { json = { rawText: text }; }
      if (!res.ok && (json.outcome === "ValidationFailed" || json.failures)) {
        const err = new Error(`Prodigi validation failed: ${JSON.stringify(json)}`);
        err.prodigiResp = json;
        err.status = 400;
        throw err;
      }
      if (!res.ok) {
        const err = new Error(`Prodigi ${res.status}: ${text}`);
        err.prodigiResp = json;
        err.status = res.status;
        throw err;
      }
      return json;
    } finally {
      clearTimeout(tid);
    }
  }

  // Get an order status (useful for the "thank you" page polling)
  async getOrder(orderId) {
    const res = await fetch(`${this.baseUrl}/v4.0/orders/${encodeURIComponent(orderId)}`, {
      headers: { "X-API-Key": this.apiKey, "Accept": "application/json" }
    });
    return res.json();
  }
}
