import { NextResponse } from "next/server";
import { mode } from "@/lib/config";
export async function GET() {
  return NextResponse.json(
    {
      store: "Field Notes Club",
      mode: mode(),
      checkoutConfigured: !!(
        process.env.STRIPE_SECRET_KEY &&
        process.env.STRIPE_WEBHOOK_SECRET &&
        process.env.PRODIGI_API_KEY &&
        process.env.ARTWORK_SECRET
      ),
      fulfillmentMode: process.env.PRODIGI_MODE === "live" ? "live" : "sandbox",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
