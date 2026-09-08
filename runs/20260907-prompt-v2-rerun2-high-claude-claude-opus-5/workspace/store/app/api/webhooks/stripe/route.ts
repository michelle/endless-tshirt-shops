import { NextResponse } from "next/server";
import { priceCart, decodeCart } from "@/lib/cart";
import { placeProdigiOrder } from "@/lib/orders";
import type { Address } from "@/lib/orders";
import type { ShippingMethod } from "@/lib/prodigi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Fulfilment happens here, not in the browser: the print order is only created
 * once Stripe confirms the payment. Inactive until STRIPE_* env vars are set.
 */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_SECRET_KEY;
  const whsec = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !whsec) return NextResponse.json({ error: "Stripe is not configured" }, { status: 501 });

  const { default: Stripe } = await import("stripe");
  const stripe = new Stripe(secret);

  const sig = req.headers.get("stripe-signature");
  const raw = await req.text();
  let event: import("stripe").Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig ?? "", whsec);
  } catch (e) {
    console.error("bad stripe signature", e);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") return NextResponse.json({ received: true });

  const session = event.data.object as import("stripe").Stripe.Checkout.Session;
  if (session.payment_status !== "paid") return NextResponse.json({ received: true });

  const md = session.metadata ?? {};
  try {
    const { lines } = priceCart(decodeCart(md.cart ?? ""));
    if (lines.length === 0) throw new Error("no lines in session metadata");
    const address: Address = {
      name: md.a_name ?? "", email: md.a_email ?? "", phone: md.a_phone || undefined,
      line1: md.a_line1 ?? "", line2: md.a_line2 || undefined,
      city: md.a_city ?? "", state: md.a_state || undefined,
      postcode: md.a_postcode ?? "", country: md.a_country ?? "",
    };

    const order = await placeProdigiOrder({
      lines,
      address,
      shippingMethod: (md.shippingMethod ?? "Budget") as ShippingMethod,
      origin: md.origin ?? new URL(req.url).origin,
      reference: md.reference ?? session.id,
      // Keyed on the Stripe session so a redelivered webhook can't double-print.
      idempotencySeed: session.id,
    });
    console.info("prodigi order created", { session: session.id, order: order.id });
    return NextResponse.json({ received: true, orderId: order.id });
  } catch (e) {
    console.error("fulfilment failed", e);
    // 500 makes Stripe retry — better than silently losing a paid order.
    return NextResponse.json({ error: "Fulfilment failed" }, { status: 500 });
  }
}
