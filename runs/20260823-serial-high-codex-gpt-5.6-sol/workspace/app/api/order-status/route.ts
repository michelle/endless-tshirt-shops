import { NextResponse } from "next/server";
import { getOrderStatus } from "@/lib/fulfillment";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const sessionId = new URL(request.url).searchParams.get("session_id");
  if (!sessionId?.startsWith("cs_")) return NextResponse.json({ error: "Invalid checkout session." }, { status: 400 });
  try {
    return NextResponse.json(await getOrderStatus(sessionId));
  } catch (error) {
    console.error("Order lookup failed", error);
    return NextResponse.json({ error: "Order could not be found." }, { status: 404 });
  }
}
