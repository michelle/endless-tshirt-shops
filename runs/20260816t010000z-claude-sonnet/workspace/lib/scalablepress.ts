const SP_API = "https://api.scalablepress.com/v2/";

function authHeader(): string {
  const spAuth = process.env.SP_AUTH;
  if (!spAuth) {
    throw new Error("SP_AUTH must be configured.");
  }
  return `Basic ${Buffer.from(`:${spAuth}`).toString("base64")}`;
}

export class ScalablePressError extends Error {
  issues?: unknown[];
  constructor(message: string, issues?: unknown[]) {
    super(message);
    this.issues = issues;
  }
}

async function parseJson(res: Response): Promise<any> {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { message: text };
  }
}

export async function createDesign(artwork: Buffer): Promise<string> {
  const form = new FormData();
  form.append("type", "dtg");
  form.append("sides[front][artwork]", new Blob([artwork], { type: "image/png" }), "artwork.png");
  form.append("sides[front][dimensions][width]", "8");
  form.append("sides[front][position][horizontal]", "C");
  form.append("sides[front][position][offset][top]", "3");

  const res = await fetch(`${SP_API}design`, {
    method: "POST",
    headers: { Authorization: authHeader() },
    body: form,
  });
  const body = await parseJson(res);
  if (!res.ok || !body.designId) {
    throw new ScalablePressError(body.message || "Design creation failed", body.issues);
  }
  return body.designId as string;
}

export interface QuoteAddress {
  name: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zip: string;
  country?: string;
}

export async function createQuote(params: {
  designId: string;
  productId: string;
  color: string;
  size: string;
  address: QuoteAddress;
}): Promise<string> {
  const res = await fetch(`${SP_API}quote`, {
    method: "POST",
    headers: { Authorization: authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "dtg",
      products: [
        {
          id: params.productId,
          color: params.color,
          quantity: 1,
          size: params.size,
        },
      ],
      designId: params.designId,
      address: params.address,
    }),
  });
  const body = await parseJson(res);
  const issues = body.orderIssues || body.issues;
  if (!res.ok || issues?.length || !body.orderToken) {
    throw new ScalablePressError(body.message || "Quote creation failed", issues);
  }
  return body.orderToken as string;
}

export async function createOrder(orderToken: string): Promise<string> {
  const res = await fetch(`${SP_API}order`, {
    method: "POST",
    headers: { Authorization: authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify({ orderToken }),
  });
  const body = await parseJson(res);
  if (!res.ok || !body.orderId) {
    throw new ScalablePressError(body.message || "Order submission failed", body.issues);
  }
  return body.orderId as string;
}
