import { NextResponse } from "next/server";
import { isProdigiLive } from "@/lib/env";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "datetime.store",
    time: Date.now(),
    stripeMode: process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_") ? "live" : "test",
    prodigiMode: isProdigiLive() ? "live" : "sandbox",
    configured: {
      stripe: Boolean(process.env.STRIPE_SECRET_KEY && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY),
      stripeWebhook: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
      prodigi: Boolean(process.env.PRODIGI_API_KEY),
    },
  });
}
