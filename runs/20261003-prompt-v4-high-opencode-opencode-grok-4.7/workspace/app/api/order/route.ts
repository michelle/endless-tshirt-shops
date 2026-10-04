import { NextResponse } from "next/server";
import { getOrder } from "@/lib/prodigi";
import { stripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const sessionId = new URL(req.url).searchParams.get("session_id") || "";
  if (!sessionId.startsWith("cs_")) return NextResponse.json({ error: "Missing session." }, { status: 400 });
  const session = await stripe().checkout.sessions.retrieve(sessionId);
  if (session.payment_status !== "paid") {
    return NextResponse.json({ paid: false, status: session.status });
  }
  const prodigiOrderId = session.metadata?.prodigiOrderId;
  if (!prodigiOrderId) return NextResponse.json({ paid: true, printed: false });
  const order = await getOrder(prodigiOrderId);
  return NextResponse.json({ paid: true, printed: true, ...order });
}
