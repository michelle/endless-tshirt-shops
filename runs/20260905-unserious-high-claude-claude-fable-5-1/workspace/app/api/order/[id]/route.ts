import { NextResponse, type NextRequest } from "next/server";
import { stripe } from "@/lib/stripe";
import { fulfillPaymentIntent, loadProdigiOrder } from "@/lib/fulfill";
import { buildOrderStatus } from "@/lib/orderStatus";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Order status for the success page to poll. Requires the PaymentIntent's
 * client secret, which only the buyer's browser has.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const secret = req.nextUrl.searchParams.get("secret");
  if (!/^pi_[A-Za-z0-9]+$/.test(id) || !secret) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let pi;
  try {
    pi = await stripe().paymentIntents.retrieve(id);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (pi.client_secret !== secret) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const result = await fulfillPaymentIntent(pi);
  const prodigiOrder = await loadProdigiOrder(result.pi);
  return NextResponse.json(buildOrderStatus(result, prodigiOrder), {
    headers: { "Cache-Control": "no-store" },
  });
}
