const SP_API = "https://api.scalablepress.com/v2/";

function auth(): string {
  const key = process.env.SP_AUTH;
  if (!key) throw new Error("SP_AUTH is not set");
  return "Basic " + Buffer.from(`:${key}`).toString("base64");
}

export interface ShipAddress {
  name: string;
  address1: string;
  address2?: string | null;
  city: string;
  state: string;
  zip: string;
  country?: string;
}

export async function createDesign(artworkPng: Buffer): Promise<string> {
  const form = new FormData();
  form.append("type", "dtg");
  form.append(
    "sides[front][artwork]",
    new Blob([new Uint8Array(artworkPng)], { type: "image/png" }),
    "artwork.png"
  );
  form.append("sides[front][dimensions][width]", "8");
  form.append("sides[front][position][horizontal]", "C");
  form.append("sides[front][position][offset][top]", "3");

  const res = await fetch(SP_API + "design", {
    method: "POST",
    headers: { Authorization: auth() },
    body: form,
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(`Scalable Press design error: ${JSON.stringify(body)}`);
  }
  return body.designId as string;
}

export interface QuoteResult {
  orderToken: string;
  total: number;
  orderIssues?: Array<{ message: string }>;
}

export async function createQuote(
  productId: string,
  color: string,
  size: string,
  designId: string,
  address: ShipAddress
): Promise<QuoteResult> {
  const params = new URLSearchParams();
  params.set("type", "dtg");
  params.set("products[0][id]", productId);
  params.set("products[0][color]", color);
  params.set("products[0][quantity]", "1");
  params.set("products[0][size]", size);
  params.set("designId", designId);
  params.set("address[name]", address.name);
  params.set("address[address1]", address.address1);
  if (address.address2) params.set("address[address2]", address.address2);
  params.set("address[city]", address.city);
  params.set("address[state]", address.state);
  params.set("address[zip]", address.zip);
  if (address.country) params.set("address[country]", address.country);

  const res = await fetch(SP_API + "quote", {
    method: "POST",
    headers: {
      Authorization: auth(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });
  const body = await res.json();
  if (!res.ok || !body.orderToken) {
    throw new Error(`Scalable Press quote error: ${JSON.stringify(body)}`);
  }
  return body as QuoteResult;
}

export async function createOrder(orderToken: string): Promise<string> {
  const params = new URLSearchParams();
  params.set("orderToken", orderToken);

  const res = await fetch(SP_API + "order", {
    method: "POST",
    headers: {
      Authorization: auth(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(`Scalable Press order error: ${JSON.stringify(body)}`);
  }
  return body.orderId as string;
}
