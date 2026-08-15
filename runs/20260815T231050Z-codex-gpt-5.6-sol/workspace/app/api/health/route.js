import { NextResponse } from "next/server";
export function GET() {
  return NextResponse.json({ ok: true, stripe: Boolean(process.env.STRIPE_SECRET_KEY), scalablePress: Boolean(process.env.SP_AUTH), fulfillmentMode: process.env.SP_SUBMIT_ORDERS === "true" ? "live" : "dry-run" });
}
