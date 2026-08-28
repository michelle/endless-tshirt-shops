import { NextResponse } from "next/server";

export const runtime = "nodejs";

export function GET() {
  return NextResponse.json({
    ok: Boolean(process.env.STRIPE_SECRET_KEY && process.env.PRODIGI_API_KEY && process.env.STRIPE_WEBHOOK_SECRET),
    stripe: Boolean(process.env.STRIPE_SECRET_KEY),
    webhook: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
    prodigi: Boolean(process.env.PRODIGI_API_KEY),
    fulfillmentMode: process.env.PRODIGI_ENV || "sandbox",
  });
}
