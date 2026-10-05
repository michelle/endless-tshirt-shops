const API = "https://api.sandbox.prodigi.com/v4.0";

export async function createProdigiOrder(order) {
  const key = process.env.PRODIGI_API_KEY;
  if (!key) throw new Error("PRODIGI_API_KEY is not set");
  const res = await fetch(`${API}/orders`, {
    method: "POST",
    headers: {
      "X-API-Key": key,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(order),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok && !data.outcome) {
    const err = new Error(`Prodigi rejected the order (${res.status})`);
    err.detail = data;
    throw err;
  }
  return data;
}
