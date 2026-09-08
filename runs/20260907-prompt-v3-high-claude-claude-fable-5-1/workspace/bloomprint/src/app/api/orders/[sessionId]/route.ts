import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe, PaymentsNotConfiguredError } from "@/lib/stripe";
import { decodeDesign, toPlantInput } from "@/lib/design";
import { makeLabel } from "@/lib/botanical/generator";
import { getProdigiOrder, isSandbox } from "@/lib/prodigi";
import { fulfillCheckoutSession } from "@/lib/fulfillment";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Order status for the confirmation page. The Checkout Session id acts as the
 * customer's bearer token (it is only ever shown to the buyer by Stripe).
 */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await ctx.params;
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)) {
    return NextResponse.json({ error: "Invalid order reference" }, { status: 400 });
  }
  try {
    const s = stripe();
    let session = await s.checkout.sessions.retrieve(sessionId, { expand: ["payment_intent"] });
    let pi = session.payment_intent as Stripe.PaymentIntent | null;

    // Belt and braces: if the payment is confirmed but the webhook has not
    // arrived yet (or is not configured), fulfil now. Still gated on "paid".
    if (session.payment_status === "paid" && !pi?.metadata?.prodigi_order_id) {
      try {
        await fulfillCheckoutSession(sessionId);
        session = await s.checkout.sessions.retrieve(sessionId, { expand: ["payment_intent"] });
        pi = session.payment_intent as Stripe.PaymentIntent | null;
      } catch (err) {
        console.error("inline fulfillment failed", sessionId, err);
      }
    }

    const design = decodeDesign(session.metadata?.design ?? "");
    const label = design ? makeLabel(toPlantInput(design)) : null;
    const prodigiId = pi?.metadata?.prodigi_order_id ?? null;
    const prodigi = prodigiId ? await getProdigiOrder(prodigiId) : null;

    const legacy = (session as unknown as { shipping_details?: { name?: string; address?: Stripe.Address } }).shipping_details;
    const shipping = session.collected_information?.shipping_details ?? legacy ?? null;

    return NextResponse.json({
      id: session.id,
      paymentStatus: session.payment_status,
      status: session.status,
      amountTotal: session.amount_total,
      currency: session.currency,
      email: session.customer_details?.email ?? null,
      shipping: shipping ? { name: shipping.name, address: shipping.address } : null,
      design,
      size: session.metadata?.size ?? null,
      quantity: Number(session.metadata?.quantity ?? 1),
      label,
      fulfillment: prodigiId
        ? {
            prodigiOrderId: prodigiId,
            sandbox: isSandbox(),
            stage: prodigi?.status?.stage ?? pi?.metadata?.prodigi_stage ?? "InProgress",
            shipments: (prodigi?.shipments ?? []).map((sh) => ({
              carrier: sh.carrier?.name ?? null,
              tracking: sh.tracking ?? null,
              dispatchDate: sh.dispatchDate ?? null,
            })),
          }
        : null,
    });
  } catch (err) {
    if (err instanceof PaymentsNotConfiguredError) {
      return NextResponse.json({ error: "Payments are not configured" }, { status: 503 });
    }
    console.error("order lookup failed", err);
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
}
