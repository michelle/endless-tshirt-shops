import { bindings, reply } from "../../../lib/store";
export const runtime = "edge";
export async function GET() {
  const env = bindings();
  return reply({ checkoutReady: !!(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET && env.PRODIGI_API_KEY && env.DB && env.BUCKET) });
}
