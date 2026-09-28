import { NextResponse } from "next/server";
import { stripe, stripeReady } from "@/lib/stripe";
import { getProdigiOrder } from "@/lib/prodigi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sessionId = url.searchParams.get("session_id");
  if (!sessionId) return NextResponse.json({ error: "session_id required" }, { status: 400 });

  // Try Stripe first if configured, otherwise look up Prodigi directly by session id (which is the merchantReference).
  let orderId: string | null = null;
  if (stripeReady()) {
    try {
      const sessions = await stripe().checkout.sessions.list({ limit: 50 });
      const session = sessions.data.find((s) => s.id === sessionId);
      if (session?.metadata?.prodigiOrderId) {
        orderId = session.metadata.prodigiOrderId;
      }
    } catch (err) {
      // swallow — fall through to Prodigi direct lookup
    }
  }
  if (!orderId) {
    // Prodigi merchant reference is the Stripe session ID. We could query Prodigi by merchantReference
    // but the simpler path is to hit /orders and filter.
    try {
      const listing = await fetch(
        `${process.env.PRODIGI_BASE_URL || "https://api.sandbox.prodigi.com/v4.0"}/Orders?Top=20`,
        {
          headers: {
            "X-API-Key": process.env.PRODIGI_API_KEY || "",
            "Content-Type": "application/json",
          },
        },
      ).then((r) => r.json());
      const match = listing?.orders?.find?.((o: { merchantReference?: string }) =>
        o.merchantReference === sessionId,
      );
      if (match) orderId = match.id;
    } catch {
      /* ignore */
    }
  }

  if (!orderId) {
    return NextResponse.json({ stage: "pending", details: {} });
  }

  try {
    const order = await getProdigiOrder(orderId);
    return NextResponse.json({
      stage: order.order?.status?.stage || "unknown",
      details: order.order?.status?.details || {},
      orderId,
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
