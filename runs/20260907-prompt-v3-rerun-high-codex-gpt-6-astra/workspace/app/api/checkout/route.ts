import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { designSchema, PRICE, SHIPPING } from "@/lib/design";
import { assertReady, stripeClient, origin } from "@/lib/config";
import { verifyQuote } from "@/lib/prodigi";
export async function POST(request: Request) {
  if (request.headers.get("origin") !== origin())
    return NextResponse.json(
      { error: "Invalid request origin" },
      { status: 403 },
    );
  try {
    assertReady();
    const raw = await request.text();
    if (raw.length > 2000)
      return NextResponse.json(
        { error: "Design is too large" },
        { status: 400 },
      );
    const parsed = designSchema.safeParse(JSON.parse(raw));
    if (!parsed.success)
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 },
      );
    const design = parsed.data;
    await verifyQuote(design);
    const session = await stripeClient().checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      billing_address_collection: "required",
      shipping_address_collection: { allowed_countries: ["US"] },
      phone_number_collection: { enabled: true },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: PRICE,
            product_data: {
              name: "Your Personal Park Tee",
              description: `${design.place} · ${design.name} · ${design.year} · ${design.size.toUpperCase()} / White`,
              metadata: { store: "field-notes-v1" },
            },
          },
        },
      ],
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: { amount: SHIPPING, currency: "usd" },
            display_name: "Standard US shipping",
          },
        },
      ],
      metadata: {
        store: "field-notes-v1",
        design: JSON.stringify(design),
        reference: randomUUID(),
      },
      success_url: origin() + "/order?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: origin() + "/?canceled=1#studio",
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    console.error(
      "checkout_failed",
      error instanceof Error ? error.name : "Error",
    );
    return NextResponse.json(
      {
        error:
          message.includes("setup") ||
          message.includes("unavailable") ||
          message.includes("not open")
            ? message
            : "Checkout is temporarily unavailable. Please try again shortly.",
      },
      { status: 503 },
    );
  }
}
