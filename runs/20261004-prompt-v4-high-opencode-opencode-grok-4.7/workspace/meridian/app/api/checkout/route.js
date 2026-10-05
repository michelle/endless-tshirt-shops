import { colorById, SHIPPING_CENTS, SHIRT_CENTS, SIZES } from "../../../lib/colors.js";
import { COUNTRIES, parseSpec } from "../../../lib/spec.js";
import { getStripe } from "../../../lib/stripeClient.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { spec, errors } = parseSpec(body);
  if (errors.length) return Response.json({ error: errors[0] }, { status: 400 });

  const encoded = JSON.stringify(spec);
  if (encoded.length > 490) {
    return Response.json({ error: "That dedication or place name is too long to checkout." }, { status: 400 });
  }

  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || (host?.includes("localhost") ? "http" : "https");
  const origin = `${proto}://${host}`;
  const color = colorById(spec.color);
  const size = SIZES.find((s) => s.id === spec.size);

  try {
    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/create?cancelled=1`,
      phone_number_collection: { enabled: true },
      shipping_address_collection: { allowed_countries: COUNTRIES },
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: { amount: SHIPPING_CENTS, currency: "usd" },
            display_name: "Standard shipping",
            delivery_estimate: {
              minimum: { unit: "business_day", value: 6 },
              maximum: { unit: "business_day", value: 12 },
            },
          },
        },
      ],
      line_items: [
        {
          quantity: spec.qty,
          price_data: {
            currency: "usd",
            unit_amount: SHIRT_CENTS,
            product_data: {
              name: "Meridian star map tee",
              description: `${spec.title} · ${spec.place} · ${spec.date} ${spec.time} · ${color.name} / ${size?.label || spec.size}`,
            },
          },
        },
      ],
      metadata: {
        spec: encoded,
        origin,
      },
    });
    return Response.json({ url: session.url });
  } catch (err) {
    console.error("[meridian] checkout", err.message);
    return Response.json({ error: "Checkout could not be started. Try again in a moment." }, { status: 502 });
  }
}
