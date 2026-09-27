import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { verifyDesign } from "@/lib/tokens";
import { fulfillPaidOrder, requestOrigin } from "@/lib/fulfill";

export const dynamic = "force-dynamic";

/** Stripe webhook: fulfills the order only after payment succeeds. */
export async function POST(req: NextRequest) {
  const key = process.env.STRIPE_SECRET_KEY;
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!key || !whSecret) {
    return NextResponse.json(
      { error: "Stripe is not configured" },
      { status: 503 }
    );
  }
  const stripe = new Stripe(key);
  const payload = await req.text();
  const sig = req.headers.get("stripe-signature") || "";

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, sig, whSecret);
  } catch (err: any) {
    return NextResponse.json(
      { error: `Webhook signature failed: ${err.message}` },
      { status: 400 }
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status === "paid") {
      const token = session.metadata?.artToken || "";
      const design = verifyDesign(token);
      if (!design) {
        console.error("Webhook: invalid art token on session", session.id);
        return NextResponse.json({ error: "invalid token" }, { status: 400 });
      }
      const sd = (session as any).shipping_details;
      const addr = sd?.address || session.customer_details?.address;
      const name =
        sd?.name || session.customer_details?.name || "StarMark Customer";
      const email = session.customer_details?.email || undefined;
      if (!addr?.line1 || !addr.country || !addr.postal_code || !addr.city) {
        console.error("Webhook: missing address", session.id);
        return NextResponse.json(
          { error: "missing address" },
          { status: 400 }
        );
      }
      try {
        const order = await fulfillPaidOrder({
          ref: session.id,
          design,
          artToken: token,
          origin: requestOrigin(req),
          recipient: {
            name,
            email,
            address: {
              line1: addr.line1,
              line2: addr.line2 || undefined,
              postalOrZipCode: addr.postal_code,
              countryCode: addr.country,
              townOrCity: addr.city,
              stateOrCounty: addr.state || undefined,
            },
          },
        });
        console.log(`Fulfilled ${session.id} -> Prodigi ${order.id}`);
      } catch (err: any) {
        console.error("Fulfillment failed:", err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
      }
    }
  }
  return NextResponse.json({ received: true });
}
