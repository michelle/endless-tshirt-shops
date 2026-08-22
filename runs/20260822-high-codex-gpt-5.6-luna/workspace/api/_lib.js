const Stripe = require("stripe");

const PRODUCTS = {
  fitted: "next-level-boyfriend-tee",
  unisex: "next-level-fitted-crew"
};
const SIZES = { S: "sml", M: "med", L: "lrg", XL: "xlg" };
const SP_API = process.env.SP_API_URL || "https://api.scalablepress.com/v2";
const locks = new Map();

function stripeClient() {
  const key = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_API_KEY;
  if (!key) throw new Error("Stripe is not configured. Add STRIPE_SECRET_KEY.");
  return new Stripe(key, { apiVersion: "2025-07-30.basil", maxNetworkRetries: 2 });
}

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

function parseBody(req) {
  if (req.body && typeof req.body === "object") return Promise.resolve(req.body);
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 3_500_000) reject(new Error("Request is too large."));
    });
    req.on("end", () => {
      try { resolve(raw ? JSON.parse(raw) : {}); } catch { reject(new Error("Invalid JSON request.")); }
    });
    req.on("error", reject);
  });
}

function origin(req) {
  const forwarded = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return `${forwarded}://${host}`;
}

function getArtworkBuffer(dataUrl) {
  if (typeof dataUrl !== "string") throw new Error("Artwork is required.");
  const match = dataUrl.match(/^data:image\/(png|jpeg);base64,([a-zA-Z0-9+/=]+)$/);
  if (!match) throw new Error("Artwork must be a PNG or JPEG data URL.");
  const buffer = Buffer.from(match[2], "base64");
  if (!buffer.length || buffer.length > 2_500_000) throw new Error("Artwork is too large.");
  return { buffer, type: match[1] };
}

function spHeaders() {
  if (!process.env.SP_AUTH) throw new Error("Scalable Press is not configured. Add SP_AUTH.");
  return { Authorization: `Basic ${Buffer.from(`:${process.env.SP_AUTH}`).toString("base64")}` };
}

async function spRequest(path, options = {}) {
  const response = await fetch(`${SP_API}${path}`, {
    ...options,
    headers: { ...spHeaders(), ...(options.headers || {}) }
  });
  const text = await response.text();
  let body;
  try { body = text ? JSON.parse(text) : {}; } catch { body = { message: text }; }
  if (!response.ok || body.statusCode > 300 || body.error) {
    const error = new Error(body.message || body.error || `Scalable Press returned ${response.status}.`);
    error.status = response.status;
    error.upstream = body;
    throw error;
  }
  return body;
}

async function createDesign(artwork) {
  const form = new FormData();
  form.append("type", "dtg");
  form.append("sides[front][artwork]", new Blob([artwork.buffer], { type: `image/${artwork.type}` }), "datetime.png");
  form.append("sides[front][dimensions][width]", "8");
  form.append("sides[front][position][horizontal]", "C");
  form.append("sides[front][position][offset][top]", "3");
  const result = await spRequest("/design", { method: "POST", body: form });
  if (!result.designId) throw new Error("Scalable Press did not return a design ID.");
  return result.designId;
}

function shippingAddress(session) {
  const address = session.shipping_details && session.shipping_details.address;
  const name = session.shipping_details && session.shipping_details.name;
  if (!address || !name) throw new Error("A shipping address is required to fulfill this order.");
  return {
    name,
    address1: address.line1,
    address2: address.line2 || "",
    city: address.city,
    state: address.state || "",
    zip: address.postal_code
  };
}

async function createQuote(session) {
  const { style, size, design_id: designId } = session.metadata || {};
  const result = await spRequest("/quote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "dtg",
      products: [{ id: PRODUCTS[style], color: "Black", quantity: 1, size: SIZES[size] }],
      designId,
      address: shippingAddress(session)
    })
  });
  if (!result.orderToken || (result.orderIssues && result.orderIssues.length)) {
    const error = new Error("The printer could not quote this address.");
    error.upstream = result;
    throw error;
  }
  return result;
}

async function fulfillSession(session) {
  if (session.payment_status !== "paid") throw new Error("Payment has not completed.");
  if (session.metadata && session.metadata.sp_order_id) return { orderId: session.metadata.sp_order_id, existing: true };
  if (locks.has(session.id)) return locks.get(session.id);
  const work = (async () => {
    const stripe = stripeClient();
    const metadata = session.metadata || {};
    if (process.env.APP_DRY_RUN === "true") {
      const orderId = `dry_${session.id.slice(-12)}`;
      await stripe.checkout.sessions.update(session.id, { metadata: { ...metadata, fulfillment_status: "fulfilled", sp_order_id: orderId } });
      return { orderId, dryRun: true };
    }
    await stripe.checkout.sessions.update(session.id, { metadata: { ...metadata, fulfillment_status: "processing" } });
    const quote = await createQuote(session);
    const placed = await spRequest("/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderToken: quote.orderToken })
    });
    if (!placed.orderId) throw new Error("Scalable Press did not return an order ID.");
    await stripe.checkout.sessions.update(session.id, { metadata: { ...metadata, fulfillment_status: "fulfilled", sp_order_id: placed.orderId } });
    return { orderId: placed.orderId, quoteId: quote.orderToken };
  })();
  locks.set(session.id, work);
  try { return await work; } finally { locks.delete(session.id); }
}

module.exports = { PRODUCTS, SIZES, stripeClient, json, parseBody, origin, getArtworkBuffer, createDesign, fulfillSession };
