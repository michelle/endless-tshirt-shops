import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { verifyDesign } from "@/lib/tokens";
import { fulfillPaidOrder, requestOrigin } from "@/lib/fulfill";

export const dynamic = "force-dynamic";

/**
 * Demo payment gateway (used only when no Stripe key is configured).
 * Simulates a card authorization: only the test card 4242 4242 4242 4242
 * is approved. On approval the order is fulfilled with Prodigi.
 */
export async function POST(req: NextRequest) {
  if (process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: "Demo gateway disabled while Stripe is configured" },
      { status: 403 }
    );
  }
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Bad request" }, { status: 400 });

  const token = String(body.token || "");
  const design = verifyDesign(token);
  if (!design)
    return NextResponse.json({ error: "Invalid order token" }, { status: 403 });

  const card = String(body.cardNumber || "").replace(/\s+/g, "");
  if (card !== "4242424242424242") {
    return NextResponse.json(
      { error: "Card declined. Use test card 4242 4242 4242 4242." },
      { status: 402 }
    );
  }

  const name = String(body.name || "").trim().slice(0, 80);
  const line1 = String(body.line1 || "").trim().slice(0, 120);
  const city = String(body.city || "").trim().slice(0, 80);
  const zip = String(body.zip || "").trim().slice(0, 20);
  const country = String(body.country || "").trim().toUpperCase();
  if (!name || !line1 || !city || !zip || !/^[A-Z]{2}$/.test(country)) {
    return NextResponse.json(
      { error: "Please complete the shipping address." },
      { status: 400 }
    );
  }

  const ref = `demo_${crypto.randomBytes(8).toString("hex")}`;
  try {
    const order = await fulfillPaidOrder({
      ref,
      design,
      artToken: token,
      origin: requestOrigin(req),
      recipient: {
        name,
        email: String(body.email || "").slice(0, 120) || undefined,
        address: {
          line1,
          line2: String(body.line2 || "").slice(0, 120) || undefined,
          postalOrZipCode: zip,
          countryCode: country,
          townOrCity: city,
          stateOrCounty: String(body.state || "").slice(0, 80) || undefined,
        },
      },
    });
    return NextResponse.json({ ok: true, ref, prodigiOrderId: order.id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
