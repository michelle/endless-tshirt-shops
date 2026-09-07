import { NextResponse } from "next/server";
import { getQuote, validateItems } from "@/lib/prodigi";
import { COUNTRY_CODES } from "@/lib/countries";
import { PRICE_CENTS } from "@/lib/catalog";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const items = validateItems(body.items);
    const countryCode = String(body.countryCode ?? "").toUpperCase();
    if (!COUNTRY_CODES.has(countryCode)) return NextResponse.json({ error: "Unsupported country" }, { status: 400 });
    const quote = await getQuote(items, countryCode);
    const subtotal = items.reduce((n, it) => n + it.quantity * PRICE_CENTS, 0);
    return NextResponse.json({ subtotal, shipping: quote.shipping, total: subtotal + quote.shipping, carrier: quote.carrier, issues: quote.issues });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Quote failed" }, { status: 400 });
  }
}
