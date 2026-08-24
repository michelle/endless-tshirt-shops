import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { fulfillCheckoutSession } from "@/lib/fulfill";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const sessionId = searchParams.get("session_id");

  if (!sessionId || !sessionId.startsWith("cs_")) {
    return NextResponse.json({ status: "error", message: "Missing or invalid session_id." }, { status: 400 });
  }

  try {
    const session = await stripe().checkout.sessions.retrieve(sessionId);
    const result = await fulfillCheckoutSession(session, origin);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Failed to fulfill session", err);
    return NextResponse.json({ status: "error", message: "Could not look up this order." }, { status: 500 });
  }
}
