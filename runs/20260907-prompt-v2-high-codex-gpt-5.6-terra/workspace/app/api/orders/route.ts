import { NextRequest, NextResponse } from "next/server";

const PRODUCTS: Record<string, { print: string; name: string }> = {
  "moon-map": { print: "moon-map.png", name: "Moon Map" },
  "moth-signal": { print: "moth-signal.png", name: "Moth Signal" },
  "last-light": { print: "last-light.png", name: "Last Light" }
};

const fields = ["name", "email", "line1", "city", "state", "postalCode", "country", "size"] as const;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || !PRODUCTS[body.productId] || fields.some(field => typeof body[field] !== "string" || !body[field].trim())) return NextResponse.json({ error: "Please complete every shipping field." }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email) || body.country.toUpperCase() !== "US" || !["s", "m", "l", "xl", "2xl"].includes(body.size)) return NextResponse.json({ error: "Use a valid email, US address, and available size." }, { status: 400 });
  const apiKey = process.env.PRODIGI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Order service has not been configured." }, { status: 503 });
  const item = PRODUCTS[body.productId];
  const forwardedHost = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
  const assetUrl = new URL(`/prints/${item.print}`, `${forwardedProto}://${forwardedHost || new URL(request.url).host}`).toString();
  const payload = {
    merchantReference: `nhc-${Date.now()}`,
    shippingMethod: "budget",
    recipient: { name: body.name.trim(), email: body.email.trim(), address: { line1: body.line1.trim(), postalOrZipCode: body.postalCode.trim(), countryCode: "US", townOrCity: body.city.trim(), stateOrCounty: body.state.trim() } },
    items: [{ merchantReference: item.name, sku: "GLOBAL-TEE-BC-3003", copies: 1, sizing: "fitPrintArea", attributes: { brand: "Bella + Canvas", edge: "Crew neck", color: "black", gender: "Men's", paperType: "100% ringspun cotton", size: body.size, style: "3003" }, assets: [{ printArea: "front", url: assetUrl }] }]
  };
  try {
    const response = await fetch(`${process.env.PRODIGI_API_BASE || "https://api.sandbox.prodigi.com/v4.0"}/orders`, { method: "POST", headers: { "Content-Type": "application/json", "X-API-Key": apiKey }, body: JSON.stringify(payload), cache: "no-store" });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.order?.id) return NextResponse.json({ error: result.message || result.errors?.[0]?.description || "Prodigi could not accept that order." }, { status: 502 });
    return NextResponse.json({ orderId: result.order.id });
  } catch { return NextResponse.json({ error: "Unable to reach the print service. Please try again." }, { status: 502 }); }
}
