const SP_API = "https://api.scalablepress.com/v2/";

export type ShippingAddress = {
  name: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zip: string;
  country?: string;
};

export class ScalablePressError extends Error {
  step: string;
  body: unknown;

  constructor(step: string, body: unknown) {
    super(`Scalable Press ${step} request failed`);
    this.step = step;
    this.body = body;
  }
}

function authHeader(): string {
  const key = process.env.SP_AUTH;
  if (!key) {
    throw new Error("SP_AUTH is not set");
  }
  return "Basic " + Buffer.from(`:${key}`).toString("base64");
}

/**
 * Uploads the shirt artwork as a DTG design and returns the designId.
 * Position/dimensions mirror the original datetime.store server: an
 * 8in-wide print centered on the chest, offset 3in from the collar.
 */
export async function uploadDesign(pngBuffer: Buffer): Promise<string> {
  const form = new FormData();
  form.append("type", "dtg");
  form.append(
    "sides[front][artwork]",
    new Blob([Uint8Array.from(pngBuffer)], { type: "image/png" }),
    "artwork.png",
  );
  form.append("sides[front][dimensions][width]", "8");
  form.append("sides[front][position][horizontal]", "C");
  form.append("sides[front][position][offset][top]", "3");

  const res = await fetch(SP_API + "design", {
    method: "POST",
    headers: { Authorization: authHeader() },
    body: form,
  });
  const body = await res.json();
  if (!res.ok || !body.designId) {
    throw new ScalablePressError("design", body);
  }
  return body.designId as string;
}

export type Quote = {
  orderToken: string;
  total: number;
};

export async function getQuote(opts: {
  productId: string;
  size: string;
  color: string;
  designId: string;
  address: ShippingAddress;
}): Promise<Quote> {
  const res = await fetch(SP_API + "quote", {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: "dtg",
      products: [
        {
          id: opts.productId,
          color: opts.color,
          quantity: 1,
          size: opts.size,
        },
      ],
      designId: opts.designId,
      address: opts.address,
    }),
  });
  const body = await res.json();
  if (!res.ok || !body.orderToken || (body.orderIssues && body.orderIssues.length)) {
    throw new ScalablePressError("quote", body);
  }
  return { orderToken: body.orderToken, total: body.total };
}

export async function placeOrder(orderToken: string): Promise<string> {
  const res = await fetch(SP_API + "order", {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ orderToken }),
  });
  const body = await res.json();
  if (!res.ok || !body.orderId) {
    throw new ScalablePressError("order", body);
  }
  return body.orderId as string;
}
