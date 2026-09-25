import { NextResponse } from 'next/server';
import { paymentMode } from '@/lib/payments';
import { fulfillOrder, newOrderRef, siteUrl } from '@/lib/fulfill';
import { artworkUrlFor } from '@/lib/fulfill';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// GET /api/selftest — diagnostics for operators. Verifies configuration and
// runs the full sandbox pipeline (including a real Prodigi sandbox order) so
// the deployment can be tested end to end without a browser.
// Remove or protect before going to production with live payments.
export async function GET() {
  const report = {
    site: siteUrl(),
    paymentMode: paymentMode(),
    env: {
      PRODIGI_API_KEY: Boolean(process.env.PRODIGI_API_KEY),
      PRODIGI_BASE: process.env.PRODIGI_BASE || null,
      SITE_URL: process.env.SITE_URL || null,
      APP_SECRET: Boolean(process.env.APP_SECRET),
      STRIPE_SECRET_KEY: Boolean(process.env.STRIPE_SECRET_KEY),
      STRIPE_WEBHOOK_SECRET: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY),
      ENABLE_SANDBOX_CHECKOUT: process.env.ENABLE_SANDBOX_CHECKOUT || null,
    },
    steps: {},
  };

  // 1. homepage renders
  try {
    const res = await fetch(`${siteUrl()}/`, { cache: 'no-store' });
    const html = await res.text();
    report.steps.homepage = { ok: res.ok, bytes: html.length, hasBrand: html.includes('SKYWRITER') };
  } catch (e) {
    report.steps.homepage = { ok: false, error: e.message };
  }

  // 2. artwork endpoint serves a PNG
  const demo = {
    v: 1, date: '2020-02-14', time: '22:00', tz: 'America/New_York',
    lat: 40.7128, lng: -74.006, place: 'SELFTEST, EARTH', msg: 'pipeline check',
    color: 'black', size: 'm', qty: 1,
  };
  try {
    const art = artworkUrlFor(demo, { full: false });
    const t = Date.now();
    const res = await fetch(art, { cache: 'no-store' });
    const buf = await res.arrayBuffer();
    report.steps.artwork = {
      ok: res.ok && res.headers.get('content-type')?.includes('image/png') && buf.byteLength > 10000,
      ms: Date.now() - t,
      bytes: buf.byteLength,
    };
  } catch (e) {
    report.steps.artwork = { ok: false, error: e.message };
  }

  // 3. full pipeline: payment-success simulation -> Prodigi sandbox order
  const ref = newOrderRef();
  try {
    const { prodigiOrderId, outcome } = await fulfillOrder({
      orderRef: ref,
      cartItems: [{ design: demo }],
      shipping: {
        name: 'Self Test', email: 'selftest@example.com',
        line1: '14 test place', city: 'somewhere', state: 'MA', zip: '12345', country: 'US',
      },
    });
    report.steps.fulfillment = { ok: true, ref, prodigiOrderId, outcome };
  } catch (e) {
    report.steps.fulfillment = { ok: false, ref, error: e.message, detail: e.data || null };
  }

  // 4. read the order back
  if (report.steps.fulfillment.ok) {
    try {
      const res = await fetch(`${siteUrl()}/api/order-status?ref=${ref}`, { cache: 'no-store' });
      const data = await res.json();
      report.steps.orderStatus = { ok: res.ok && (data.orders?.length || 0) > 0, orders: data.orders?.length || 0 };
    } catch (e) {
      report.steps.orderStatus = { ok: false, error: e.message };
    }
  }

  report.ok = Object.values(report.steps).every((s) => s.ok);
  return NextResponse.json(report);
}
