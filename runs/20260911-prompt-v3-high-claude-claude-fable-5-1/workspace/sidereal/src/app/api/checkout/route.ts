import { NextRequest } from "next/server";
import { stripe } from "@/lib/stripe";
import { encodeDesign, orderInputSchema } from "@/lib/design";
import { CURRENCY, getGarment, PRICE_CENTS, SHIP_COUNTRIES, SHIPPING_OPTIONS } from "@/lib/catalog";
import { isValidTimeZone } from "@/lib/astro";
import { siteUrl } from "@/lib/site";
import { formatDate } from "@/lib/design";

export const dynamic = "force-dynamic";

/** POST /api/checkout { design, size, quantity } → { url } (Stripe Checkout) */
export async function POST(req: NextRequest) {
  let input;
  try {
    input = orderInputSchema.parse(await req.json());
  } catch (err) {
    return Response.json({ error: "Invalid order", detail: String(err) }, { status: 400 });
  }
  if (!isValidTimeZone(input.design.tz)) {
    return Response.json({ error: "Unknown time zone" }, { status: 400 });
  }

  const design = input.design;
  const encoded = encodeDesign(design);
  const garment = getGarment(design.garment);
  const site = siteUrl();
  const previewUrl = `${site}/api/preview?d=${encoded}&png=1&w=800`;

  const nameBits = [design.title || "Your sky", design.place].filter(Boolean).join(" — ");

  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        quantity: input.quantity,
        price_data: {
          currency: CURRENCY,
          unit_amount: PRICE_CENTS,
          product_data: {
            name: `Sidereal tee · ${nameBits}`.slice(0, 250),
            description: `${garment.label}, size ${input.size.toUpperCase()}. The sky over ${design.place || "your place"} on ${formatDate(design.date)} at ${design.time}. Printed to order.`.slice(0, 500),
            images: [previewUrl],
          },
        },
      },
    ],
    shipping_address_collection: { allowed_countries: [...SHIP_COUNTRIES] },
    shipping_options: SHIPPING_OPTIONS.map((o) => ({
      shipping_rate_data: {
        type: "fixed_amount" as const,
        display_name: o.label,
        fixed_amount: { amount: o.cents, currency: CURRENCY },
        delivery_estimate: {
          minimum: { unit: "business_day" as const, value: o.minDays },
          maximum: { unit: "business_day" as const, value: o.maxDays },
        },
        metadata: { prodigi: o.key === "express" ? "Express" : "Standard" },
      },
    })),
    phone_number_collection: { enabled: true },
    metadata: {
      design: encoded,
      size: input.size,
      garment: design.garment,
      quantity: String(input.quantity),
    },
    payment_intent_data: {
      description: `Sidereal tee · ${nameBits}`.slice(0, 250),
      metadata: { design: encoded, size: input.size, quantity: String(input.quantity) },
    },
    custom_text: {
      shipping_address: { message: "Each shirt is printed to order and ships from the print facility nearest to you." },
    },
    success_url: `${site}/order/{CHECKOUT_SESSION_ID}`,
    cancel_url: `${site}/design?d=${encoded}&size=${input.size}`,
  });

  return Response.json({ url: session.url, id: session.id });
}
