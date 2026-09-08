import { NextRequest, NextResponse } from "next/server";
import { getStripe, stripeConfigured } from "@/lib/stripeServer";
import { buildMetadata } from "@/lib/orderData";
import {
  COLORS,
  COUNTRIES,
  SHIPPING_FLAT_CENTS,
  SIZES,
  STYLES,
  CURRENCY,
  type StyleKey,
} from "@/lib/catalog";

export async function POST(req: NextRequest) {
  if (!stripeConfigured()) {
    return NextResponse.json(
      { error: "Payments are not configured on this deployment yet." },
      { status: 503 }
    );
  }

  const body = await req.json();

  const style = body.style as StyleKey;
  const color = body.color as string;
  const size = body.size as string;
  const skyDateISO = String(body.skyDateISO ?? "");
  const skyLat = Number(body.skyLat);
  const skyLon = Number(body.skyLon);
  const skyLocation = String(body.skyLocation ?? "");
  const skyCaption = String(body.skyCaption ?? "");
  const shipping = body.shipping ?? {};

  // -- server-side validation --------------------------------------------
  const errors: string[] = [];
  if (!STYLES[style]) errors.push("Invalid shirt style.");
  if (!COLORS.some((c) => c.key === color)) errors.push("Invalid color.");
  if (!(SIZES as readonly string[]).includes(size)) errors.push("Invalid size.");
  if (!skyDateISO || isNaN(new Date(skyDateISO).getTime())) errors.push("Invalid date/time.");
  if (!isFinite(skyLat) || skyLat < -90 || skyLat > 90) errors.push("Invalid latitude.");
  if (!isFinite(skyLon) || skyLon < -180 || skyLon > 180) errors.push("Invalid longitude.");
  if (!skyLocation) errors.push("A location is required.");

  for (const field of ["name", "email", "line1", "city", "postal", "country"]) {
    if (!shipping[field] || String(shipping[field]).trim() === "") {
      errors.push(`Shipping ${field} is required.`);
    }
  }
  if (shipping.country && !COUNTRIES.some((c) => c.code === shipping.country)) {
    errors.push("Unsupported shipping country.");
  }

  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join(" ") }, { status: 400 });
  }

  // -- price computed server-side, never trusted from the client ----------
  const subtotalCents = STYLES[style].priceCents;
  const shippingCents = SHIPPING_FLAT_CENTS;
  const totalCents = subtotalCents + shippingCents;

  const metadata = buildMetadata({
    style,
    color: color as never,
    size: size as never,
    skyDateISO,
    skyLat,
    skyLon,
    skyLocation,
    skyCaption,
    shipName: String(shipping.name ?? ""),
    shipEmail: String(shipping.email ?? ""),
    shipPhone: String(shipping.phone ?? ""),
    shipLine1: String(shipping.line1 ?? ""),
    shipLine2: String(shipping.line2 ?? ""),
    shipCity: String(shipping.city ?? ""),
    shipState: String(shipping.state ?? ""),
    shipPostal: String(shipping.postal ?? ""),
    shipCountry: String(shipping.country ?? ""),
    subtotalCents,
    shippingCents,
    totalCents,
  });

  const stripe = getStripe();
  const intent = await stripe.paymentIntents.create({
    amount: totalCents,
    currency: CURRENCY,
    payment_method_types: ["card"],
    receipt_email: metadata.ship_email || undefined,
    description: `Skyprint ${STYLES[style].label} — ${skyLocation}`,
    metadata,
  });

  return NextResponse.json({
    clientSecret: intent.client_secret,
    paymentIntentId: intent.id,
    totalCents,
    subtotalCents,
    shippingCents,
  });
}
