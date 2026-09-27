import { NextResponse } from "next/server";

/** Liveness + configuration smoke test. Never leaks key values. */
export async function GET() {
  return NextResponse.json({
    ok: true,
    store: "under-this-moon",
    time: new Date().toISOString(),
    config: {
      stripe: Boolean(process.env.STRIPE_SECRET_KEY),
      stripeWebhook: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
      prodigi: Boolean(process.env.PRODIGI_API_KEY),
      artworkSecret: Boolean(process.env.ARTWORK_SECRET),
      appUrl: Boolean(process.env.APP_URL),
    },
  });
}
