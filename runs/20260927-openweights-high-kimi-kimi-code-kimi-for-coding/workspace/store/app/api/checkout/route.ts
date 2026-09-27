import { NextRequest } from "next/server";
import { getStripe } from "@/lib/stripe";
import {
  colorById,
  PRODUCT_NAME,
  sanitizeDesign,
  SHIPPING_CENTS,
  SHIRT_PRICE_CENTS,
  sizeLabel,
  type DesignInput,
} from "@/lib/design";
import { artworkQueryString } from "@/lib/artwork";

const ALLOWED_COUNTRIES = [
  "US", "CA", "GB", "IE", "FR", "DE", "ES", "IT", "NL", "BE", "AT", "PT",
  "SE", "NO", "DK", "FI", "PL", "CZ", "GR", "HU", "SK", "SI", "LV", "LT",
  "LU", "MT", "CY", "RO", "BG", "AU", "NZ", "JP", "SG", "HK", "AE", "ZA",
  "MX", "BR", "CL", "CO",
] as const;

export async function POST(request: NextRequest) {
  let design: DesignInput;
  try {
    design = sanitizeDesign(await request.json());
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 400 });
  }

  const stripe = getStripe();
  const color = colorById(design.color);
  const origin = request.nextUrl.origin;
  const artworkUrl = `${origin}/api/artwork.png?${artworkQueryString(design)}`;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_creation: "always",
    phone_number_collection: { enabled: true },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: SHIRT_PRICE_CENTS,
          product_data: {
            name: `${PRODUCT_NAME} - "${design.word}"`,
            description: `${sizeLabel(design.size)} / ${color.label} - custom DTG print`,
            images: [artworkUrl],
          },
        },
      },
    ],
    shipping_address_collection: { allowed_countries: [...ALLOWED_COUNTRIES] },
    shipping_options: [
      {
        shipping_rate_data: {
          type: "fixed_amount",
          display_name: "Standard tracked shipping",
          fixed_amount: { amount: SHIPPING_CENTS, currency: "usd" },
          delivery_estimate: {
            minimum: { unit: "business_day", value: 5 },
            maximum: { unit: "business_day", value: 12 },
          },
        },
      },
    ],
    metadata: {
      store: "definingme-v1",
      word: design.word,
      pos: design.pos,
      definition: design.definition,
      example: design.example,
      year: design.year ? String(design.year) : "",
      size: design.size,
      color: design.color,
      colorProdigi: color.prodigi,
      colorLabel: color.label,
      accent: design.accent,
    },
    success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/?cancelled=1`,
  });

  return Response.json({ url: session.url });
}

export const maxDuration = 30;
