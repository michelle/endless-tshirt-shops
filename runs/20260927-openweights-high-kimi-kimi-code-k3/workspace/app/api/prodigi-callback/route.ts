import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Receives Prodigi order status callbacks. */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  console.log("Prodigi callback:", JSON.stringify(body)?.slice(0, 1000));
  return NextResponse.json({ received: true });
}
