import { SIZES, STYLES } from "./catalog.js";
import sharp from "sharp";

const API = "https://api.scalablepress.com/v2";

function authHeader() {
  if (!process.env.SP_AUTH) throw new Error("Scalable Press is not configured");
  return `Basic ${Buffer.from(`:${process.env.SP_AUTH}`).toString("base64")}`;
}

async function spFetch(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: { Authorization: authHeader(), Accept: "application/json", ...options.headers },
    cache: "no-store",
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.statusCode >= 300) {
    const error = new Error(body.message || `Scalable Press request failed (${response.status})`);
    error.issues = body.issues || body.orderIssues || [];
    throw error;
  }
  return body;
}

function artworkSvg(timestamp) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="2400" height="600" viewBox="0 0 2400 600"><rect width="2400" height="600" fill="none"/><text x="1200" y="390" text-anchor="middle" fill="#fff" font-family="Arial,Helvetica,sans-serif" font-size="260" font-weight="700" letter-spacing="8">${timestamp}</text></svg>`;
}

export async function createDesign(timestamp) {
  const artwork = await sharp(Buffer.from(artworkSvg(timestamp))).png().toBuffer();
  const form = new FormData();
  form.set("type", "dtg");
  form.set("sides[front][artwork]", new Blob([artwork], { type: "image/png" }), "timestamp.png");
  form.set("sides[front][dimensions][width]", "8");
  form.set("sides[front][position][horizontal]", "C");
  form.set("sides[front][position][offset][top]", "3");
  const body = await spFetch("/design", { method: "POST", body: form });
  if (!body.designId) throw new Error("Scalable Press returned no design ID");
  return body.designId;
}

export async function quoteOrder({ designId, style, size, address }) {
  const body = await spFetch("/quote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "dtg",
      products: [{ id: STYLES[style].productId, color: "Black", quantity: 1, size: SIZES[size] }],
      designId,
      address,
    }),
  });
  if (body.orderIssues?.length) throw Object.assign(new Error("Address or product cannot be fulfilled"), { issues: body.orderIssues });
  if (!body.orderToken) throw new Error("Scalable Press returned no order token");
  return body;
}

export async function submitOrder(orderToken) {
  if (process.env.SP_SUBMIT_ORDERS !== "true") return { orderId: null, dryRun: true };
  const body = await spFetch("/order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderToken }),
  });
  if (!body.orderId) throw new Error("Scalable Press returned no order ID");
  return { orderId: body.orderId, dryRun: false };
}
