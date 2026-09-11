import { NextRequest, NextResponse } from "next/server";
import { encodeDesign, sanitizeDesign } from "../../../lib/design";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const design = sanitizeDesign(body.design ?? {});
    const shippingName = String(body.shippingName ?? "").trim().slice(0, 80);
    const email = String(body.email ?? "").trim().slice(0, 120);
    if (!shippingName || !email || !email.includes("@")) return NextResponse.json({ error: "Add your name and a valid email before checkout." }, { status: 400 });
    const origin = request.nextUrl.origin;
    const secret = process.env.STRIPE_SECRET_KEY;
    if (!secret) {
      const query = new URLSearchParams({ demo: "1", email, name: shippingName, design: encodeDesign(design) });
      return NextResponse.json({ mode: "demo", url: `${origin}/success?${query.toString()}` });
    }
    const params = new URLSearchParams();
    params.set("mode", "payment");
    params.set("success_url", `${origin}/success?session_id={CHECKOUT_SESSION_ID}`);
    params.set("cancel_url", `${origin}/#customize`);
    params.set("customer_email", email);
    params.set("shipping_address_collection[allowed_countries][0]", "US");
    params.set("shipping_address_collection[allowed_countries][1]", "CA");
    params.set("shipping_address_collection[allowed_countries][2]", "GB");
    params.set("shipping_address_collection[allowed_countries][3]", "AU");
    params.set("shipping_options[0][shipping_rate_data][type]", "fixed_amount");
    params.set("shipping_options[0][shipping_rate_data][fixed_amount][amount]", "650");
    params.set("shipping_options[0][shipping_rate_data][fixed_amount][currency]", "usd");
    params.set("shipping_options[0][shipping_rate_data][display_name]", "Standard tracked shipping");
    params.set("shipping_options[0][shipping_rate_data][delivery_estimate][minimum][unit]", "business_day");
    params.set("shipping_options[0][shipping_rate_data][delivery_estimate][minimum][value]", "4");
    params.set("shipping_options[0][shipping_rate_data][delivery_estimate][maximum][unit]", "business_day");
    params.set("shipping_options[0][shipping_rate_data][delivery_estimate][maximum][value]", "8");
    params.set("shipping_options[1][shipping_rate_data][type]", "fixed_amount");
    params.set("shipping_options[1][shipping_rate_data][fixed_amount][amount]", "1600");
    params.set("shipping_options[1][shipping_rate_data][fixed_amount][currency]", "usd");
    params.set("shipping_options[1][shipping_rate_data][display_name]", "Express tracked shipping");
    params.set("shipping_options[1][shipping_rate_data][delivery_estimate][minimum][unit]", "business_day");
    params.set("shipping_options[1][shipping_rate_data][delivery_estimate][minimum][value]", "2");
    params.set("shipping_options[1][shipping_rate_data][delivery_estimate][maximum][unit]", "business_day");
    params.set("shipping_options[1][shipping_rate_data][delivery_estimate][maximum][value]", "4");
    params.set("line_items[0][quantity]", String(design.quantity));
    params.set("line_items[0][price_data][currency]", "usd");
    params.set("line_items[0][price_data][unit_amount]", "4800");
    params.set("line_items[0][price_data][product_data][name]", `PATCHWORK one-of-one tee · ${design.name}`);
    params.set("line_items[0][price_data][product_data][description]", `${design.vibe} / ${design.note}`);
    params.set("metadata[design]", encodeDesign(design));
    params.set("metadata[product_sku]", "GLOBAL-TEE-BC-3001");
    params.set("metadata[brand]", "PATCHWORK");
    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: { Authorization: `Basic ${Buffer.from(`${secret}:`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: params
    });
    const session = await response.json();
    if (!response.ok) return NextResponse.json({ error: session?.error?.message || "Stripe could not start checkout." }, { status: 502 });
    return NextResponse.json({ mode: "stripe", url: session.url });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Checkout could not start." }, { status: 500 });
  }
}
