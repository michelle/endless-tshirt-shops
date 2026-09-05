import { NextResponse } from "next/server";
import { PRICE, SHIP_TO } from "@/lib/catalog";
import { artworkPath, describe, parseSpec, SpecError, toMetadata, totalCents } from "@/lib/order";
import { hasStripe, stripe } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Freezes a moment into a Stripe PaymentIntent. The price is computed here and
 * never trusted from the browser; the moment itself is whatever the browser
 * said, because that is the point of the shop.
 */
export async function POST(request: Request) {
  if (!hasStripe()) {
    return NextResponse.json(
      { error: "The till is not plugged in yet (STRIPE_SECRET_KEY is missing)." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Unreadable order." }, { status: 400 });
  }

  try {
    const spec = parseSpec(body);
    const detail = describe(spec);
    const amount = totalCents(spec);

    // Re-opening an intent requires its client secret, not just its id: the id
    // travels in plain sight, the secret does not.
    const secret = typeof (body as { clientSecret?: unknown }).clientSecret === "string"
      ? (body as { clientSecret: string }).clientSecret
      : null;
    const existingId = secret?.startsWith("pi_") ? secret.split("_secret_")[0] : null;

    const payload = {
      amount,
      currency: PRICE.currency,
      description: `datetime.store — ${detail.title}, size ${detail.size}`,
      metadata: toMetadata(spec),
      automatic_payment_methods: { enabled: true },
    } as const;

    // Re-picking a size or colour reuses the same intent instead of littering
    // the dashboard with abandoned ones.
    let intent = existingId ? await stripe().paymentIntents.retrieve(existingId) : null;
    if (intent && (intent.client_secret !== secret || intent.status !== "requires_payment_method")) {
      intent = null;
    }

    intent = intent
      ? await stripe().paymentIntents.update(intent.id, {
          amount: payload.amount,
          description: payload.description,
          metadata: payload.metadata,
        })
      : await stripe().paymentIntents.create(payload);

    return NextResponse.json({
      clientSecret: intent.client_secret,
      paymentIntentId: intent.id,
      amount,
      currency: PRICE.currency,
      allowedCountries: SHIP_TO,
      artworkUrl: artworkPath(spec, 1400),
    });
  } catch (error) {
    if (error instanceof SpecError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[checkout]", error);
    return NextResponse.json(
      { error: "We could not open the till. Try again in a moment." },
      { status: 500 },
    );
  }
}
