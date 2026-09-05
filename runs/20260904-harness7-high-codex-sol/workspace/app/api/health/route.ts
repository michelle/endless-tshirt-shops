import { PRODUCT } from "../../../lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const prodigiConfigured = Boolean(process.env.PRODIGI_API_KEY);
  let product = "unchecked";
  if (prodigiConfigured) {
    try {
      const baseUrl = process.env.PRODIGI_API_BASE_URL || "https://api.sandbox.prodigi.com/v4.0";
      const response = await fetch(`${baseUrl}/products/${PRODUCT.sku}`, { headers: { "X-API-Key": process.env.PRODIGI_API_KEY! }, cache: "no-store" });
      product = response.ok ? "available" : "unavailable";
    } catch { product = "unreachable"; }
  }
  const healthy = Boolean(process.env.STRIPE_SECRET_KEY) && prodigiConfigured && product === "available";
  return Response.json({ status: healthy ? "ok" : "degraded", services: {
    stripe: process.env.STRIPE_SECRET_KEY ? "configured" : "missing",
    stripeWebhook: process.env.STRIPE_WEBHOOK_SECRET ? "configured" : "missing",
    prodigi: prodigiConfigured ? "sandbox" : "missing", product,
  } }, { status: healthy ? 200 : 503 });
}
