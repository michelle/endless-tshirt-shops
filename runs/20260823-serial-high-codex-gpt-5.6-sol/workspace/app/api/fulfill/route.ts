import { NextResponse } from "next/server";
import { z } from "zod";
import { fulfillCheckoutSession } from "@/lib/fulfillment";

export const runtime = "nodejs";
export const maxDuration = 60;

const schema = z.object({ sessionId: z.string().startsWith("cs_").max(255) });

export async function POST(request: Request) {
  try {
    const { sessionId } = schema.parse(await request.json());
    const result = await fulfillCheckoutSession(sessionId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Fulfillment failed", error);
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Invalid checkout session." }, { status: 400 });
    return NextResponse.json({ error: "Your payment is safe, but fulfillment needs attention. Please contact support." }, { status: 500 });
  }
}
