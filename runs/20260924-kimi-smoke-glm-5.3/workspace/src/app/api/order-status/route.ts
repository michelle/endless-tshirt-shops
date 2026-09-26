import { NextRequest, NextResponse } from "next/server";
import { stripeClient } from "@/server/stripe";
import { findProdigiOrder } from "@/server/prodigi";
import { decodeSpec } from "@/lib/spec";
import { printUrl } from "@/server/signing";

export const runtime = "nodejs";

/**
 * Order progress for the success page: Stripe payment state plus the Prodigi
 * fulfillment stage for this session. Read-only.
 */
export async function GET(req: NextRequest) {
  const sessionId = new URL(req.url).searchParams.get("session_id") ?? "";
  if (!/^cs_(test|live)_[A-Za-z0-9]{10,200}$/.test(sessionId)) {
    return NextResponse.json({ error: "invalid session id" }, { status: 400 });
  }

  let session;
  try {
    session = await stripeClient().checkout.sessions.retrieve(sessionId);
  } catch (e) {
    console.error("session retrieve failed", (e as Error).message);
    return NextResponse.json({ error: "session not found" }, { status: 404 });
  }

  const paid = session.payment_status === "paid";
  const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;

  let artworkUrl: string | null = null;
  if (paid && session.metadata?.spec) {
    const decoded = decodeSpec(session.metadata.spec);
    if (decoded.ok) {
      artworkUrl = printUrl(origin, session.metadata.spec) + "&w=900";
    }
  }

  let prodigi = null;
  if (paid) {
    const lookup = await findProdigiOrder(sessionId);
    prodigi = lookup.found ? lookup : null;
  }

  return NextResponse.json({
    id: session.id,
    status: session.status,
    paid,
    amountTotal: session.amount_total,
    currency: session.currency,
    email: session.customer_details?.email,
    artworkUrl,
    prodigi,
  });
}
