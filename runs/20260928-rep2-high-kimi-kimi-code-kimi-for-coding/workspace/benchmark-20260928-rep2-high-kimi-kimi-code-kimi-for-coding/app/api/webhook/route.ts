import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { renderPrintPng } from "@/lib/render-print";
import { decodeSamples } from "@/lib/design";
import { createProdigiOrder, md5Hex } from "@/lib/prodigi";
import type { Size, WaveformStyle } from "@/lib/catalog";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Stripe → store webhook. The ONLY path that creates Prodigi orders:
 * a checkout.session.completed event with payment_status "paid" means money
 * has settled, so we render the print file and submit the order.
 */
export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("STRIPE_WEBHOOK_SECRET not set");
    return NextResponse.json({ error: "webhook not configured" }, { status: 500 });
  }

  const payload = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "missing signature" }, { status: 400 });

  let event;
  try {
    event = stripe.webhooks.constructEvent(payload, sig, secret);
  } catch (err) {
    console.error("webhook signature verification failed", err);
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  if (
    event.type !== "checkout.session.completed" &&
    event.type !== "checkout.session.async_payment_succeeded"
  ) {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as {
    id: string;
    payment_status: string;
    metadata?: Record<string, string>;
    customer_details?: {
      email?: string;
      phone?: string;
      name?: string;
      address?: Stripe.Address | null;
    };
    shipping_details?: {
      name?: string;
      phone?: string;
      address?: Stripe.Address | null;
    };
  };

  if (session.payment_status !== "paid") {
    // Not paid (e.g. async method still pending) — Stripe will re-fire.
    return NextResponse.json({ received: true, note: "not paid yet" });
  }

  const md = session.metadata || {};
  try {
    if (md.prodigiOrderId) {
      return NextResponse.json({ received: true, note: "already submitted" });
    }
    if (!md.d || !md.style || !md.ink || !md.color || !md.size) {
      throw new Error("session metadata missing design");
    }

    const addr = session.shipping_details?.address ?? session.customer_details?.address;
    if (!addr?.line1 || !addr.city || !addr.postal_code || !addr.country) {
      throw new Error("no usable shipping address on session");
    }

    const proto = req.headers.get("x-forwarded-proto") || "https";
    const host = req.headers.get("host") || new URL(req.url).host;
    const origin = process.env.NEXT_PUBLIC_SITE_URL || `${proto}://${host}`;
    const printUrl = `${origin}/api/print/${session.id}.png`;

    const design = {
      samples: decodeSamples(md.d),
      style: md.style as WaveformStyle,
      ink: md.ink,
      color: md.color,
      size: md.size as Size,
    };

    const png = renderPrintPng(design);
    const callbackSecret = process.env.PRODIGI_CALLBACK_SECRET || "es-cb-7f3a9c1d52b84e6a90d1f3c5b7a9e2f4d";
    const result = await createProdigiOrder({
      reference: session.id,
      design,
      recipient: {
        name: session.shipping_details?.name || session.customer_details?.name || "Echostitch customer",
        email: session.customer_details?.email,
        phoneNumber:
          session.customer_details?.phone || session.shipping_details?.phone || undefined,
        address: {
          line1: addr.line1,
          line2: addr.line2 || undefined,
          townOrCity: addr.city,
          stateOrCounty: addr.state || undefined,
          postalOrZipCode: addr.postal_code,
          countryCode: addr.country,
        },
      },
      printUrl,
      printMd5: md5Hex(png),
      callbackUrl: `${origin}/api/prodigi-callback/${callbackSecret}`,
    });

    const outcome = result.outcome;
    if (outcome === "Failed" || !result.order?.id) {
      throw new Error(`Prodigi rejected order: ${JSON.stringify(result)}`);
    }
    if (outcome !== "Ok" && outcome !== "Created") {
      console.warn("Prodigi order created with issues", JSON.stringify(result));
    }

    await stripe.checkout.sessions.update(session.id, {
      metadata: { ...md, prodigiOrderId: result.order.id, prodigiOutcome: outcome },
    });
    console.log(`Prodigi order ${result.order.id} created for session ${session.id}`);
    return NextResponse.json({ received: true, prodigiOrderId: result.order.id });
  } catch (err) {
    // Return 500 so Stripe retries delivery; Prodigi idempotency makes replays safe.
    console.error("webhook processing failed", err);
    return NextResponse.json({ error: "processing failed" }, { status: 500 });
  }
}
