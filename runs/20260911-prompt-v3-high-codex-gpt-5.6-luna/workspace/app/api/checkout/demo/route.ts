import { NextRequest, NextResponse } from "next/server";
import { createDemoFulfillment } from "../../../../lib/fulfillment";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (process.env.STRIPE_SECRET_KEY) return NextResponse.json({ error: "Demo checkout is disabled while Stripe is configured." }, { status: 400 });
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim();
    const recipient = body.recipient;
    if (!name || !email || !recipient?.address?.line1 || !recipient?.address?.townOrCity || !recipient?.address?.postalOrZipCode) return NextResponse.json({ error: "Complete the sandbox shipping form first." }, { status: 400 });
    const order = await createDemoFulfillment({ design: body.design ?? {}, origin: request.nextUrl.origin, email, recipient: { name, address: recipient.address } });
    return NextResponse.json({ ok: true, orderId: order?.id ?? null, order });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Sandbox fulfillment failed." }, { status: 400 });
  }
}
