import Link from 'next/link';
import Tee from '@/components/Tee';
import ClearCart from './ClearCart';
import { WEBHOOK_GRACE_MS, fulfilSession } from '@/lib/fulfil';
import { isStripeConfigured, siteOrigin } from '@/lib/stripe';
import { SIZE_LABEL, getColor, getDesign, money, unitPriceCents } from '@/lib/catalog';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;
export const metadata = { title: 'Order — Last Shift' };

const STEPS: [string, string][] = [
  ['downloadAssets', 'Artwork received'],
  ['printReadyAssetsPrepared', 'Print files prepared'],
  ['allocateProductionLocation', 'Print works assigned'],
  ['inProduction', 'On the press'],
  ['shipping', 'Shipped'],
];

export default async function OrderPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id: sessionId } = await searchParams;

  if (!sessionId) {
    return (
      <Shell title="No order to show">
        <p>This page shows an order after checkout. <Link href="/#shirts" style={{ textDecoration: 'underline' }}>Back to the register</Link>.</p>
      </Shell>
    );
  }

  if (!isStripeConfigured()) {
    return <Shell title="Checkout is not configured"><div className="notice bad">STRIPE_SECRET_KEY is missing on this deployment.</div></Shell>;
  }

  let result;
  try {
    result = await fulfilSession(sessionId, siteOrigin(), {
      graceMs: process.env.STRIPE_WEBHOOK_SECRET ? WEBHOOK_GRACE_MS : 0,
    });
  } catch (e) {
    return (
      <Shell title="We could not load this order">
        <div className="notice bad">{e instanceof Error ? e.message : String(e)}</div>
        <p style={{ fontSize: 14 }}>If you were charged, email us with reference <code>{sessionId}</code> and we will sort it out.</p>
      </Shell>
    );
  }

  if (result.state === 'pending') {
    return (
      <Shell title="Payment received — booking your shift">
        <ClearCart />
        <meta httpEquiv="refresh" content="5" />
        <div className="notice">
          Paid. We are handing this to the print works now — this page refreshes itself every few
          seconds. Reference <code>{result.session.id}</code>.
        </div>
        <p style={{ fontSize: 14, color: 'var(--ink-soft)' }}>
          You can safely close this page; a confirmation email follows from Stripe either way.
        </p>
      </Shell>
    );
  }

  if (result.state === 'unpaid') {
    return (
      <Shell title="Payment not completed">
        <div className="notice">This checkout session has not been paid, so nothing has been printed.</div>
        <Link href="/cart" className="btn btn-ink">Back to cart</Link>
      </Shell>
    );
  }

  const { session, lines } = result;
  const total = session.amount_total ?? 0;
  const order = 'order' in result ? result.order : null;
  const stage = order?.status?.stage;
  const details = order?.status?.details ?? {};
  const ship =
    (session as any).collected_information?.shipping_details ?? (session as any).shipping_details ?? null;
  const addr = ship?.address ?? session.customer_details?.address ?? null;

  return (
    <Shell title="Thank you — your shift is booked">
      <ClearCart />

      {result.state === 'error' ? (
        <div className="notice bad">
          <strong>Payment succeeded, but we could not place the print order automatically.</strong>
          <div style={{ marginTop: 6 }}>{result.error}</div>
          <div style={{ marginTop: 6 }}>Reference <code>{session.id}</code>. Reload this page to retry, or contact us and we will place it by hand.</div>
        </div>
      ) : (
        <div className="notice good">
          Paid, and sent to the print works. Nothing else is needed from you.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 26 }} className="order-grid">
        <div className="order-box">
          <h3>Order</h3>
          <dl className="kv">
            <dt>Reference</dt><dd style={{ wordBreak: 'break-all' }}>{session.id}</dd>
            {order && (<><dt>Print order</dt><dd>{order.id}</dd></>)}
            <dt>Paid</dt><dd>{money(total)} {(session.currency ?? 'usd').toUpperCase()}</dd>
            <dt>Email</dt><dd>{session.customer_details?.email ?? '—'}</dd>
          </dl>
          {order && (
            <>
              <div className="eyebrow" style={{ marginTop: 18 }}>Production — {stage}</div>
              <div className="steps">
                {STEPS.map(([k, label]) => (
                  <span key={k} className={`step ${details[k] && details[k] !== 'NotStarted' ? 'on' : ''}`}>{label}</span>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="order-box">
          <h3>Shipping to</h3>
          {addr ? (
            <div style={{ fontSize: 15, lineHeight: 1.7 }}>
              {ship?.name ?? session.customer_details?.name}<br />
              {addr.line1}<br />
              {addr.line2 && <>{addr.line2}<br /></>}
              {addr.city}{addr.state ? `, ${addr.state}` : ''} {addr.postal_code}<br />
              {addr.country}
            </div>
          ) : <p>—</p>}
          <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 14 }}>
            Free shipping. Dispatch is typically 2–4 working days after printing.
          </p>
        </div>
      </div>

      <h3 className="serif" style={{ marginTop: 34, fontSize: 22 }}>Items</h3>
      {lines.map((l, i) => {
        const d = getDesign(l.slug); const c = getColor(l.color);
        if (!d || !c) return null;
        return (
          <div className="cart-line" key={i}>
            <div className="thumb"><Tee slug={l.slug} colorId={l.color} /></div>
            <div>
              <div className="card-title" style={{ fontSize: 19 }}>{d.trade}</div>
              <div className="card-meta">{c.name} · {SIZE_LABEL[l.size]} · ×{l.qty}</div>
            </div>
            <div style={{ fontVariantNumeric: 'tabular-nums' }}>{money(unitPriceCents(l.size) * l.qty)}</div>
          </div>
        );
      })}

      <div style={{ marginTop: 34 }}>
        <Link href="/#shirts" className="btn btn-ink">Back to the register</Link>
      </div>
    </Shell>
  );
}

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="wrap" style={{ padding: '48px 0 80px', maxWidth: 900 }}>
      <div className="eyebrow">Last Shift</div>
      <h1 className="serif" style={{ fontSize: 'clamp(30px,4.6vw,44px)', margin: '8px 0 22px', lineHeight: 1.1 }}>{title}</h1>
      {children}
    </div>
  );
}
