// Payment layer.
//
// Driver selection:
//  - STRIPE_SECRET_KEY set -> real Stripe Checkout (redirect flow + webhook).
//  - otherwise            -> built-in sandbox test checkout: a hosted payment
//    form that behaves like a processor (Luhn check, standard test-card
//    outcomes: approved / declined / insufficient funds). Zero real charges,
//    clearly badged in the UI. Fulfilment still only runs on success.

import { createHmac, timingSafeEqual } from "node:crypto";
import { fulfillOrder } from "./fulfillment.js";
import { updateOrder, getOrder } from "./orders.js";
import { PAYMENT_DRIVER } from "./env.js";

export class PaymentError extends Error {
  constructor(code, message, status = 402) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export function driverInfo() {
  if (PAYMENT_DRIVER === "stripe") {
    return { id: "stripe", label: "Stripe Checkout", testMode: false };
  }
  return {
    id: "mock",
    label: "Sandbox test checkout",
    testMode: true,
    hint: "No real money moves. Use any of the test cards shown on the payment page.",
  };
}

// ---------------------------------------------------------------- mock -----
const TEST_CARDS = {
  "4242424242424242": { outcome: "approved" },
  "4000000000000002": { outcome: "declined", code: "card_declined" },
  "4000000000009995": { outcome: "declined", code: "insufficient_funds" },
  "4000000000000069": { outcome: "declined", code: "expired_card" },
};

function luhn(num) {
  let sum = 0;
  let dbl = false;
  for (let i = num.length - 1; i >= 0; i--) {
    let d = num.charCodeAt(i) - 48;
    if (d < 0 || d > 9) return false;
    if (dbl) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    dbl = !dbl;
  }
  return sum % 10 === 0;
}

export function mockPayUrl(order) {
  return `/pay/${order.id}`;
}

// Process a card submission against the sandbox test gateway.
export async function chargeMock(order, card) {
  if (order.status !== "pending_payment") {
    throw new PaymentError("order_not_payable", "This order is not awaiting payment.", 409);
  }
  const number = String(card.number || "").replace(/[\s-]/g, "");
  if (!/^\d{13,19}$/.test(number) || !luhn(number)) {
    throw new PaymentError("invalid_number", "That card number is not valid.");
  }
  const mm = Number(card.expMonth);
  const yy = Number(card.expYear);
  if (
    !Number.isInteger(mm) || mm < 1 || mm > 12 ||
    !Number.isInteger(yy) || yy < 23 || yy > 2100 ||
    (yy < 100 && (2000 + yy) * 12 + mm < new Date().getUTCFullYear() * 12 + new Date().getUTCMonth() + 2)
  ) {
    throw new PaymentError("invalid_expiry", "Card expiry is invalid or in the past.");
  }
  if (!/^\d{3,4}$/.test(String(card.cvc || ""))) {
    throw new PaymentError("invalid_cvc", "Security code must be 3 or 4 digits.");
  }
  const t = TEST_CARDS[number];
  if (t && t.outcome === "declined") {
    throw new PaymentError(
      t.code,
      t.code === "insufficient_funds"
        ? "Your card has insufficient funds."
        : t.code === "expired_card"
        ? "Your card has expired."
        : "Your card was declined by the issuing bank."
    );
  }
  const ref = `testch_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
  const paid = updateOrder(
    order.id,
    {
      status: "paid",
      payment: {
        driver: "mock",
        ref,
        last4: number.slice(-4),
        amount: order.amounts.total,
        currency: order.amounts.currency,
        paidAt: new Date().toISOString(),
      },
    },
    { type: "payment_succeeded", driver: "mock", ref, last4: number.slice(-4) }
  );
  return paid;
}

// -------------------------------------------------------------- stripe -----
async function stripeApi(method, path, form) {
  const res = await fetch(`https://api.stripe.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form ? new URLSearchParams(form).toString() : undefined,
  });
  const json = await res.json();
  if (!res.ok) {
    const err = new Error(json?.error?.message || `Stripe HTTP ${res.status}`);
    err.status = 502;
    throw err;
  }
  return json;
}

export async function createStripeCheckout(order, req) {
  const base = publicBase(req);
  const totalCents = Math.round(order.amounts.total * 100);
  const session = await stripeApi("POST", "/v1/checkout/sessions", {
    mode: "payment",
    "line_items[0][price_data][currency]": order.amounts.currency.toLowerCase(),
    "line_items[0][price_data][product_data][name]":
      `Custom star-map tee (${order.product.color}, ${order.product.size})`,
    "line_items[0][price_data][unit_amount]": Math.round(order.amounts.item * 100),
    "line_items[0][quantity]": "1",
    "line_items[1][price_data][currency]": order.amounts.currency.toLowerCase(),
    "line_items[1][price_data][product_data][name]": "Shipping",
    "line_items[1][price_data][unit_amount]": Math.round(order.amounts.shipping * 100),
    "line_items[1][quantity]": "1",
    customer_email: order.recipient.email || undefined,
    success_url: `${base}/order/${order.id}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/?canceled=1`,
    "metadata[orderId]": order.id,
  });
  updateOrder(
    order.id,
    { payment: { driver: "stripe", sessionId: session.id, amount: order.amounts.total, currency: order.amounts.currency } },
    { type: "payment_session_created", sessionId: session.id }
  );
  return session.url;
}

export async function verifyStripeSession(order, sessionId) {
  if (!order.payment || order.payment.sessionId !== sessionId) return order;
  if (order.status === "paid" || order.status === "fulfilling") return order;
  const session = await stripeApi("GET", `/v1/checkout/sessions/${sessionId}`);
  if (session.payment_status === "paid") {
    return updateOrder(
      order.id,
      {
        status: "paid",
        payment: {
          ...order.payment,
          ref: session.payment_intent,
          paidAt: new Date().toISOString(),
        },
      },
      { type: "payment_succeeded", driver: "stripe", ref: session.payment_intent }
    );
  }
  return order;
}

export function verifyStripeSignature(rawBody, sigHeader, toleranceSec = 300) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return null; // not configured; ignore webhook signature
  const parts = Object.fromEntries(
    sigHeader.split(",").map((kv) => kv.split("=").map((s) => s.trim()))
  );
  if (!parts.t || !parts.v1) return null;
  const expected = createHmac("sha256", secret)
    .update(`${parts.t}.${rawBody}`)
    .digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(parts.v1);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  if (Math.abs(Date.now() / 1000 - Number(parts.t)) > toleranceSec) return null;
  return true;
}

// --------------------------------------------------------------- shared ----
function publicBase(req) {
  if (process.env.BASE_URL) return process.env.BASE_URL.replace(/\/$/, "");
  const proto = req?.headers["x-forwarded-proto"] || req?.protocol || "http";
  const host = req?.headers["x-forwarded-host"] || req?.headers.host;
  return `${proto}://${host}`;
}

// After any driver reports success, run fulfilment (Prodigi submission).
export async function settleAndFulfill(order, req) {
  const fresh = getOrder(order.id);
  if (fresh.status === "paid") {
    const fulfilled = await fulfillOrder(fresh, req);
    return fulfilled;
  }
  return fresh;
}
