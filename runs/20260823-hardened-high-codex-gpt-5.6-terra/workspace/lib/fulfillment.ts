const SP_API = process.env.SP_API_BASE || "https://api.scalablepress.com/v2";
const PRODUCTS = {
  fitted: "next-level-boyfriend-tee",
  unisex: "next-level-fitted-crew",
} as const;
const SIZES: Record<string, string> = { S: "sml", M: "med", L: "lrg", XL: "xlg" };

export type FulfillmentInput = {
  sessionId: string;
  timestamp: string;
  style: keyof typeof PRODUCTS;
  size: string;
  email: string;
  address: { name?: string | null; line1?: string | null; line2?: string | null; city?: string | null; state?: string | null; postal_code?: string | null; country?: string | null };
};

function configError() {
  if (!process.env.SP_AUTH) throw new Error("Scalable Press is not configured (SP_AUTH is missing).");
}

function authHeaders() {
  return { Authorization: `Basic ${Buffer.from(`:${process.env.SP_AUTH}`).toString("base64")}` };
}

async function spJson(path: string, init: RequestInit) {
  const response = await fetch(`${SP_API}${path}`, { ...init, headers: { ...authHeaders(), ...init.headers } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.statusCode >= 300) throw new Error(`Scalable Press ${path} failed: ${body.message || body.error || response.statusText}`);
  return body;
}

async function artwork(timestamp: string) {
  const clean = timestamp.replace(/[^0-9]/g, "");
  const svg = `<svg width="1800" height="600" viewBox="0 0 1800 600" xmlns="http://www.w3.org/2000/svg"><rect width="1800" height="600" fill="transparent"/><text x="900" y="270" fill="white" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="130" font-weight="500">${clean}</text><text x="900" y="350" fill="white" opacity=".78" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="28" letter-spacing="9">THE MOMENT YOU MADE IT YOURS</text></svg>`;
  // Vector artwork keeps the printed digits crisp and avoids a native image
  // binary in the serverless fulfillment path.
  return Buffer.from(svg);
}

/** Sends a paid order to Scalable Press. Keep FULFILLMENT_MODE=dry_run until samples are approved. */
export async function createFulfillment(input: FulfillmentInput) {
  configError();
  if (!PRODUCTS[input.style] || !SIZES[input.size]) throw new Error("Unsupported shirt option.");
  if ((process.env.FULFILLMENT_MODE || "dry_run") !== "live") {
    return { dryRun: true, orderId: `dry-run-${input.sessionId}` };
  }

  const form = new FormData();
  form.append("type", "dtg");
  form.append("sides[front][artwork]", new Blob([await artwork(input.timestamp)], { type: "image/svg+xml" }), "datetime.svg");
  form.append("sides[front][dimensions][width]", "8");
  form.append("sides[front][position][horizontal]", "C");
  form.append("sides[front][position][offset][top]", "3");
  const design = await spJson("/design", { method: "POST", body: form });

  const quote = await spJson("/quote", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      type: "dtg",
      products: [{ id: PRODUCTS[input.style], color: "Black", quantity: 1, size: SIZES[input.size] }],
      designId: design.designId,
      address: {
        name: input.address.name,
        address1: input.address.line1,
        address2: input.address.line2 || undefined,
        city: input.address.city,
        state: input.address.state,
        zip: input.address.postal_code,
        country: input.address.country || "US",
      },
    }),
  });
  if (quote.orderIssues?.length) throw new Error(`Scalable Press quote issue: ${quote.orderIssues[0]?.message || "invalid order"}`);
  const order = await spJson("/order", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ orderToken: quote.orderToken }) });
  return { dryRun: false, orderId: order.orderId, designId: design.designId };
}
