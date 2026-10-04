import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe, siteUrl } from "@/lib/stripe";
import { fulfillCheckoutSession } from "@/lib/fulfill";
import { getProdigiOrder } from "@/lib/prodigi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Order status for the thank-you page. If the webhook has not run yet but the
 * session is paid, this also kicks off fulfilment (safe: idempotent).
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await ctx.params;
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)) {
    return NextResponse.json({ error: "Invalid session id" }, { status: 400 });
  }

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe().checkout.sessions.retrieve(sessionId, { expand: ["payment_intent"] });
  } catch {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const paid = session.payment_status === "paid";
  let pi = session.payment_intent as Stripe.PaymentIntent | null;
  let prodigiOrderId = pi?.metadata?.prodigi_order_id ?? null;
  let fulfillmentError: string | null = null;

  if (paid && !prodigiOrderId && session.metadata?.design) {
    try {
      const r = await fulfillCheckoutSession(session.id, siteUrl(req));
      prodigiOrderId = r.prodigiOrderId;
    } catch (e) {
      fulfillmentError = (e as Error).message;
      // re-read in case a concurrent webhook won the race
      try {
        pi = (await stripe().checkout.sessions.retrieve(sessionId, { expand: ["payment_intent"] })).payment_intent as Stripe.PaymentIntent | null;
        prodigiOrderId = pi?.metadata?.prodigi_order_id ?? null;
        if (prodigiOrderId) fulfillmentError = null;
      } catch {
        /* ignore */
      }
    }
  }

  let prodigi = null;
  if (prodigiOrderId) {
    try {
      const o = await getProdigiOrder(prodigiOrderId);
      if (o) {
        prodigi = {
          id: o.id,
          stage: o.status?.stage,
          details: o.status?.details,
          issues: o.status?.issues ?? [],
          shipments: (o.shipments ?? []).map((s) => ({
            carrier: s.carrier?.name,
            service: s.carrier?.service,
            tracking: s.tracking?.number,
            trackingUrl: s.tracking?.url,
            status: s.status,
          })),
        };
      }
    } catch (e) {
      console.error("prodigi status error", e);
    }
  }

  const ci = session.collected_information as { shipping_details?: { name?: string; address?: Stripe.Address } } | null;
  return NextResponse.json({
    id: session.id,
    paid,
    paymentStatus: session.payment_status,
    amountTotal: session.amount_total,
    currency: session.currency,
    email: session.customer_details?.email ?? null,
    shipping: ci?.shipping_details ?? null,
    design: session.metadata?.design ?? null,
    summary: session.metadata?.summary ?? null,
    quantity: Number(session.metadata?.quantity ?? 1),
    prodigiOrderId,
    prodigi,
    fulfillmentError,
  });
}
