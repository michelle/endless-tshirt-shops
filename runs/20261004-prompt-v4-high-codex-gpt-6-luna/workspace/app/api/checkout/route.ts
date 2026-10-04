import { runtimeEnv } from "../../../lib/runtime-env";
import { cleanDesign, type DesignInput } from "../../../lib/design";

export const runtime = "edge";
const sizes = new Set(["xs", "s", "m", "l", "xl", "2xl", "3xl", "4xl"]);

export async function POST(request: Request) {
  if (!runtimeEnv.STRIPE_SECRET_KEY) return Response.json({ error: "Secure checkout is being connected. Please check back shortly." }, { status: 503 });
  if (!runtimeEnv.BUCKET) return Response.json({ error: "The store is not ready to accept orders yet." }, { status: 503 });
  let body: { designKey?: string; design?: DesignInput; size?: string };
  try { body = await request.json(); } catch { return Response.json({ error: "The order details could not be read." }, { status: 400 }); }
  const designKey = body.designKey ?? "";
  const size = (body.size ?? "").toLowerCase();
  const design = cleanDesign(body.design ?? { name: "", date: "", place: "" });
  if (!/^[0-9a-f-]{36}$/i.test(designKey) || !sizes.has(size)) return Response.json({ error: "Choose a shirt size and try again." }, { status: 400 });
  if (!await runtimeEnv.BUCKET.head(designKey)) return Response.json({ error: "Your print file expired. Please submit your design again." }, { status: 400 });

  const origin = new URL(request.url).origin;
  const form = new URLSearchParams();
  form.set("mode", "payment");
  form.set("success_url", `${origin}/?paid=1`);
  form.set("cancel_url", `${origin}/?canceled=1`);
  form.set("shipping_address_collection[allowed_countries][0]", "US");
  form.set("shipping_options[0][shipping_rate_data][type]", "fixed_amount");
  form.set("shipping_options[0][shipping_rate_data][fixed_amount][amount]", "0");
  form.set("shipping_options[0][shipping_rate_data][fixed_amount][currency]", "usd");
  form.set("shipping_options[0][shipping_rate_data][display_name]", "Complimentary US shipping");
  form.set("line_items[0][quantity]", "1");
  form.set("line_items[0][price_data][currency]", "usd");
  form.set("line_items[0][price_data][unit_amount]", "3800");
  form.set("line_items[0][price_data][product_data][name]", `Personal Star Map Tee — ${design.name}`);
  form.set("line_items[0][price_data][product_data][description]", `Bella + Canvas 3001 · ${size.toUpperCase()} · printed to order`);
  form.set("metadata[design_key]", designKey);
  form.set("metadata[display_name]", design.name);
  form.set("metadata[map_date]", design.date);
  form.set("metadata[place]", design.place);
  form.set("metadata[size]", size);

  try {
    const result = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: { Authorization: `Basic ${btoa(`${runtimeEnv.STRIPE_SECRET_KEY}:`)}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
    });
    const session = await result.json() as { url?: string; error?: { message?: string } };
    if (!result.ok || !session.url) return Response.json({ error: "Stripe could not open checkout. Please try again." }, { status: 502 });
    return Response.json({ url: session.url });
  } catch {
    return Response.json({ error: "Checkout is temporarily unavailable. Please try again." }, { status: 502 });
  }
}
