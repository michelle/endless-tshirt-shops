const BASE = process.env.PRODIGI_BASE_URL || "https://api.sandbox.prodigi.com";

function apiKey() {
  const key = process.env.PRODIGI_API_KEY;
  if (!key) throw new Error("PRODIGI_API_KEY is not set");
  return key;
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "X-API-Key": apiKey(),
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }
  return { status: res.status, body };
}

export async function findOrderByMerchantReference(merchantReference) {
  const { status, body } = await request(
    `/v4.0/Orders?merchantReferences=${encodeURIComponent(merchantReference)}&top=5`
  );
  if (status !== 200 || !body?.orders) return null;
  return body.orders.find((o) => o.merchantReference === merchantReference) || null;
}

export async function createOrder(payload, idempotencyKey) {
  const { status, body } = await request("/v4.0/Orders", {
    method: "POST",
    body: JSON.stringify({ ...payload, idempotencyKey }),
  });
  return { status, ...body };
}

export async function getOrder(id) {
  const { status, body } = await request(`/v4.0/Orders/${encodeURIComponent(id)}`);
  if (status !== 200) return null;
  return body?.order || null;
}
