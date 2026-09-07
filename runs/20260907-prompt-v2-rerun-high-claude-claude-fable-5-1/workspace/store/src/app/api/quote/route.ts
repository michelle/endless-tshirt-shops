import { NextRequest, NextResponse } from "next/server";
import { normaliseCart } from "@/lib/catalog";
import { shippingOptions } from "@/lib/orders";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const lines = normaliseCart(body.items);
    const country = String(body.country ?? "").toUpperCase();
    if (!/^[A-Z]{2}$/.test(country)) return NextResponse.json({ error: "Invalid country" }, { status: 400 });
    const options = await shippingOptions(lines, country);
    return NextResponse.json({ options });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not quote shipping";
    const status = msg.startsWith("Prodigi") ? 502 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
