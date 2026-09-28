// Demo payment endpoint used when STRIPE_SECRET_KEY isn't configured.
// In sandbox demos the harness usually runs without a Stripe credential,
// so we provide a stand-in "approved / declined" experience that runs the
// exact same fulfillment pipeline as the real webhook would.
//
// Using this endpoint demonstrates the full pricing → payout → print flow
// (with Prodigi sandbox) without any real money or any browser interaction.

import { NextResponse } from "next/server";
import { fulfillPaidOrder } from "@/lib/fulfill";
import { verify } from "@/lib/tokens";
import type { Customization } from "@/lib/render";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const form = await req.formData();
  const token = String(form.get("token") || "");
  const decision = String(form.get("decision") || "approve");

  const customization = verify<Customization>(token);
  if (!customization) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  if (decision === "decline") {
    return NextResponse.redirect(new URL("/?canceled=1", req.url), 303);
  }

  // The recipient is supplied through the demo form (no Stripe to collect it).
  const recipient = {
    name: String(form.get("name") || "Demo Buyer"),
    email: String(form.get("email") || "demo@example.com") || undefined,
    phone: undefined as string | undefined,
    address: {
      line1: String(form.get("line1") || "350 Fifth Ave"),
      line2: undefined as string | undefined,
      city: String(form.get("city") || "New York"),
      state: String(form.get("state") || "NY"),
      postalCode: String(form.get("postal") || "10118"),
      country: String(form.get("country") || "US"),
    },
  };

  const sessionId = `demo_${token.slice(0, 24)}_${Date.now().toString(36)}`;
  const callbackUrl = baseUrl(req) + "/api/order-status";

  try {
    const result = await fulfillPaidOrder({
      customization,
      recipient,
      stripeSessionId: sessionId,
      callbackUrl,
    }, { baseUrlOverride: baseUrl(req) });
    const url = new URL("/success", baseUrl(req));
    url.searchParams.set("session_id", sessionId);
    url.searchParams.set("order_id", result.order?.id || "");
    url.searchParams.set("demo", "1");
    return NextResponse.redirect(url, 303);
  } catch (err) {
    return NextResponse.json(
      { error: `Prodigi creation failed: ${(err as Error).message}` },
      { status: 502 },
    );
  }
}

function baseUrl(req: Request) {
  const env = process.env.NEXT_PUBLIC_BASE_URL;
  if (env) return env;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return new URL(req.url).origin;
}
