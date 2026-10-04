import { NextResponse } from "next/server";
import { SHIPPING_HANDLING_CENTS, SHIRT_CENTS } from "@/lib/catalog";
import { quoteOrder } from "@/lib/prodigi";
import { parseDesign, parseQty } from "@/lib/validate";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const spec = parseDesign(body.design);
    const qty = parseQty(body.qty);
    const country = String(body.country || "").toUpperCase();
    if (!/^[A-Z]{2}$/.test(country)) throw new Error("Choose a country.");
    const methods = ["Budget", "Standard", "Express"] as const;
    const quotes = await Promise.all(
      methods.map(async (method) => {
        try {
          const quote = await quoteOrder({
            country,
            method,
            color: spec.color,
            size: spec.size,
            copies: qty,
          });
          const shippingCents = quote.shippingCents + SHIPPING_HANDLING_CENTS;
          return {
            method,
            available: true,
            shippingCents,
            totalCents: SHIRT_CENTS * qty + shippingCents,
          };
        } catch {
          return { method, available: false, shippingCents: 0, totalCents: 0 };
        }
      }),
    );
    if (!quotes.some((q) => q.available)) {
      throw new Error("We can’t ship this shirt to that country.");
    }
    return NextResponse.json({
      shirtCents: SHIRT_CENTS,
      qty,
      quotes,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not quote shipping.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
