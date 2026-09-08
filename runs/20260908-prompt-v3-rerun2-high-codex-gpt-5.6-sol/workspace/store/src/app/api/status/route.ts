import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    store: "ok",
    payment: process.env.STRIPE_SECRET_KEY ? (process.env.STRIPE_WEBHOOK_SECRET ? "configured" : "test_checkout_only") : "setup_required",
    fulfillment: process.env.PRODIGI_API_KEY ? (process.env.PRODIGI_ENV === "live" ? "live" : "sandbox") : "setup_required",
    product: "GLOBAL-TEE-BC-3001",
  });
}
