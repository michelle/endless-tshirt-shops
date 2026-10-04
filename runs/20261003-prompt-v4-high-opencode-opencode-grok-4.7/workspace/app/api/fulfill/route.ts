import { NextResponse } from "next/server";
import { fulfillSession, originFrom } from "@/lib/fulfill";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const sessionId = String(body.sessionId || "");
    if (!sessionId.startsWith("cs_")) throw new Error("Missing checkout session.");
    const result = await fulfillSession(sessionId, originFrom(req));
    if (!result.paid) {
      return NextResponse.json({ error: "Payment has not completed. The shirt was not sent to print." }, { status: 402 });
    }
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not send the shirt to print.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
