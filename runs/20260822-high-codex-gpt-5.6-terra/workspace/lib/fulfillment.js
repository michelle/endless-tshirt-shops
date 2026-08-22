import sharp from "sharp";

const SP_API = "https://api.scalablepress.com/v2";

const PRODUCTS = {
  fitted: "next-level-boyfriend-tee",
  unisex: "next-level-fitted-crew",
};
const SIZES = { S: "sml", M: "med", L: "lrg", XL: "xlg" };

function apiError(message, status = 502, detail) {
  const error = new Error(message);
  error.status = status;
  error.detail = detail;
  return error;
}

async function spFetch(path, init = {}) {
  const response = await fetch(`${SP_API}${path}`, {
    ...init,
    headers: { Authorization: `Basic ${Buffer.from(`:${process.env.SP_AUTH}`).toString("base64")}`, ...(init.headers || {}) },
  });
  const text = await response.text();
  let body;
  try { body = JSON.parse(text); } catch { body = { raw: text }; }
  if (!response.ok || body.statusCode >= 300) throw apiError("Our print partner could not process this order.", 502, body);
  return body;
}

async function artworkPng(timestamp) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="300" viewBox="0 0 1600 300"><rect width="1600" height="300" fill="#000000"/><text x="800" y="142" text-anchor="middle" fill="#ffffff" font-family="monospace" font-size="100" font-weight="bold">${timestamp}</text><text x="800" y="210" text-anchor="middle" fill="#bdbdbd" font-family="monospace" font-size="26" letter-spacing="7">UNIX TIME · MILLISECONDS</text></svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

export async function submitFulfillment({ timestamp, style, size, shippingAddress, customerEmail, orderReference }) {
  const mode = process.env.SP_FULFILLMENT_MODE || "dry_run";
  const product = PRODUCTS[style];
  const sizeCode = SIZES[size];
  if (!product || !sizeCode) throw apiError("The selected shirt option is unavailable.", 400);

  const normalized = {
    reference: orderReference,
    product,
    style,
    size,
    timestamp,
    email: customerEmail,
    address: {
      name: shippingAddress?.name,
      address1: shippingAddress?.line1,
      address2: shippingAddress?.line2 || "",
      city: shippingAddress?.city,
      state: shippingAddress?.state,
      zip: shippingAddress?.postal_code,
      country: shippingAddress?.country || "US",
    },
  };

  // The safe default lets a test checkout exercise the same capture, validation,
  // and hand-off code without creating a physical shirt.
  if (mode === "dry_run") return { mode, orderId: `dry_${orderReference}`, request: normalized };
  if (!process.env.SP_AUTH) throw apiError("Fulfillment is not configured.", 503);

  // Scalable Press's design endpoint requires multipart upload (rather than a
  // public image URL), so the timestamp artwork never has to be hosted.
  const designForm = new FormData();
  designForm.append("type", "dtg");
  designForm.append("sides[front][artwork]", new Blob([await artworkPng(timestamp)], { type: "image/png" }), "datetime.png");
  designForm.append("sides[front][dimensions][width]", "8");
  designForm.append("sides[front][position][horizontal]", "C");
  designForm.append("sides[front][position][offset][top]", "3");
  const design = await spFetch("/design", {
    method: "POST",
    body: designForm,
  });
  const quote = await spFetch("/quote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "dtg",
      products: [{ id: product, color: "Black", quantity: 1, size: sizeCode }],
      designId: design.designId,
      address: normalized.address,
    }),
  });
  if (quote.orderIssues?.length) throw apiError("The shipping address needs attention.", 422, quote.orderIssues);
  const order = await spFetch("/order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderToken: quote.orderToken }),
  });
  return { mode, orderId: order.orderId, request: normalized };
}
