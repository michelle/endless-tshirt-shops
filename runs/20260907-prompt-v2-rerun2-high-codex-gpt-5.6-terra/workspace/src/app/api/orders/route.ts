import { NextRequest, NextResponse } from "next/server";

const colors = new Set(["black", "natural", "navy blue"]);
const sizes = new Set(["s", "m", "l", "xl", "2xl"]);

export async function POST(request: NextRequest) {
  const key = process.env.PRODIGI_API_KEY;
  if (!key) return NextResponse.json({ error: "Ordering is not configured yet." }, { status: 503 });

  try {
    const data = await request.json();
    const required = ["name", "email", "line1", "city", "state", "zip", "country"];
    if (required.some((field) => !String(data[field] || "").trim())) {
      return NextResponse.json({ error: "Please complete every delivery field." }, { status: 400 });
    }
    const color = String(data.color || "").toLowerCase();
    const size = String(data.size || "").toLowerCase();
    const quantity = Math.max(1, Math.min(5, Number(data.quantity) || 1));
    if (!colors.has(color) || !sizes.has(size)) {
      return NextResponse.json({ error: "That size or color is unavailable." }, { status: 400 });
    }

    const origin = request.headers.get("origin") || new URL(request.url).origin;
    const line2 = String(data.line2 || "").trim();
    const payload = {
      merchantReference: `NSFC-${Date.now()}`,
      idempotencyKey: crypto.randomUUID(),
      shippingMethod: "standard",
      recipient: {
        name: String(data.name).trim(),
        email: String(data.email).trim(),
        address: {
          line1: String(data.line1).trim(),
          ...(line2 ? { line2 } : {}),
          postalOrZipCode: String(data.zip).trim(),
          countryCode: String(data.country).trim().toUpperCase(),
          townOrCity: String(data.city).trim(),
          stateOrCounty: String(data.state).trim(),
        },
      },
      items: [{
        merchantReference: "Night Shift Field Club / Nocturne Survey",
        sku: "GLOBAL-TEE-BC-3001",
        copies: quantity,
        sizing: "fitPrintArea",
        attributes: { color, size },
        recipientCost: { amount: (32 * quantity).toFixed(2), currency: "USD" },
        assets: [{ printArea: "front", url: `${origin}/night-shift-field-club.png` }],
      }],
    };
    const response = await fetch("https://api.sandbox.prodigi.com/v4.0/orders", {
      method: "POST",
      headers: { "X-API-Key": key, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    const result = await response.json();
    if (!response.ok || !["Created", "CreatedWithIssues", "OnHold", "AlreadyExists"].includes(result.outcome)) {
      return NextResponse.json({ error: result?.issues?.[0]?.description || "Prodigi could not accept this test order." }, { status: 502 });
    }
    return NextResponse.json({ id: result.order?.id || payload.merchantReference, outcome: result.outcome });
  } catch {
    return NextResponse.json({ error: "We could not submit your test order. Please try again." }, { status: 500 });
  }
}
