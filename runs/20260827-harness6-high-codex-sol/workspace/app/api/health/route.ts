import { NextResponse } from "next/server";

export function GET() {
  const integrations = { stripe: Boolean(process.env.STRIPE_SECRET_KEY), prodigi: Boolean(process.env.PRODIGI_API_KEY), stripeWebhook: Boolean(process.env.STRIPE_WEBHOOK_SECRET) };
  return NextResponse.json({ ok: integrations.stripe && integrations.prodigi, mode: process.env.NEXT_PUBLIC_SHOP_MODE === "live" ? "live" : "sandbox", integrations });
}
