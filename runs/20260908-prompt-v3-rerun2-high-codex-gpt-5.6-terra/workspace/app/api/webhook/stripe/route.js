import { stripeClient, submitProdigi } from "@/lib/commerce";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request) {
  const signature = request.headers.get("stripe-signature");
  if (!process.env.STRIPE_WEBHOOK_SECRET || !signature) return new Response("Missing webhook signature", { status: 400 });
  try {
    const event = stripeClient().webhooks.constructEvent(await request.text(), signature, process.env.STRIPE_WEBHOOK_SECRET);
    if (event.type === "checkout.session.completed" && event.data.object.payment_status === "paid") await submitProdigi(event.data.object, request);
    return Response.json({ received: true });
  } catch (error) { return new Response(`Webhook error: ${error.message}`, { status: 400 }); }
}
