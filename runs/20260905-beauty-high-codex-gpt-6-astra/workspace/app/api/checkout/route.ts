import {
  purchaseSchema,
  PRICE,
  assertRecentTimestamp,
  readableMoment,
} from "@/lib/catalog";
import { stripe, siteUrl, verifyEnvironment } from "@/lib/stripe";
import { checkVariant } from "@/lib/prodigi";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin && origin !== siteUrl())
    return Response.json(
      { error: "Please start checkout from the store." },
      { status: 403 },
    );
  const raw = await request.text();
  if (raw.length > 2048)
    return Response.json({ error: "Invalid order." }, { status: 413 });
  let input;
  try {
    input = purchaseSchema.safeParse(JSON.parse(raw));
  } catch {
    return Response.json({ error: "Invalid order." }, { status: 400 });
  }
  if (!input.success)
    return Response.json(
      { error: "Please choose a valid color, fit, and size." },
      { status: 400 },
    );
  const p = input.data;
  try {
    assertRecentTimestamp(p.timestamp);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
  try {
    verifyEnvironment();
    await checkVariant(p);
    const session = await stripe().checkout.sessions.create(
      {
        mode: "payment",
        payment_method_types: ["card"],
        branding_settings: {
          display_name: "datetime.store",
          background_color: "#f8f7f1",
          button_color: "#282923",
          border_style: "rounded",
          font_family: "inter",
        },
        shipping_address_collection: { allowed_countries: ["US"] },
        billing_address_collection: "required",
        shipping_options: [
          {
            shipping_rate_data: {
              type: "fixed_amount",
              fixed_amount: { amount: 0, currency: "usd" },
              display_name: "On us — standard US shipping",
              delivery_estimate: {
                minimum: { unit: "business_day", value: 7 },
                maximum: { unit: "business_day", value: 14 },
              },
            },
          },
        ],
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "usd",
              unit_amount: PRICE,
              product_data: {
                name: "The Now Tee",
                description: `${p.timestamp} · ${p.color} · ${p.fit} · ${p.size} — ${readableMoment(p.timestamp)}`,
                images:
                  p.color === "black"
                    ? [`${siteUrl()}/images/tee-black.webp`]
                    : undefined,
              },
            },
          },
        ],
        metadata: {
          store: "datetime-v1",
          timestamp: String(p.timestamp),
          color: p.color,
          fit: p.fit,
          size: p.size,
          requestId: p.requestId,
          artworkVersion: "1",
        },
        payment_intent_data: {
          description: `datetime.store — ${p.timestamp}`,
          metadata: { store: "datetime-v1", timestamp: String(p.timestamp) },
        },
        custom_text: {
          submit: {
            message:
              "Your captured timestamp will be printed exactly as shown. Please double-check your shipping address and size.",
          },
        },
        success_url: `${siteUrl()}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${siteUrl()}/?checkout=canceled`,
      },
      { idempotencyKey: `checkout-${p.requestId}` },
    );
    return Response.json(
      { url: session.url },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    console.error("Checkout creation failed", {
      type: e instanceof Error ? e.name : "unknown",
      message: e instanceof Error ? e.message : "Unknown error",
    });
    return Response.json(
      {
        error:
          "Checkout is taking a little longer than usual. Your moment is saved—please try again.",
      },
      { status: 503 },
    );
  }
}
