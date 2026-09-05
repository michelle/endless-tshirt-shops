import { stripe, verifyEnvironment } from "@/lib/stripe";
import { prodigi, type ProdigiOrder } from "@/lib/prodigi";
export const runtime = "nodejs";
export const maxDuration = 30;
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("session_id") || "";
  if (!/^cs_(test_|live_)?[a-zA-Z0-9]{24,}$/.test(id) || id.length > 240)
    return Response.json({ error: "Order not found." }, { status: 404 });
  try {
    // The unguessable Checkout session ID is the receipt capability. No address,
    // name, email, payment details, or arbitrary Stripe metadata leaves this endpoint.
    const session = await stripe().checkout.sessions.retrieve(id);
    if (session.metadata?.store !== "datetime-v1")
      return Response.json({ error: "Order not found." }, { status: 404 });
    verifyEnvironment(session.livemode);
    if (session.payment_status !== "paid")
      return Response.json(
        { paid: false, status: session.status },
        { headers: { "Cache-Control": "no-store" } },
      );
    let stage = session.metadata?.fulfillmentStatus || "pending";
    let trackingUrl: string | undefined;
    if (session.metadata?.prodigiOrderId) {
      try {
        const { order } = await prodigi<{ order: ProdigiOrder }>(
          `/orders/${encodeURIComponent(session.metadata.prodigiOrderId)}`,
        );
        stage = order.status.issues?.length
          ? "needs_review"
          : order.status.stage;
        const track = order.shipments?.find((s) => s.tracking?.url)?.tracking
          ?.url;
        if (track && new URL(track).protocol === "https:") trackingUrl = track;
      } catch {
        stage = "submitted";
      }
    }
    return Response.json(
      {
        paid: true,
        testMode: !session.livemode,
        timestamp: Number(session.metadata?.timestamp),
        color: session.metadata?.color,
        fit: session.metadata?.fit,
        size: session.metadata?.size,
        amount: session.amount_total,
        orderId: session.metadata?.prodigiOrderId || null,
        stage,
        trackingUrl,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { error: "We couldn’t load this receipt. Please try again." },
      { status: 503 },
    );
  }
}
