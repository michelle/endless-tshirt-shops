// Sandbox payment gateway. Simulates an acquirer: validates the card,
// "charges" it, and — only on a successful charge — fulfills the order
// with Prodigi. Kept behind the same payment-succeeded gate as Stripe.
//
// Test cards: 4242 4242 4242 4242 (or any Luhn-valid number) succeeds;
// 4000 0000 0000 0002 is declined.

import { NextRequest, NextResponse } from "next/server";
import {
  verifyToken,
  type OrderConfig,
  type ShippingAddress,
} from "@/lib/order";
import { fulfillOrder } from "@/lib/fulfill";

export const runtime = "nodejs";
export const maxDuration = 60;

const DECLINE_CARD = "4000000000000002";

function luhnOk(num: string): boolean {
  let sum = 0;
  let dbl = false;
  for (let i = num.length - 1; i >= 0; i--) {
    let d = num.charCodeAt(i) - 48;
    if (d < 0 || d > 9) return false;
    if (dbl) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    dbl = !dbl;
  }
  return num.length >= 12 && sum % 10 === 0;
}

function validateShipping(s: unknown): ShippingAddress | null {
  if (typeof s !== "object" || s === null) return null;
  const a = s as Record<string, unknown>;
  const out: ShippingAddress = {
    name: String(a.name ?? "").trim(),
    email: String(a.email ?? "").trim(),
    line1: String(a.line1 ?? "").trim(),
    line2: String(a.line2 ?? "").trim(),
    city: String(a.city ?? "").trim(),
    state: String(a.state ?? "").trim(),
    zip: String(a.zip ?? "").trim(),
    country: String(a.country ?? "").trim().toUpperCase(),
  };
  if (out.name.length < 2) return null;
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(out.email)) return null;
  if (out.line1.length < 3) return null;
  if (out.city.length < 1) return null;
  if (out.zip.length < 3) return null;
  if (!/^[A-Z]{2}$/.test(out.country)) return null;
  return out;
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const cfg = verifyToken<OrderConfig>(String(body.token ?? ""));
  if (!cfg || !cfg.ref) {
    return NextResponse.json({ error: "invalid order token" }, { status: 403 });
  }
  const ship = validateShipping(body.shipping);
  if (!ship) {
    return NextResponse.json({ error: "invalid shipping address" }, { status: 400 });
  }

  const card = (body.card ?? {}) as Record<string, unknown>;
  const number = String(card.number ?? "").replace(/[\s-]/g, "");
  const exp = String(card.exp ?? "");
  const cvc = String(card.cvc ?? "");
  if (!luhnOk(number)) {
    return NextResponse.json({ error: "invalid card number" }, { status: 400 });
  }
  const m = /^(\d{2})\s*\/\s*(\d{2})$/.exec(exp);
  if (!m) {
    return NextResponse.json({ error: "expiry must be MM/YY" }, { status: 400 });
  }
  const expYear = 2000 + Number(m[2]);
  const expMonth = Number(m[1]);
  const now = new Date();
  if (
    expMonth < 1 ||
    expMonth > 12 ||
    expYear < now.getUTCFullYear() ||
    (expYear === now.getUTCFullYear() && expMonth < now.getUTCMonth() + 1)
  ) {
    return NextResponse.json({ error: "card is expired" }, { status: 400 });
  }
  if (!/^\d{3,4}$/.test(cvc)) {
    return NextResponse.json({ error: "invalid CVC" }, { status: 400 });
  }

  if (number === DECLINE_CARD) {
    return NextResponse.json(
      { error: "Your card was declined.", code: "card_declined" },
      { status: 402 }
    );
  }

  // Payment succeeded → fulfill.
  try {
    const order = await fulfillOrder(cfg, ship);
    return NextResponse.json({
      ok: true,
      ref: cfg.ref,
      prodigiOrderId: order.id,
      status: order.status,
    });
  } catch (e) {
    return NextResponse.json(
      { error: "payment captured but fulfillment failed — support has been notified", detail: String(e) },
      { status: 502 }
    );
  }
}
