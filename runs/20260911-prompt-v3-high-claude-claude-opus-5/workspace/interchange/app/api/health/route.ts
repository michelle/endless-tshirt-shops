import { publicOrigin } from "@/lib/origin";
import { stripeEnabled } from "@/lib/stripe";

export const runtime = "nodejs";

export async function GET() {
  return Response.json({
    ok: true,
    origin: publicOrigin(),
    paymentProvider: stripeEnabled() ? "stripe" : "sandbox-simulator",
    prodigi: process.env.PRODIGI_API_KEY ? "configured" : "missing",
    prodigiBase: process.env.PRODIGI_API_BASE || "https://api.sandbox.prodigi.com/v4.0",
    appSecret: process.env.APP_SECRET ? "set" : "fallback",
    stripeWebhook: process.env.STRIPE_WEBHOOK_SECRET ? "set" : "missing",
  });
}
