import "server-only";

const BASE = "https://api.scalablepress.com/v2";

export type ShippingAddress = {
  name: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zip: string;
  email?: string;
};

export type CreateDesignResult = {
  designId: string;
  mode: "test" | "live";
};

export type CreateQuoteResult = {
  orderToken: string;
  total: number;
  subtotal: number;
  shipping: number;
  tax: number;
  fees: number;
  mode: "test" | "live";
};

export type PlaceOrderResult = {
  orderId: string;
  mode: "test" | "live";
  status?: string;
};

function authHeader(): string {
  const key = process.env.SP_AUTH;
  if (!key) throw new Error("SP_AUTH is not set");
  return "Basic " + Buffer.from(`:${key}`).toString("base64");
}

async function assertOk(res: Response, label: string) {
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Scalable Press ${label} failed: ${res.status} ${body}`);
  }
}

/** Uploads the print-ready artwork and registers it as a reusable design. */
export async function createDesign(pngBuffer: Buffer): Promise<CreateDesignResult> {
  const form = new FormData();
  form.append("type", "dtg");
  form.append(
    "sides[front][artwork]",
    new Blob([new Uint8Array(pngBuffer)], { type: "image/png" }),
    "datetime-store-artwork.png"
  );
  form.append("sides[front][dimensions][width]", "10");
  form.append("sides[front][position][horizontal]", "C");
  form.append("sides[front][position][offset][top]", "3");

  const res = await fetch(`${BASE}/design`, {
    method: "POST",
    headers: { Authorization: authHeader() },
    body: form,
  });
  await assertOk(res, "design creation");
  return res.json();
}

export async function createQuote(params: {
  designId: string;
  productId: string;
  color: string;
  size: string;
  address: ShippingAddress;
}): Promise<CreateQuoteResult> {
  const body = new URLSearchParams();
  body.set("type", "dtg");
  body.set("designId", params.designId);
  body.set("products[0][id]", params.productId);
  body.set("products[0][color]", params.color);
  body.set("products[0][size]", params.size);
  body.set("products[0][quantity]", "1");
  body.set("address[name]", params.address.name);
  body.set("address[address1]", params.address.address1);
  if (params.address.address2) body.set("address[address2]", params.address.address2);
  body.set("address[city]", params.address.city);
  body.set("address[state]", params.address.state);
  body.set("address[zip]", params.address.zip);
  if (params.address.email) body.set("address[email]", params.address.email);

  const res = await fetch(`${BASE}/quote`, {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });
  await assertOk(res, "quote");
  return res.json();
}

export async function placeOrder(orderToken: string): Promise<PlaceOrderResult> {
  const body = new URLSearchParams({ orderToken });
  const res = await fetch(`${BASE}/order`, {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });
  await assertOk(res, "order placement");
  return res.json();
}
