import { NextResponse } from "next/server";
import { priceCart } from "@/lib/cart";
import { shippingCentsFor, SHIPPING_METHODS } from "@/lib/shipping";
import { CURRENCY } from "@/lib/catalog";
import { unavailableLines, unavailableMessage } from "@/lib/availability";
import { COUNTRIES } from "@/lib/countries";
import { ProdigiError, type ShippingMethod } from "@/lib/prodigi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let payload: { items?: unknown; countryCode?: string; shippingMethod?: string };
  try { payload = await req.json(); } catch { return NextResponse.json({ error: "Malformed request" }, { status: 400 }); }

  const { lines, subtotalCents, errors } = priceCart(payload.items);
  if (lines.length === 0) return NextResponse.json({ error: errors[0] ?? "Your cart is empty" }, { status: 400 });

  const country = String(payload.countryCode ?? "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(country)) return NextResponse.json({ error: "Choose a destination country" }, { status: 400 });

  const method = (SHIPPING_METHODS.find((m) => m.id === payload.shippingMethod)?.id ??
    "Budget") as ShippingMethod;

  const countryName = COUNTRIES.find((c) => c.code === country)?.name ?? country;
  const blocked = unavailableLines(lines, country);
  if (blocked.length > 0) {
    return NextResponse.json(
      { error: unavailableMessage(blocked[0], countryName), unavailable: blocked.map((b) => b.line) },
      { status: 409 },
    );
  }

  try {
    const { shippingCents, available } = await shippingCentsFor(lines, country, method);
    if (!available) {
      return NextResponse.json(
        { error: `We can't ship ${method} to ${country} right now. Try another service or country.` },
        { status: 409 },
      );
    }
    return NextResponse.json({
      currency: CURRENCY,
      lines,
      subtotalCents,
      shippingCents,
      totalCents: subtotalCents + shippingCents,
      shippingMethod: method,
      warnings: errors,
    });
  } catch (e) {
    const detail = e instanceof ProdigiError ? e.body : undefined;
    console.error("quote failed", e);
    return NextResponse.json({ error: "Could not price shipping just now.", detail }, { status: 502 });
  }
}
