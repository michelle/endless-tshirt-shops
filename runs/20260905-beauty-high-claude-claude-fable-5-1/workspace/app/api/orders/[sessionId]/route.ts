import { NextResponse } from "next/server";
import { stripe, stripeConfigured } from "@/lib/stripe";
import { ensureFulfilled } from "@/lib/fulfill";
import { prodigiConfigured, prodigiIsSandbox } from "@/lib/prodigi";
import { parseTs } from "@/lib/time";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/orders/:sessionId
 * Public-but-unguessable status endpoint keyed on the Stripe session id.
 * Also acts as the belt-and-braces fulfilment path: if the webhook hasn't
 * fired yet (or isn't configured), a paid session gets sent to Prodigi here.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await ctx.params;
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)) {
    return NextResponse.json({ error: "That doesn't look like a session id." }, { status: 400 });
  }
  if (!stripeConfigured()) {
    return NextResponse.json({ error: "Stripe is not configured." }, { status: 503 });
  }

  const session = await stripe().checkout.sessions.retrieve(sessionId, { expand: ["customer_details"] });
  const meta = session.metadata || {};
  const base = {
    sessionId: session.id,
    status: session.status,
    paymentStatus: session.payment_status,
    ts: parseTs(meta.ts),
    style: meta.style ?? null,
    color: meta.color ?? null,
    size: meta.size ?? null,
    tz: meta.tz ?? null,
    email: session.customer_details?.email ?? null,
    name: session.customer_details?.name ?? null,
    amountTotal: session.amount_total,
    currency: session.currency,
    sandbox: prodigiIsSandbox(),
  };

  if (session.payment_status !== "paid") {
    return NextResponse.json({ ...base, fulfillment: { state: "unpaid" } });
  }
  if (!prodigiConfigured()) {
    return NextResponse.json({ ...base, fulfillment: { state: "unconfigured", reason: "PRODIGI_API_KEY missing" } });
  }

  try {
    const result = await ensureFulfilled(session);
    const o = result.order;
    return NextResponse.json({
      ...base,
      fulfillment: {
        state: result.state,
        reason: result.reason ?? null,
        prodigiOrderId: o?.id ?? null,
        stage: o?.status?.stage ?? null,
        details: o?.status?.details ?? null,
        issues: o?.status?.issues ?? [],
        shipments: (o?.shipments || []).map((s) => ({
          id: s.id,
          carrier: s.carrier?.name ?? null,
          service: s.carrier?.service ?? null,
          tracking: s.tracking?.url ?? s.tracking?.number ?? null,
          dispatchDate: s.dispatchDate ?? null,
        })),
      },
    });
  } catch (err) {
    console.error(`[orders] fulfilment error for ${sessionId}`, err);
    return NextResponse.json({ ...base, fulfillment: { state: "error", reason: (err as Error).message } }, { status: 502 });
  }
}
