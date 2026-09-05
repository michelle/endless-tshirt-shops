import { NextResponse } from "next/server";
import { prodigiIsSandbox } from "@/lib/prodigi";
import { PRICE_CENTS, SHIP_COUNTRIES } from "@/lib/products";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    stripe: {
      configured: Boolean(process.env.STRIPE_SECRET_KEY && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY),
      mode: process.env.STRIPE_SECRET_KEY?.includes("_test_") ? "test" : process.env.STRIPE_SECRET_KEY ? "live" : null,
      webhook: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
    },
    prodigi: { configured: Boolean(process.env.PRODIGI_API_KEY), env: prodigiIsSandbox() ? "sandbox" : "live" },
    priceCents: PRICE_CENTS,
    shipCountries: SHIP_COUNTRIES,
  });
}
