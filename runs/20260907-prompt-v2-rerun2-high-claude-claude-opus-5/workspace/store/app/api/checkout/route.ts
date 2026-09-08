import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { priceCart, encodeCart } from "@/lib/cart";
import { shippingCentsFor, SHIPPING_METHODS } from "@/lib/shipping";
import { CURRENCY, PRICE_CENTS, SIZE_LABEL, money } from "@/lib/catalog";
import { ProdigiError, type ShippingMethod } from "@/lib/prodigi";
import { validateAddress, placeProdigiOrder, newReference } from "@/lib/orders";
import { originFrom } from "@/lib/format";
import { unavailableLines, unavailableMessage } from "@/lib/availability";
import { COUNTRIES } from "@/lib/countries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let payload: Record<string, unknown>;
  try { payload = await req.json(); } catch { return NextResponse.json({ error: "Malformed request" }, { status: 400 }); }

  const { lines, subtotalCents } = priceCart(payload.items);
  if (lines.length === 0) return NextResponse.json({ error: "Your cart is empty" }, { status: 400 });

  const checked = validateAddress(payload.address);
  if ("error" in checked) return NextResponse.json({ error: checked.error }, { status: 400 });
  const { address } = checked;

  const shippingMethod = (SHIPPING_METHODS.find((m) => m.id === payload.shippingMethod)?.id ??
    "Budget") as ShippingMethod;

  const countryName = COUNTRIES.find((c) => c.code === address.country)?.name ?? address.country;
  const blocked = unavailableLines(lines, address.country);
  if (blocked.length > 0) {
    return NextResponse.json({ error: unavailableMessage(blocked[0], countryName) }, { status: 409 });
  }

  const origin = originFrom(await headers());

  try {
    const { shippingCents, available } = await shippingCentsFor(lines, address.country, shippingMethod);
    if (!available) {
      return NextResponse.json({ error: `We can't ship ${shippingMethod} to ${address.country}.` }, { status: 409 });
    }
    const totalCents = subtotalCents + shippingCents;
    const reference = newReference();

    // ── Card payment, when Stripe is configured ───────────────────────────
    if (process.env.STRIPE_SECRET_KEY) {
      const { default: Stripe } = await import("stripe");
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        customer_email: address.email,
        line_items: [
          ...lines.map((l) => ({
            quantity: l.qty,
            price_data: {
              currency: CURRENCY.toLowerCase(),
              unit_amount: PRICE_CENTS,
              product_data: {
                name: `${l.name} — ${l.colorLabel}, ${SIZE_LABEL[l.size] ?? l.size}`,
                description: l.epithet,
              },
            },
          })),
          {
            quantity: 1,
            price_data: {
              currency: CURRENCY.toLowerCase(),
              unit_amount: shippingCents,
              product_data: { name: `Shipping — ${shippingMethod}` },
            },
          },
        ],
        success_url: `${origin}/orders/pending?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/checkout?cancelled=1`,
        // The webhook re-reads this to fulfil, so what ships is what was paid for.
        // Stripe caps each value at 500 chars — hence the compact cart encoding
        // and one key per address field.
        metadata: {
          reference,
          shippingMethod,
          origin,
          cart: encodeCart(lines),
          a_name: address.name,
          a_email: address.email,
          a_phone: address.phone ?? "",
          a_line1: address.line1,
          a_line2: address.line2 ?? "",
          a_city: address.city,
          a_state: address.state ?? "",
          a_postcode: address.postcode,
          a_country: address.country,
        },
      });
      return NextResponse.json({ mode: "stripe", url: session.url, reference });
    }

    // ── No payment provider configured: place the print order directly ────
    const order = await placeProdigiOrder({
      lines, address, shippingMethod, origin, reference,
      idempotencySeed: reference,
    });

    return NextResponse.json({
      mode: "unpaid-demo",
      orderId: order.id,
      reference,
      totals: {
        currency: CURRENCY, subtotalCents, shippingCents, totalCents,
        display: money(totalCents),
      },
    });
  } catch (e) {
    console.error("checkout failed", e);
    if (e instanceof ProdigiError) {
      return NextResponse.json(
        { error: "The print partner rejected this order.", detail: e.body },
        { status: 502 },
      );
    }
    return NextResponse.json({ error: "Checkout failed. Nothing was charged." }, { status: 500 });
  }
}
