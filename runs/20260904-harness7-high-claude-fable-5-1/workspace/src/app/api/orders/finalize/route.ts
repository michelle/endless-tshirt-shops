import { NextResponse } from "next/server";
import { z } from "zod";
import { fulfillPaymentIntent } from "@/lib/fulfillment";

export const runtime = "nodejs";
export const maxDuration = 30;

const schema = z.object({ paymentIntentId: z.string().regex(/^pi_[A-Za-z0-9]+$/) });

/**
 * Called by the browser right after Stripe confirms payment. It races the
 * webhook to place the Prodigi order; whichever gets there first wins and the
 * other sees `already_fulfilled`. The response drives the success screen.
 */
export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "invalid_request", message: "Missing paymentIntentId" } }, { status: 400 });
  }
  const result = await fulfillPaymentIntent(parsed.data.paymentIntentId);
  const status = result.status === "not_paid" ? 402 : result.status === "failed" ? 502 : 200;
  return NextResponse.json(result, { status });
}
