import { NextRequest, NextResponse } from "next/server";

// Prodigi retries callbacks on non-2xx responses. Persist these events to your order
// database when adding customer-facing tracking; acknowledge them immediately here.
export async function POST(request: NextRequest) {
  const event = await request.json().catch(() => null);
  console.info("prodigi callback", event?.type, event?.subject);
  return NextResponse.json({ received: true });
}
