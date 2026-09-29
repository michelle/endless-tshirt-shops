import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { validateDesign, designToMetadata, DesignError, PRICE_CENTS } from "@/lib/design";
import { getBaseUrl } from "@/lib/baseUrl";

export async function POST(req: Request) {
  let design;
  try {
    design = validateDesign(await req.json());
  } catch (e) {
    const msg = e instanceof DesignError ? e.message : "Invalid request";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const baseUrl = getBaseUrl(req);
  const designMeta = designToMetadata(design);

  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/?canceled=1#customize`,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: PRICE_CENTS[design.size],
          product_data: {
            name: `Custom Star Map Tee — "${design.title}"`,
            description: `${design.date} ${design.time} · ${design.place} · Gildan 5000, ${design.color}, size ${design.size.toUpperCase()}`,
          },
        },
      },
    ],
    shipping_options: [
      {
        shipping_rate_data: {
          type: "fixed_amount",
          fixed_amount: { amount: 495, currency: "usd" },
          display_name: "Standard shipping",
          delivery_estimate: {
            minimum: { unit: "business_day", value: 3 },
            maximum: { unit: "business_day", value: 8 },
          },
        },
      },
    ],
    shipping_address_collection: {
      allowed_countries: [
        "US", "CA", "GB", "IE", "FR", "DE", "ES", "IT", "NL", "BE", "AT", "CH",
        "SE", "NO", "DK", "FI", "PL", "PT", "AU", "NZ", "JP",
      ],
    },
    metadata: { design: designMeta },
    payment_intent_data: { metadata: { design: designMeta } },
  });

  return NextResponse.json({ url: session.url });
}
