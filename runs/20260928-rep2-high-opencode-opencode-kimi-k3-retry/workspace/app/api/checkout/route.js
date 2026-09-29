import { NextResponse } from "next/server";
import { getStripe } from "../../../lib/stripe.js";
import { generateArt } from "../../../lib/art.js";
import { SHIRT_COLORS, SHIRT_SIZES, getPalette, PRICE_USD } from "../../../lib/palettes.js";

export const runtime = "nodejs";

const ALLOWED_COUNTRIES = [
  "US", "CA", "GB", "IE", "FR", "DE", "NL", "BE", "ES", "IT", "PT", "AT",
  "SE", "NO", "DK", "FI", "PL", "CZ", "CH", "AU", "NZ", "JP", "SG", "KR", "AE",
];

export async function POST(req) {
  try {
    const body = await req.json();
    const word = String(body.word || "").trim().slice(0, 40);
    const palette = String(body.palette || "");
    const color = String(body.color || "").toLowerCase();
    const size = String(body.size || "").toLowerCase();
    const qty = Math.max(1, Math.min(5, parseInt(body.qty, 10) || 1));

    if (!word) return NextResponse.json({ error: "A word is required." }, { status: 400 });
    if (!getPalette(palette) || !SHIRT_COLORS.includes(color) || !SHIRT_SIZES.includes(size)) {
      return NextResponse.json({ error: "Invalid selection." }, { status: 400 });
    }

    const { edition, style, palette: pal } = generateArt(word, palette);
    const origin = req.headers.get("origin") || `https://${req.headers.get("host")}`;

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"], // card-only keeps Link/wallet OTP prompts out of the flow
      line_items: [
        {
          quantity: qty,
          price_data: {
            currency: "usd",
            unit_amount: PRICE_USD,
            product_data: {
              name: `ONE OF ONE tee — “${word}” № ${edition}`,
              description: `Edition of one, grown from your word “${word}”. ${pal.name} palette · ${color} · ${size.toUpperCase()} · Bella+Canvas 3001 · DTG full-front print.`,
            },
          },
        },
      ],
      metadata: {
        word,
        palette,
        color,
        size,
        qty: String(qty),
        edition,
        style,
      },
      shipping_address_collection: { allowed_countries: ALLOWED_COUNTRIES },
      phone_number_collection: { enabled: true },
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/create`,
    });

    return NextResponse.json({ url: session.url, id: session.id, edition });
  } catch (e) {
    console.error("checkout error", e);
    return NextResponse.json({ error: e.message || "Checkout failed" }, { status: 500 });
  }
}
