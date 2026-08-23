import { NextResponse } from "next/server";

export function GET() {
  const stripe = Boolean(process.env.STRIPE_SECRET_KEY);
  const scalablePress = Boolean(process.env.SP_AUTH);
  return NextResponse.json({
    ok: stripe && scalablePress,
    service: "datetime.store",
    integrations: { stripe, scalablePress, placesOrders: process.env.SP_PLACE_ORDERS === "true" },
    timestamp: new Date().toISOString(),
  }, { status: stripe && scalablePress ? 200 : 503 });
}
