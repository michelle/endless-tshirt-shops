import { stripeClient, submitProdigi } from "@/lib/commerce";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request) {
  try {
    const { sessionId } = await request.json();
    if (!/^cs_(test|live)_/.test(String(sessionId || ""))) throw new Error("Invalid checkout session.");
    const session = await stripeClient().checkout.sessions.retrieve(sessionId);
    if (session.status !== "complete" || session.payment_status !== "paid") throw new Error("Payment has not completed.");
    const printOrder = await submitProdigi(session, request);
    return Response.json({ ok: true, prodigiOrderId: printOrder.id });
  } catch (error) { return Response.json({ error: error.message || "Could not prepare your print order." }, { status: 400 }); }
}
