import { NextResponse } from "next/server";
import { createOrder, getQuote, validateItems, type LineItem } from "@/lib/prodigi";
import { validateAddress, newOrderRef } from "@/lib/checkout";
import { stripe, stripeEnabled } from "@/lib/stripe";
import { siteUrl } from "@/lib/site";
import { PRICE_CENTS, CURRENCY, getDesign, getColor } from "@/lib/catalog";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const items = validateItems(body.items);
    const address = validateAddress(body.address);
    const base = await siteUrl();
    const quote = await getQuote(items, address.countryCode);
    const subtotal = items.reduce((n, it) => n + it.quantity * PRICE_CENTS, 0);
    const total = subtotal + quote.shipping;

    if (stripeEnabled()) {
      const session = await stripe().checkout.sessions.create({
        mode: "payment",
        customer_email: address.email,
        line_items: items.map((it: LineItem) => ({
          quantity: it.quantity,
          price_data: {
            currency: CURRENCY.toLowerCase(),
            unit_amount: PRICE_CENTS,
            product_data: {
              name: `${getDesign(it.slug)!.name} tee`,
              description: `${getColor(it.color)!.label}, size ${it.size.toUpperCase()}`,
              images: [`${base}/designs/${it.slug}-${getColor(it.color)!.ink}.png`],
            },
          },
        })),
        shipping_options: [
          {
            shipping_rate_data: {
              type: "fixed_amount",
              display_name: `Standard shipping to ${address.countryCode}`,
              fixed_amount: { amount: quote.shipping, currency: CURRENCY.toLowerCase() },
            },
          },
        ],
        metadata: {
          items: JSON.stringify(items),
          address: JSON.stringify(address),
        },
        success_url: `${base}/orders/stripe/{CHECKOUT_SESSION_ID}`,
        cancel_url: `${base}/checkout?cancelled=1`,
      });
      return NextResponse.json({ mode: "stripe", url: session.url, total });
    }

    // No payment processor configured: place the order straight into Prodigi (sandbox) as a test order.
    const ref = newOrderRef();
    const order = await createOrder({ items, address, merchantReference: ref, siteUrl: base });
    return NextResponse.json({ mode: "test", orderId: order.id, ref, total });
  } catch (e) {
    console.error("checkout failed", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Checkout failed" }, { status: 400 });
  }
}
