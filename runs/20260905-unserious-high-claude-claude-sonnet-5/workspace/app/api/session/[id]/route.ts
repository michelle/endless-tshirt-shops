import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

// Exposes only the safe-to-show slice of a Checkout Session for the success
// page — never the full Stripe object.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id.startsWith("cs_")) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(id);

    if (session.payment_status !== "paid") {
      return NextResponse.json(
        { error: "Payment not completed yet." },
        { status: 409 }
      );
    }

    return NextResponse.json({
      email: session.customer_details?.email ?? null,
      stampMs: session.metadata?.stampMs ? Number(session.metadata.stampMs) : null,
      color: session.metadata?.color ?? null,
      size: session.metadata?.size ?? null,
      amountTotal: session.amount_total,
    });
  } catch (err: any) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
}
