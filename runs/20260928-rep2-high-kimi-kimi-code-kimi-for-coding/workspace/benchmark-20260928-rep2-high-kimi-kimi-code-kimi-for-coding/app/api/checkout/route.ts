import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { encodeSamples, parseDesign } from "@/lib/design";
import { GARMENT_COLORS, priceCents } from "@/lib/catalog";

export const dynamic = "force-dynamic";

const ALLOWED_COUNTRIES = [
  "US","CA","GB","IE","FR","DE","ES","IT","PT","NL","BE","LU","AT","CH","SE","NO","DK","FI",
  "IS","PL","CZ","SK","HU","GR","HR","SI","EE","LV","LT","RO","BG","JP","AU","NZ","SG","HK",
  "KR","IL","AE","ZA","BR","MX","AR","CL","CO","CR","PA","UY","MC","AD","MT","CY",
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const design = parseDesign(body?.design);

    const garment = GARMENT_COLORS.find((c) => c.prodigi === design.color);
    if (!garment) return NextResponse.json({ error: "Unknown garment color" }, { status: 400 });
    if (!garment.sizes.includes(design.size)) {
      return NextResponse.json({ error: "Size not available in this color" }, { status: 400 });
    }

    const stripe = getStripe();
    const origin =
      process.env.NEXT_PUBLIC_SITE_URL ||
      req.headers.get("origin") ||
      new URL(req.url).origin;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: priceCents(design.size),
            product_data: {
              name: `Echostitch custom waveform tee — ${garment.label} / ${design.size.toUpperCase()}`,
              description:
                design.style === "fill"
                  ? "Your sound, printed as a one-of-one DTG silhouette."
                  : "Your sound, printed as a one-of-one DTG waveform line.",
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        v: "1",
        d: encodeSamples(design.samples),
        style: design.style,
        ink: design.ink,
        color: design.color,
        size: design.size,
      },
      shipping_address_collection: { allowed_countries: ALLOWED_COUNTRIES as never },
      phone_number_collection: { enabled: true },
      success_url: `${origin}/?session_id={CHECKOUT_SESSION_ID}#order`,
      cancel_url: `${origin}/?cancelled=1#designer`,
    });

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error("checkout error", err);
    const msg = err instanceof Error ? err.message : "checkout failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
