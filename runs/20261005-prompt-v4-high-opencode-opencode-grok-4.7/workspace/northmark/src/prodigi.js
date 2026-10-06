const BASE = process.env.PRODIGI_API_BASE || "https://api.sandbox.prodigi.com";

function key() {
  const value = process.env.PRODIGI_API_KEY;
  if (!value) {
    const err = new Error("Print service is not configured.");
    err.status = 500;
    throw err;
  }
  return value;
}

async function request(path, { method = "GET", body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "X-API-Key": key(),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const err = new Error(data?.error?.message || data?.outcome || `Print service error (${res.status})`);
    err.status = 502;
    err.detail = data;
    throw err;
  }
  return data;
}

export async function quoteOrder({ country, size, color, copies, method = "Standard" }) {
  const data = await request("/v4.0/quotes", {
    method: "POST",
    body: {
      shippingMethod: method,
      destinationCountryCode: country,
      currencyCode: "USD",
      items: [
        {
          sku: "GLOBAL-TEE-GIL-2000",
          copies,
          attributes: { color, size },
          assets: [{ printArea: "front" }],
        },
      ],
    },
  });
  const quote = data.quotes?.[0];
  if (!quote) {
    const err = new Error("No shipping quote was returned for that address.");
    err.status = 400;
    err.detail = data;
    throw err;
  }
  return {
    outcome: data.outcome,
    issues: (data.issues || []).filter((issue) => !String(issue.errorCode || "").includes("SalesTax")),
    items: money(quote.costSummary.items),
    shipping: money(quote.costSummary.shipping),
    currency: quote.costSummary.totalCost.currency || "USD",
    method: quote.shipmentMethod || method,
  };
}

export async function createOrder(payload) {
  return request("/v4.0/orders", { method: "POST", body: payload });
}

export async function getOrder(id) {
  return request(`/v4.0/orders/${encodeURIComponent(id)}`);
}

export async function findByMerchantReference(reference) {
  const url = `/v4.0/orders?top=5&merchantReferences=${encodeURIComponent(reference)}`;
  const data = await request(url);
  return (data.orders || []).find((order) => order.merchantReference === reference) || null;
}

function money(cost) {
  return {
    amount: cost?.amount || "0.00",
    currency: cost?.currency || "USD",
    cents: Math.round(Number(cost?.amount || 0) * 100),
  };
}
