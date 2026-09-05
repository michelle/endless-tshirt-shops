import Stripe from "stripe";
import { fulfillSession } from "../../../lib/fulfillment";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { sessionId } = await request.json();
    if (typeof sessionId !== "string" || !sessionId.startsWith("cs_")) return Response.json({ error: "Invalid checkout session." }, { status: 400 });
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) return Response.json({ error: "Stripe is not configured on this environment." }, { status: 503 });
    const stripe = new Stripe(secretKey);
    const origin = process.env.SITE_URL || new URL(request.url).origin;
    const result = await fulfillSession(stripe, sessionId, origin);
    return Response.json(result, { status: result.error ? 400 : 200 });
  } catch (error) {
    console.error("fulfillment_error", error);
    return Response.json({ error: "We couldn’t create the print order yet." }, { status: 500 });
  }
}
