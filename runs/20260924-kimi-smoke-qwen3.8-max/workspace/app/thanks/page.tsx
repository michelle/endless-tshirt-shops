'use client';

import { Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { encodeDesign, formatCoord, garmentColor, PALETTES, sizeLabel } from '@/lib/design';
import { countryName, formatCents } from '@/lib/pricing';

type DisplayOrder = {
  orderId: string;
  design: { lat: number; lon: number; radiusKm: number; label: string; caption: string; date: string; palette: string };
  product: { color: string; size: string; qty: number };
  shipping: { name: string; email: string; city: string; country: string; zip: string };
  pricing: { itemsCents: number; shippingCents: number; totalCents: number };
};

function decodePayload(token: string): DisplayOrder | null {
  try {
    const payload = token.slice(0, token.lastIndexOf('.'));
    const std = payload.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (payload.length % 4)) % 4);
    return JSON.parse(atob(std)) as DisplayOrder;
  } catch {
    return null;
  }
}

export default function ThanksPage() {
  return (
    <Suspense fallback={<Header compact />}>
      <ThanksInner />
    </Suspense>
  );
}

function ThanksInner() {
  const params = useSearchParams();
  const token = params.get('t') ?? '';
  const ref = params.get('ref') ?? '';
  const mode = params.get('mode') ?? 'testpay';
  const sessionId = params.get('session_id') ?? '';

  const order = useMemo(() => (token ? decodePayload(token) : null), [token]);

  return (
    <>
      <Header compact />
      <main className="container thanks">
        <div className="check" aria-hidden="true">✓</div>
        <h1>Payment received.</h1>
        <p className="sub">
          {order
            ? `Your one-of-one topographic portrait is on its way into production.`
            : `Thank you — your order is confirmed.`}
        </p>

        {order && (
          <div className="panel thanks-card">
            <div className="field-label">
              <span>Order {order.orderId}</span>
              <span className="hint">{mode === 'stripe' ? 'paid via Stripe' : 'paid via sandbox TestPay'}</span>
            </div>
            <div style={{ display: 'flex', gap: 18, alignItems: 'center', marginTop: 6 }}>
              <div style={{ width: 96, borderRadius: 8, overflow: 'hidden', background: garmentColor(order.product.color)?.tone === 'dark' ? '#23201b' : '#efe9db' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/render?d=${encodeURIComponent(encodeDesign(order.design as never))}&w=400`}
                  alt={order.design.label}
                  width={96}
                />
              </div>
              <div>
                <strong style={{ fontSize: 18 }}>{order.design.label}</strong>
                <p className="tiny mono" style={{ marginTop: 2 }}>
                  {formatCoord(order.design.lat, order.design.lon)} · {order.design.radiusKm} km ·{' '}
                  {PALETTES[order.design.palette as keyof typeof PALETTES]?.name ?? order.design.palette} ink
                </p>
                <p className="tiny" style={{ marginTop: 2 }}>
                  Bella+Canvas 3001 · {garmentColor(order.product.color)?.name ?? order.product.color} · size{' '}
                  {sizeLabel(order.product.size)} · ×{order.product.qty}
                </p>
              </div>
            </div>
            <div className="summary-rows" style={{ marginTop: 14 }}>
              <div className="row">
                <span className="k">Ship to</span>
                <span>{order.shipping.name}, {order.shipping.city}, {countryName(order.shipping.country)} {order.shipping.zip}</span>
              </div>
              <div className="row">
                <span className="k">Confirmation sent to</span>
                <span>{order.shipping.email}</span>
              </div>
              {ref && (
                <div className="row">
                  <span className="k">Print-lab reference</span>
                  <span className="mono">{ref}</span>
                </div>
              )}
              {sessionId && !ref && (
                <div className="row">
                  <span className="k">Stripe session</span>
                  <span className="mono">{sessionId.slice(0, 28)}…</span>
                </div>
              )}
              <div className="row total">
                <span>Paid</span>
                <span>{formatCents(order.pricing.totalCents)}</span>
              </div>
            </div>
          </div>
        )}

        <div className="panel thanks-card">
          <div className="field-label"><span>What happens next</span></div>
          <div className="timeline">
            <div className="t-step">
              <span className="t-no">01</span>
              <span>
                Payment captured
                <span className="done">✓ done</span>
              </span>
            </div>
            <div className="t-step">
              <span className="t-no">02</span>
              <span>
                Your 300-DPI artwork was sent to the print network (Prodigi) the moment payment
                succeeded — never before.
                <span className="done">✓ {ref ? `order ${ref} created` : 'done'}</span>
              </span>
            </div>
            <div className="t-step">
              <span className="t-no">03</span>
              <span>DTG printing on your Bella+Canvas 3001 — typically 2–5 business days.</span>
            </div>
            <div className="t-step">
              <span className="t-no">04</span>
              <span>Shipped to your door, with tracking to follow.</span>
            </div>
          </div>
          <p className="tiny">
            Sandbox note: this deployment runs against Prodigi&rsquo;s <em>test lab</em> and{' '}
            {mode === 'stripe' ? 'Stripe test mode' : 'simulated payments'} — the order is real in
            every software sense, but no physical shirt will arrive.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/design" className="btn btn-accent">Design another</Link>
          <Link href="/" className="btn btn-ghost">Back to the shop</Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
