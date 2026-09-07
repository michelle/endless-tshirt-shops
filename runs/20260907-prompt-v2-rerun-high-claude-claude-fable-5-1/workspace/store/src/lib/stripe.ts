// Stripe Checkout integration. Only active when STRIPE_SECRET_KEY is set.
import "server-only";
import Stripe from "stripe";
import { CartLine, getColor, getDesign, unitPriceCents } from "./catalog";
import { PricedOrder, RecipientInput, newMerchantReference, newOrderToken, placeProdigiOrder, priceOrder } from "./orders";
import { siteUrl } from "./site";

let client: Stripe | null = null;
export function stripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  if (!client) client = new Stripe(key);
  return client;
}

// Stripe metadata values are capped at 500 chars, so the cart and recipient are packed into compact keys.
function packCart(lines: CartLine[]) {
  return lines.map((l) => `${l.slug}:${l.color}:${l.size}:${l.qty}`).join("|");
}
function unpackCart(s: string): CartLine[] {
  return s.split("|").map((p) => {
    const [slug, color, size, qty] = p.split(":");
    return { slug, color, size: size as CartLine["size"], qty: Number(qty) };
  });
}

export async function createCheckoutSession(priced: PricedOrder): Promise<{ url: string }> {
  const token = newOrderToken();
  const ref = newMerchantReference();
  const r = priced.recipient;
  const base = siteUrl();
  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    customer_email: r.email,
    line_items: priced.lines.map((l) => {
      const d = getDesign(l.slug)!;
      const c = getColor(l.color)!;
      return {
        quantity: l.qty,
        price_data: {
          currency: "usd",
          unit_amount: unitPriceCents(l.size),
          product_data: {
            name: `${d.name} tee`,
            description: `${c.name} · size ${l.size.toUpperCase()}`,
            images: [`${base}/art/${d.slug}.png`],
          },
        },
      };
    }),
    shipping_options: [
      {
        shipping_rate_data: {
          type: "fixed_amount",
          display_name: `${priced.shippingMethod} shipping`,
          fixed_amount: { amount: priced.shippingCents, currency: "usd" },
        },
      },
    ],
    metadata: {
      token,
      ref,
      cart: packCart(priced.lines),
      ship: priced.shippingMethod,
      r1: JSON.stringify({ n: r.name, e: r.email, p: r.phone ?? "", a1: r.line1, a2: r.line2 ?? "" }),
      r2: JSON.stringify({ c: r.city, s: r.state ?? "", z: r.postalCode, k: r.country }),
    },
    success_url: `${base}/order/stripe/{CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/checkout?cancelled=1`,
  });
  if (!session.url) throw new Error("Stripe did not return a checkout URL");
  return { url: session.url };
}

function recipientFromSession(s: Stripe.Checkout.Session): RecipientInput {
  const a = JSON.parse(s.metadata!.r1);
  const b = JSON.parse(s.metadata!.r2);
  return { name: a.n, email: a.e, phone: a.p || undefined, line1: a.a1, line2: a.a2 || undefined, city: b.c, state: b.s || undefined, postalCode: b.z, country: b.k };
}

/**
 * Turn a paid Checkout Session into a Prodigi order. Safe to call more than once
 * (webhook and success page): the Stripe session id is the Prodigi idempotency key.
 */
export async function finalizeStripeSession(sessionId: string): Promise<{ orderId: string; token: string } | { pending: true }> {
  const s = await stripe().checkout.sessions.retrieve(sessionId);
  if (s.payment_status !== "paid") return { pending: true };
  const m = s.metadata ?? {};
  if (!m.token || !m.cart || !m.r1 || !m.r2) throw new Error("Checkout session is missing order metadata");
  const priced = await priceOrder({ items: unpackCart(m.cart), recipient: recipientFromSession(s), shippingMethod: m.ship });
  // Charge what Stripe actually collected, in case shipping quotes moved between checkout and fulfilment.
  if (typeof s.amount_total === "number") priced.totalCents = s.amount_total;
  return placeProdigiOrder({
    priced,
    token: m.token,
    merchantReference: m.ref || newMerchantReference(),
    idempotencyKey: `stripe-${s.id}`,
    payment: { mode: "stripe", sessionId: s.id, paymentIntent: typeof s.payment_intent === "string" ? s.payment_intent : undefined },
  });
}
