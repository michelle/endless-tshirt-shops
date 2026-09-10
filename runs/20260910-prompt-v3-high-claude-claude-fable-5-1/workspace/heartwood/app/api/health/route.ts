import { NextResponse } from "next/server";
import { prodigiIsSandbox } from "@/lib/prodigi";
import { siteUrl } from "@/lib/stripe";

export async function GET() {
  const key = process.env.STRIPE_SECRET_KEY ?? "";
  return NextResponse.json({
    ok: true,
    siteUrl: siteUrl(),
    stripe: key ? (key.includes("_test_") ? "test" : "live") : "missing",
    stripeWebhook: process.env.STRIPE_WEBHOOK_SECRET ? "configured" : "missing",
    prodigi: process.env.PRODIGI_API_KEY ? (prodigiIsSandbox() ? "sandbox" : "live") : "missing",
    designSecret: process.env.DESIGN_SECRET ? "configured" : "missing",
  });
}
