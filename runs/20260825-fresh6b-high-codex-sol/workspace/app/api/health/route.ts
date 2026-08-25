import { NextResponse } from "next/server";

export function GET() {
  const integrations = {
    stripe: Boolean(process.env.STRIPE_SECRET_KEY),
    stripeWebhook: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
    prodigi: Boolean(process.env.PRODIGI_API_KEY),
    prodigiMode: (process.env.PRODIGI_API_URL || "https://api.sandbox.prodigi.com/v4.0").includes("sandbox") ? "sandbox" : "live"
  };
  return NextResponse.json(
    { ok: integrations.stripe && integrations.stripeWebhook && integrations.prodigi, service: "datetime.store", integrations },
    { headers: { "Cache-Control": "no-store" } }
  );
}
