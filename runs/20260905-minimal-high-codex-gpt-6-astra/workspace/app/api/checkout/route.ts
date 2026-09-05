import { checkoutSchema, PRICE_CENTS, PRODUCTS } from "@/lib/catalog";
import { appUrl, assertModes, required, sandbox } from "@/lib/config";
import {
  accessToken,
  assertOrigin,
  errorResponse,
  HttpError,
  readJson,
  signDesign,
  throttle,
} from "@/lib/security";
import { checkAvailability } from "@/lib/prodigi";
import { stripe } from "@/lib/stripe";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    assertOrigin(request);
    assertModes(required("STRIPE_SECRET_KEY").includes("_live_"));
    throttle(request, "checkout");
    const parsed = checkoutSchema.safeParse(await readJson(request));
    if (!parsed.success)
      throw new HttpError(400, "Please choose a valid fit and size.");
    const input = parsed.data;
    if (Math.abs(Date.now() - input.timestamp) > 5 * 60 * 1000)
      throw new HttpError(
        400,
        "This moment has passed. Please refresh and capture a new one.",
      );
    await checkAvailability(input);
    const token = accessToken(input.requestId);
    const designToken = signDesign(input);
    const metadata = {
      store_id: required("STORE_ID"),
      design_token: designToken,
      timestamp: String(input.timestamp),
      fit: input.fit,
      size: input.size,
      fulfillment_state: "awaiting_payment",
    };
    const session = await stripe().checkout.sessions.create(
      {
        mode: "payment",
        payment_method_types: ["card"],
        client_reference_id: input.requestId,
        metadata,
        shipping_address_collection: { allowed_countries: ["US"] },
        shipping_options: [
          {
            shipping_rate_data: {
              type: "fixed_amount",
              fixed_amount: { amount: 0, currency: "usd" },
              display_name: "Free US shipping",
            },
          },
        ],
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "usd",
              unit_amount: PRICE_CENTS,
              product_data: {
                name: "The datetime tee",
                description: `${PRODUCTS[input.fit].name} / ${input.size} / Black — ${input.timestamp}`,
                images: [`${appUrl()}/images/shirt.webp`],
              },
            },
          },
        ],
        payment_intent_data: {
          metadata: {
            store_id: required("STORE_ID"),
            timestamp: String(input.timestamp),
          },
        },
        custom_text: {
          submit: {
            message: sandbox()
              ? "Test edition: no real charge and no physical shipment. Your timestamp is already frozen."
              : "Your timestamp is frozen. Your tee will be made to order.",
          },
        },
        branding_settings: {
          display_name: "datetime.store",
          background_color: "#faf9f5",
          button_color: "#536148",
          border_style: "rectangular",
        },
        success_url: `${appUrl()}/order?session_id={CHECKOUT_SESSION_ID}&token=${token}`,
        cancel_url: `${appUrl()}/?canceled=1&fit=${input.fit}&size=${input.size}`,
        expires_at: Math.floor(input.timestamp / 1000) + 35 * 60,
      },
      { idempotencyKey: `datetime-checkout-${input.requestId}` },
    );
    if (!session.url) throw new Error("Checkout URL missing");
    return Response.json(
      {
        url: session.url,
        sessionId: session.id,
        orderToken: token,
        timestamp: input.timestamp,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(
      error,
      "Checkout is temporarily unavailable. Please try again in a moment.",
    );
  }
}
