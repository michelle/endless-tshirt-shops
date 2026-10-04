import { CURRENCY, PRICE_CENTS, SHIP_COUNTRIES, colorLabel, isColor, isSize } from "@/lib/catalog";
import { SCENES, encodeDesign, normalizeDesign } from "@/lib/design";
import { baseUrl } from "@/lib/site";
import { stripe } from "@/lib/stripe";

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Bad request" }, { status: 400 });
  }
  const r = normalizeDesign(body?.design);
  if (!r.ok) return Response.json({ error: r.error }, { status: 400 });
  if (!isColor(body?.color)) return Response.json({ error: "Pick a shirt colour." }, { status: 400 });
  if (!isSize(body?.size)) return Response.json({ error: "Pick a size." }, { status: 400 });

  const d = r.design;
  const enc = encodeDesign(d);
  const origin = baseUrl(req);
  const meta = { design: JSON.stringify(d), color: body.color, size: body.size };

  try {
    const session = await stripe().checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          adjustable_quantity: { enabled: true, minimum: 1, maximum: 10 },
          price_data: {
            currency: CURRENCY,
            unit_amount: PRICE_CENTS,
            product_data: {
              name: `${d.name} National Park — tee`,
              description: `${colorLabel(body.color)} Bella+Canvas 3001 · size ${body.size.toUpperCase()} · ${SCENES[d.scene]}${d.year ? ` · Est. ${d.year}` : ""}`,
              images: [`${origin}/api/mockup/${enc}.png?c=${encodeURIComponent(body.color)}`],
            },
          },
        },
      ],
      shipping_address_collection: { allowed_countries: [...SHIP_COUNTRIES] },
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            display_name: "Standard shipping",
            fixed_amount: { amount: 0, currency: CURRENCY },
            delivery_estimate: { minimum: { unit: "business_day", value: 5 }, maximum: { unit: "business_day", value: 12 } },
          },
        },
      ],
      phone_number_collection: { enabled: true },
      metadata: meta,
      payment_intent_data: { metadata: meta },
      success_url: `${origin}/order/{CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?canceled=1&d=${enc}&c=${encodeURIComponent(body.color)}&s=${body.size}#design`,
    });
    return Response.json({ url: session.url });
  } catch (e: any) {
    console.error("[checkout]", e);
    return Response.json({ error: "Couldn’t start checkout. Please try again." }, { status: 502 });
  }
}
