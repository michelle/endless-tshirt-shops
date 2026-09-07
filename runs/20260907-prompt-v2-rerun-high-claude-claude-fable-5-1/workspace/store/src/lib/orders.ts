// Order pricing + placement shared by the sandbox checkout, the Stripe success page and the Stripe webhook.
import "server-only";
import { randomBytes } from "node:crypto";
import { CartLine, cartSubtotalCents, normaliseCart } from "./catalog";
import { Recipient, ShippingMethod, createOrder, getOrder, getQuotes, prodigiEnv } from "./prodigi";
import { siteUrl } from "./site";

export const SHIPPING_METHODS: ShippingMethod[] = ["Standard", "Express"];
const HANDLING_CENTS = 100; // added on top of Prodigi's shipping cost, rounded up to the next dollar

export type ShippingOption = { method: ShippingMethod; amountCents: number; label: string };

export async function shippingOptions(lines: CartLine[], countryCode: string): Promise<ShippingOption[]> {
  const quotes = await getQuotes(lines, countryCode);
  const out: ShippingOption[] = [];
  for (const method of SHIPPING_METHODS) {
    const q = quotes.find((x) => x.shipmentMethod === method);
    if (!q) continue;
    const raw = Math.round(parseFloat(q.costSummary.shipping.amount) * 100);
    const amountCents = Math.ceil((raw + HANDLING_CENTS) / 100) * 100 - 5; // e.g. $6.95
    out.push({ method, amountCents, label: method === "Express" ? "Express (tracked, 2–5 business days)" : "Standard (5–12 business days)" });
  }
  if (out.length === 0) throw new Error("We can't ship to that country yet");
  return out;
}

export type RecipientInput = {
  name: string;
  email: string;
  phone?: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
};

const req = (v: unknown, label: string, max = 120) => {
  const s = String(v ?? "").trim();
  if (!s) throw new Error(`${label} is required`);
  if (s.length > max) throw new Error(`${label} is too long`);
  return s;
};
const opt = (v: unknown, max = 120) => {
  const s = String(v ?? "").trim();
  if (s.length > max) throw new Error("Field is too long");
  return s || undefined;
};

export function normaliseRecipient(input: unknown): RecipientInput {
  const r = (input ?? {}) as Record<string, unknown>;
  const email = req(r.email, "Email");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Email looks invalid");
  const country = req(r.country, "Country", 2).toUpperCase();
  if (!/^[A-Z]{2}$/.test(country)) throw new Error("Country must be a 2-letter code");
  const state = opt(r.state, 60);
  if (["US", "CA", "AU"].includes(country) && !state) throw new Error("State / province is required");
  return {
    name: req(r.name, "Name"),
    email,
    phone: opt(r.phone, 40),
    line1: req(r.line1, "Address line 1"),
    line2: opt(r.line2),
    city: req(r.city, "City"),
    state,
    postalCode: req(r.postalCode, "Postal code", 20),
    country,
  };
}

export function toProdigiRecipient(r: RecipientInput): Recipient {
  return {
    name: r.name,
    email: r.email,
    phoneNumber: r.phone,
    address: {
      line1: r.line1,
      line2: r.line2,
      townOrCity: r.city,
      stateOrCounty: r.state,
      postalOrZipCode: r.postalCode,
      countryCode: r.country,
    },
  };
}

export type PricedOrder = {
  lines: CartLine[];
  recipient: RecipientInput;
  shippingMethod: ShippingMethod;
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
};

/** Validate a raw checkout payload and price it from the catalog + a live Prodigi quote. */
export async function priceOrder(payload: { items?: unknown; recipient?: unknown; shippingMethod?: unknown }): Promise<PricedOrder> {
  const lines = normaliseCart(payload.items);
  const recipient = normaliseRecipient(payload.recipient);
  const method = String(payload.shippingMethod ?? "Standard") as ShippingMethod;
  if (!SHIPPING_METHODS.includes(method)) throw new Error("Unknown shipping method");
  const options = await shippingOptions(lines, recipient.country);
  const chosen = options.find((o) => o.method === method);
  if (!chosen) throw new Error(`${method} shipping is not available for ${recipient.country}`);
  const subtotalCents = cartSubtotalCents(lines);
  return { lines, recipient, shippingMethod: method, subtotalCents, shippingCents: chosen.amountCents, totalCents: subtotalCents + chosen.amountCents };
}

export function newOrderToken() {
  return randomBytes(12).toString("base64url");
}
export function newMerchantReference() {
  return `DP-${randomBytes(4).toString("hex").toUpperCase()}`;
}

/**
 * Place the order with Prodigi. `idempotencyKey` makes retries (webhook + success page racing) safe:
 * Prodigi answers "AlreadyExists" with the original order id.
 */
export async function placeProdigiOrder(args: {
  priced: PricedOrder;
  token: string;
  merchantReference: string;
  idempotencyKey?: string;
  payment: { mode: "sandbox" } | { mode: "stripe"; sessionId: string; paymentIntent?: string };
}): Promise<{ orderId: string; token: string }> {
  const res = await createOrder({
    merchantReference: args.merchantReference,
    idempotencyKey: args.idempotencyKey,
    shippingMethod: args.priced.shippingMethod,
    recipient: toProdigiRecipient(args.priced.recipient),
    lines: args.priced.lines,
    assetBaseUrl: siteUrl(),
    metadata: {
      token: args.token,
      store: "deprecated-parks",
      payment: args.payment.mode,
      stripeSession: args.payment.mode === "stripe" ? args.payment.sessionId : undefined,
      subtotalCents: args.priced.subtotalCents,
      shippingCents: args.priced.shippingCents,
      totalCents: args.priced.totalCents,
      currency: "USD",
      prodigiEnv: prodigiEnv(),
    },
  });
  if (!res.order?.id) throw new Error(`Prodigi returned ${res.outcome}`);
  if (res.outcome !== "Created" && res.outcome !== "CreatedWithIssues" && res.outcome !== "AlreadyExists") {
    throw new Error(`Prodigi returned ${res.outcome}`);
  }
  return { orderId: res.order.id, token: args.token };
}

/** Look up an order for the confirmation page; the token in metadata must match. */
export async function getOrderForCustomer(id: string, token: string) {
  if (!token || token.length < 8) return null;
  const order = await getOrder(id);
  if (!order) return null;
  const stored = order.metadata?.token;
  if (typeof stored !== "string" || stored !== token) return null;
  return order;
}
