import { NextResponse } from "next/server";
import { SHIPPING_HANDLING_CENTS, SHIRT_CENTS, shirtById } from "@/lib/catalog";
import { formatDate } from "@/lib/design";
import { quoteOrder } from "@/lib/prodigi";
import { stripe } from "@/lib/stripe";
import { parseDesign, parseQty, parseShip, parseShipMethod } from "@/lib/validate";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const spec = parseDesign(body.design);
    const ship = parseShip(body.ship);
    const qty = parseQty(body.qty);
    const method = parseShipMethod(body.shipMethod);
    const quote = await quoteOrder({
      country: ship.country,
      method,
      color: spec.color,
      size: spec.size,
      copies: qty,
    });
    const shippingCents = quote.shippingCents + SHIPPING_HANDLING_CENTS;
    const origin = new URL(req.url).origin;
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
    const proto = req.headers.get("x-forwarded-proto") || "https";
    const base = host ? `${proto}://${host}` : origin;
    const colorName = shirtById(spec.color)?.name || spec.color;
    const who = [spec.name1, spec.name2].filter(Boolean).join(" & ");
    const session = await stripe().checkout.sessions.create({
      mode: "payment",
      customer_email: ship.email,
      success_url: `${base}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/checkout?cancelled=1`,
      billing_address_collection: "auto",
      line_items: [
        {
          quantity: qty,
          price_data: {
            currency: "usd",
            unit_amount: SHIRT_CENTS,
            product_data: {
              name: `Stillpoint tee — ${who}`,
              description: `${colorName}, size ${spec.size.toUpperCase()} · ${spec.place} · ${formatDate(spec.date)}. Printed after payment.`,
            },
          },
        },
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: shippingCents,
            product_data: {
              name: `Shipping · ${method}`,
              description: `To ${ship.city}, ${ship.country}`,
            },
          },
        },
      ],
      metadata: {
        name1: spec.name1,
        name2: spec.name2,
        date: spec.date,
        time: spec.time,
        approximate: spec.approximate ? "1" : "0",
        place: spec.place,
        region: spec.region,
        lat: String(spec.lat),
        lon: String(spec.lon),
        tz: spec.tz,
        line: spec.line,
        color: spec.color,
        size: spec.size,
        qty: String(qty),
        shipMethod: method,
        shipName: ship.name,
        email: ship.email,
        phone: ship.phone,
        line1: ship.line1,
        line2: ship.line2,
        city: ship.city,
        state: ship.state,
        zip: ship.zip,
        country: ship.country,
      },
      payment_intent_data: {
        description: `Stillpoint tee for ${who}`,
        metadata: { place: spec.place, date: spec.date },
      },
    });
    if (!session.url) throw new Error("Stripe did not return a checkout URL.");
    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not start checkout.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
