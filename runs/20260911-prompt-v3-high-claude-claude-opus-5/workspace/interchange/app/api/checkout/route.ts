import { NextRequest } from "next/server";
import { artToken } from "@/lib/art";
import { COUNTRY_CODES } from "@/lib/geo";
import { putChunked } from "@/lib/meta";
import { publicOrigin } from "@/lib/origin";
import { CURRENCY, SHIPPING, ShippingOptionId, totals } from "@/lib/pricing";
import { orderRef, pack } from "@/lib/sign";
import { GARMENTS, SIZE_LABELS, sanitizeSpec, serialOf, specProblem } from "@/lib/spec";
import { stripe, stripeEnabled } from "@/lib/stripe";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const spec = sanitizeSpec(body?.spec);
  const problem = specProblem(spec);
  if (problem) return Response.json({ error: problem }, { status: 400 });

  const shipping: ShippingOptionId = body?.shipping === "express" ? "express" : "standard";
  const t = totals(spec, Number(body?.qty) || 1, shipping);
  const origin = publicOrigin(req);
  const ref = orderRef();

  const garment = GARMENTS[spec.garment];
  const productName = `${spec.title} - custom transit map tee`;
  const productDesc =
    `${garment.label} Gildan 64000 Softstyle, size ${SIZE_LABELS[spec.size]}` +
    `${spec.backPrint ? ", front + back print" : ", front print"} - no. ${serialOf(spec)}, one of one`;

  if (!stripeEnabled()) {
    // No Stripe credentials on this deployment: fall back to the built-in
    // sandbox checkout so the order pipeline is still exercisable end to end.
    const token = pack({
      k: "demo",
      ref,
      spec,
      qty: t.qty,
      shipping,
      origin,
      amount: t.total,
      iat: Date.now(),
    });
    return Response.json({ url: `${origin}/pay/${token}`, mode: "sandbox", ref });
  }

  const metadata: Record<string, string> = {
    ref,
    origin,
    shippingOption: shipping,
    garment: spec.garment,
    size: spec.size,
    qty: String(t.qty),
    backPrint: spec.backPrint ? "1" : "0",
    serial: serialOf(spec),
  };
  putChunked(metadata, "spec", pack(spec));

  // Stripe renders this on the hosted checkout page. It rejects long URLs, and
  // a very elaborate map makes a very long token, so fall back to no image.
  const artImage = `${origin}/api/art/${artToken(spec, "front")}.png?screen=1`;
  const images = origin.startsWith("https") && artImage.length <= 1500 ? [artImage] : undefined;

  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    client_reference_id: ref,
    metadata,
    payment_intent_data: { metadata: { ref, serial: serialOf(spec) } },
    line_items: [
      {
        quantity: t.qty,
        price_data: {
          currency: CURRENCY,
          unit_amount: t.unit,
          product_data: { name: productName.slice(0, 250), description: productDesc.slice(0, 250), images },
        },
      },
    ],
    shipping_address_collection: { allowed_countries: COUNTRY_CODES as any },
    phone_number_collection: { enabled: true },
    shipping_options: [
      {
        shipping_rate_data: {
          type: "fixed_amount",
          display_name: `${SHIPPING[shipping].label} shipping`,
          fixed_amount: { amount: SHIPPING[shipping].cents, currency: CURRENCY },
        },
      },
    ],
    success_url: `${origin}/order/${ref}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/design?canceled=1`,
  });

  return Response.json({ url: session.url, mode: "stripe", ref });
}
