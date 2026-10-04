import { runtimeEnv } from "../../../lib/runtime-env";

export const runtime = "edge";

export async function GET() {
  return Response.json({ checkoutReady: Boolean(runtimeEnv.STRIPE_SECRET_KEY && runtimeEnv.STRIPE_WEBHOOK_SECRET && runtimeEnv.PRODIGI_API_KEY && runtimeEnv.BUCKET) }, { headers: { "Cache-Control": "no-store" } });
}
