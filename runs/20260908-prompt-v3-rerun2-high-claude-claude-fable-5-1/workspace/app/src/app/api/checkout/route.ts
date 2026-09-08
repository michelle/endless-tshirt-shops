import { NextRequest } from "next/server";
import { CURRENCY, MAX_QUANTITY, SHIRT_COLORS, UNIT_PRICE_CENTS, designToMetadata, formatDateLong, parseDesign } from "@/lib/design";
import { baseUrl, stripe } from "@/lib/stripe";
import { ALLOWED_COUNTRIES, SHIPPING_OPTIONS } from "@/lib/shipping";
import { previewToken } from "@/lib/preview-token";

export const dynamic = "force-dynamic";

/**
 * Creates a Stripe Checkout Session for one design. Nothing is sent to the
 * printer here: fulfilment happens in the Stripe webhook after payment.
 */
export async function POST(req: NextRequest) {
  let body: { design?: unknown; quantity?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  let design;
  try {
    design = parseDesign(body.design);
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Invalid design" }, { status: 400 });
  }
  const quantity = Number(body.quantity ?? 1);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
    return Response.json({ error: "Invalid quantity" }, { status: 400 });
  }

  const base = baseUrl();
  const colorLabel = SHIRT_COLORS.find((c) => c.key === design.color)?.label ?? design.color;
  const imageUrl = `${base}/api/preview?d=${encodeURIComponent(previewToken(design))}`;

  try {
    const session = await stripe().checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity,
          price_data: {
            currency: CURRENCY,
            unit_amount: UNIT_PRICE_CENTS,
            product_data: {
              name: `Under These Stars — custom star map tee (${colorLabel}, ${design.size.toUpperCase()})`,
              description: `"${design.title || "Under these stars"}" · ${design.place} · ${formatDateLong(design.date)} ${design.time}`,
              images: [imageUrl],
            },
          },
        },
      ],
      shipping_address_collection: { allowed_countries: ALLOWED_COUNTRIES },
      shipping_options: SHIPPING_OPTIONS,
      phone_number_collection: { enabled: true },
      metadata: { ...designToMetadata(design), quantity: String(quantity) },
      payment_intent_data: { description: `Star map tee · ${design.place} · ${design.date}` },
      success_url: `${base}/orders/{CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/?canceled=1#design`,
      expires_at: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour
    });
    return Response.json({ url: session.url, id: session.id });
  } catch (e) {
    console.error("checkout error", e);
    return Response.json({ error: "Could not start checkout. Please try again." }, { status: 500 });
  }
}
