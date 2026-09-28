import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { siteUrl } from "@/lib/site";
import { DesignError, designToMetadata, encodeDesignParam, epithetFor, validateDesign } from "@/lib/design";
import { BLANK_LABEL, MAX_CART_LINES, MAX_QTY, SHIPPING_OPTIONS, SHIP_COUNTRIES, colorById, sizeById } from "@/lib/catalog";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { items?: { design?: unknown; qty?: unknown }[] };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
  const raw = Array.isArray(body.items) ? body.items : [];
  if (raw.length === 0) return Response.json({ error: "Your bag is empty" }, { status: 400 });
  if (raw.length > MAX_CART_LINES) return Response.json({ error: `Max ${MAX_CART_LINES} designs per order` }, { status: 400 });

  const origin = new URL(req.url).origin;
  const publicBase = siteUrl(req);
  const imagesAllowed = publicBase.startsWith("https://");

  let lineItems: Stripe.Checkout.SessionCreateParams.LineItem[];
  try {
    lineItems = raw.map((item) => {
      const design = validateDesign(item.design);
      const qty = Number(item.qty);
      if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) throw new DesignError("Invalid quantity");
      const size = sizeById(design.size)!;
      const color = colorById(design.color)!;
      return {
        quantity: qty,
        price_data: {
          currency: "usd",
          unit_amount: size.priceCents, // price comes from the server-side catalog only
          product_data: {
            name: `Specimen Tee — ${design.genus} ${epithetFor(design.genus, design.trait)}`,
            description: `${color.label} · ${size.label} · ${BLANK_LABEL}. One-of-one plate for ${design.name}.`,
            images: imagesAllowed ? [`${publicBase}/api/mockup?w=600&d=${encodeDesignParam(design)}`] : undefined,
            metadata: designToMetadata(design),
          },
        },
      };
    });
  } catch (e) {
    const msg = e instanceof DesignError ? e.message : "Invalid design";
    return Response.json({ error: msg }, { status: 400 });
  }

  try {
    const session = await stripe().checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      shipping_address_collection: { allowed_countries: [...SHIP_COUNTRIES] },
      shipping_options: SHIPPING_OPTIONS.map((o) => ({
        shipping_rate_data: {
          type: "fixed_amount",
          display_name: o.label,
          fixed_amount: { amount: o.amountCents, currency: "usd" },
          delivery_estimate: {
            minimum: { unit: "business_day", value: o.minDays },
            maximum: { unit: "business_day", value: o.maxDays },
          },
          metadata: { shipping_id: o.id },
        },
      })),
      phone_number_collection: { enabled: true },
      billing_address_collection: "auto",
      success_url: `${origin}/order?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cart?canceled=1`,
      metadata: { store: "specimen" },
      payment_intent_data: { metadata: { store: "specimen" } },
    });
    return Response.json({ url: session.url });
  } catch (e) {
    console.error("[checkout] stripe error", e);
    return Response.json({ error: "Could not start checkout. Please try again." }, { status: 502 });
  }
}
