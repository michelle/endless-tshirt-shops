import sharp from "sharp";
import type Stripe from "stripe";
import { SP_PRODUCTS, SP_SIZES, type ShirtSize, type ShirtStyle } from "./product";

const SP_API = "https://api.scalablepress.com/v2";

type SpIssue = { message?: string };
type SpResponse = {
  statusCode?: number;
  message?: string;
  issues?: SpIssue[];
  orderIssues?: SpIssue[];
  designId?: string;
  orderToken?: string;
  orderId?: string;
  total?: number;
};

function authorization() {
  if (!process.env.SP_AUTH) throw new Error("SP_AUTH is not configured");
  return `Basic ${Buffer.from(`:${process.env.SP_AUTH}`).toString("base64")}`;
}

async function spFetch(path: string, init: RequestInit) {
  const response = await fetch(`${SP_API}${path}`, {
    ...init,
    headers: { Authorization: authorization(), ...init.headers },
    signal: AbortSignal.timeout(25_000),
  });
  const payload = (await response.json()) as SpResponse;
  const issues = [...(payload.issues || []), ...(payload.orderIssues || [])];
  if (!response.ok || (payload.statusCode && payload.statusCode >= 300) || issues.length) {
    const detail = issues.map((issue) => issue.message).filter(Boolean).join("; ");
    throw new Error(`Scalable Press ${path} failed: ${detail || payload.message || response.status}`);
  }
  return payload;
}

function escapeXml(value: string) {
  return value.replace(/[<>&'\"]/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[char]!);
}

export async function createTimestampArtwork(timestamp: string) {
  const safeTimestamp = escapeXml(timestamp);
  const svg = Buffer.from(`<svg width="2400" height="900" viewBox="0 0 2400 900" xmlns="http://www.w3.org/2000/svg">
    <text x="1200" y="455" text-anchor="middle" dominant-baseline="middle" fill="#fff" font-family="DejaVu Sans Mono,monospace" font-size="250" font-weight="500" letter-spacing="8">${safeTimestamp}</text>
    <text x="1200" y="650" text-anchor="middle" fill="#aaa" font-family="DejaVu Sans Mono,monospace" font-size="58" letter-spacing="20">UNIX TIME · MILLISECONDS</text>
  </svg>`);
  return sharp(svg).png({ compressionLevel: 9 }).toBuffer();
}

export async function createDesign(timestamp: string) {
  const artwork = await createTimestampArtwork(timestamp);
  const form = new FormData();
  form.append("type", "dtg");
  form.append("sides[front][artwork]", new Blob([new Uint8Array(artwork)], { type: "image/png" }), "timestamp.png");
  form.append("sides[front][dimensions][width]", "8");
  form.append("sides[front][position][horizontal]", "C");
  form.append("sides[front][position][offset][top]", "3");
  const payload = await spFetch("/design", { method: "POST", body: form });
  if (!payload.designId) throw new Error("Scalable Press did not return a design ID");
  return payload.designId;
}

export async function createQuote(input: {
  designId: string;
  style: ShirtStyle;
  size: ShirtSize;
  shipping: Stripe.Address & { name?: string | null };
}) {
  const { shipping } = input;
  const payload = await spFetch("/quote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "dtg",
      products: [{ id: SP_PRODUCTS[input.style], color: "Black", quantity: 1, size: SP_SIZES[input.size] }],
      designId: input.designId,
      address: {
        name: shipping.name,
        address1: shipping.line1,
        address2: shipping.line2 || "",
        city: shipping.city,
        state: shipping.state,
        zip: shipping.postal_code,
        country: shipping.country || "US",
      },
    }),
  });
  if (!payload.orderToken) throw new Error("Scalable Press quote is not order-ready");
  return payload;
}

export async function placeOrder(orderToken: string) {
  const payload = await spFetch("/order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderToken }),
  });
  if (!payload.orderId) throw new Error("Scalable Press did not return an order ID");
  return payload.orderId;
}
