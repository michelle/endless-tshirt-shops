import { cleanOrder, originFrom, PRODUCT, stripeClient } from "@/lib/commerce";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const order = cleanOrder(await request.json());
    const stripe = stripeClient();
    const origin = originFrom(request);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      submit_type: "pay",
      billing_address_collection: "required",
      customer_creation: "always",
      shipping_address_collection: { allowed_countries: ["US", "CA", "GB"] },
      shipping_options: [{ shipping_rate_data: { type: "fixed_amount", fixed_amount: { amount: 550, currency: PRODUCT.currency }, display_name: "Tracked DTG shipping", delivery_estimate: { minimum: { unit: "business_day", value: 5 }, maximum: { unit: "business_day", value: 10 } } } }],
      line_items: [{ price_data: { currency: PRODUCT.currency, unit_amount: PRODUCT.amount, product_data: { name: "Signal Tee / one-of-one edition", description: `Custom signal for ${order.name} · ${order.place}` }, }, quantity: 1 }],
      metadata: { signal_name: order.name, signal_place: order.place, signal_mood: order.mood, size: order.size, color: order.color },
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?cancelled=1`,
    });
    return Response.json({ url: session.url });
  } catch (error) { return Response.json({ error: error.message || "Unable to create checkout." }, { status: 400 }); }
}
