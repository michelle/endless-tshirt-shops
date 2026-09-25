import { NextResponse } from 'next/server';
import { paymentMode } from '@/lib/payments';
import { fulfillOrder, newOrderRef } from '@/lib/fulfill';
import { normalizeDesign } from '@/lib/scene';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Sandbox payment fallback (demo only, requires ENABLE_SANDBOX_CHECKOUT=true).
// Simulates a successful payment and fulfills in the same request so the whole
// pipeline — including the Prodigi order — can be exercised end to end without
// Stripe keys. Never enable in production.
export async function POST(req) {
  if (paymentMode() !== 'sandbox') {
    return NextResponse.json({ error: 'sandbox checkout disabled' }, { status: 403 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const rawItems = Array.isArray(body.items) ? body.items.slice(0, 20) : [];
  if (rawItems.length === 0) return NextResponse.json({ error: 'cart is empty' }, { status: 400 });

  let cartItems;
  try {
    cartItems = rawItems.map((i) => ({ design: normalizeDesign(i.design || {}) }));
  } catch (e) {
    return NextResponse.json({ error: 'invalid design: ' + e.message }, { status: 400 });
  }

  const s = body.shipping || {};
  const shipping = {
    name: String(s.name || '').slice(0, 80),
    email: String(s.email || '').slice(0, 120),
    line1: String(s.line1 || '').slice(0, 120),
    line2: String(s.line2 || '').slice(0, 120),
    city: String(s.city || '').slice(0, 80),
    state: String(s.state || '').slice(0, 80),
    zip: String(s.zip || '').slice(0, 20),
    country: String(s.country || 'US').slice(0, 2).toUpperCase(),
  };
  if (!shipping.name || !shipping.line1 || !shipping.city || !shipping.zip) {
    return NextResponse.json({ error: 'shipping address incomplete' }, { status: 400 });
  }

  const ref = newOrderRef();
  try {
    const { prodigiOrderId, outcome } = await fulfillOrder({ orderRef: ref, cartItems, shipping });
    return NextResponse.json({ ok: true, mode: 'sandbox', ref, prodigiOrderId, outcome });
  } catch (e) {
    console.error('sandbox fulfillment failed', e);
    return NextResponse.json({ error: 'fulfillment failed: ' + e.message }, { status: 502 });
  }
}
