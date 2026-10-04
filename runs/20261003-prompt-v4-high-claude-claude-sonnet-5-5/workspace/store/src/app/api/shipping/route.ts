import { NextRequest, NextResponse } from "next/server";
import { SHIP_COUNTRIES, MAX_ITEMS_PER_ORDER } from "@/lib/catalog";
import { parseCartItem } from "@/lib/design";
import { quoteShipping } from "@/lib/prodigi";
import { shippingChargeCents } from "@/lib/pricing";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const country = String(body?.country ?? "");
  const items = (Array.isArray(body?.items) ? body.items : []).map(parseCartItem);
  if (!(country in SHIP_COUNTRIES) || !items.length || items.length > MAX_ITEMS_PER_ORDER || items.some((i: unknown) => !i)) {
    return NextResponse.json({ error: "Invalid cart" }, { status: 400 });
  }
  try {
    return NextResponse.json({ shippingCents: shippingChargeCents(await quoteShipping(country, items)) });
  } catch (e: any) {
    return NextResponse.json({ error: "We can't ship this order to that country right now." }, { status: 422 });
  }
}
