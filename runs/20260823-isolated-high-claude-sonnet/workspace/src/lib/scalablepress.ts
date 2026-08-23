const SP_BASE_URL = "https://api.scalablepress.com/v2";

export class ScalablePressError extends Error {
  step: string;
  details: unknown;

  constructor(step: string, details: unknown) {
    super(`Scalable Press ${step} request failed`);
    this.name = "ScalablePressError";
    this.step = step;
    this.details = details;
  }
}

function authHeader(): string {
  const key = process.env.SP_AUTH;
  if (!key) {
    throw new Error("Missing SP_AUTH environment variable");
  }
  // Scalable Press uses HTTP basic auth with the API key as the password.
  return "Basic " + Buffer.from(`:${key}`).toString("base64");
}

async function spRequest(
  path: string,
  init: RequestInit
): Promise<Record<string, unknown>> {
  const res = await fetch(`${SP_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: authHeader(),
      ...(init.headers ?? {}),
    },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new ScalablePressError(path, data);
  }
  return data;
}

/** Uploads the printed artwork (a PNG data URL) and returns a Scalable Press designId. */
export async function createDesign(artworkDataUrl: string): Promise<string> {
  const match = /^data:image\/png;base64,(.+)$/.exec(artworkDataUrl);
  if (!match) {
    throw new Error("artwork must be a base64 PNG data URL");
  }
  const buffer = Buffer.from(match[1], "base64");

  const form = new FormData();
  form.append("type", "dtg");
  form.append(
    "sides[front][artwork]",
    new Blob([buffer], { type: "image/png" }),
    "artwork.png"
  );
  form.append("sides[front][dimensions][width]", "10");
  form.append("sides[front][position][horizontal]", "C");
  form.append("sides[front][position][offset][top]", "3");

  const data = await spRequest("/design", { method: "POST", body: form });
  return data.designId as string;
}

export interface ShippingAddress {
  name: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface QuoteResult {
  orderToken: string | null;
  total: number;
  orderIssues?: { code: string; path?: string; message: string }[];
}

export async function createQuote(opts: {
  designId: string;
  productId: string;
  color: string;
  sizeCode: string;
  address: ShippingAddress;
}): Promise<QuoteResult> {
  const data = await spRequest("/quote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "dtg",
      designId: opts.designId,
      products: [
        {
          id: opts.productId,
          color: opts.color,
          size: opts.sizeCode,
          quantity: 1,
        },
      ],
      address: opts.address,
    }),
  });
  return {
    orderToken: (data.orderToken as string | null) ?? null,
    total: data.total as number,
    orderIssues: data.orderIssues as QuoteResult["orderIssues"],
  };
}

export interface PlacedOrder {
  orderId: string;
  status: string;
}

export async function placeOrder(orderToken: string): Promise<PlacedOrder> {
  const data = await spRequest("/order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderToken }),
  });
  return {
    orderId: data.orderId as string,
    status: data.status as string,
  };
}
