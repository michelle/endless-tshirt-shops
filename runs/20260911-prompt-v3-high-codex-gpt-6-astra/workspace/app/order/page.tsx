'use client';
import { useEffect, useState } from 'react';
import { artwork, Design } from '@/lib/design';
type Order = {
  payment: string;
  amount: number;
  design: Design;
  size: string;
  quantity: number;
  reference: string;
  prodigiOrderId: string | null;
  production: {
    stage: string;
    issues: number;
    shipments: {
      carrier?: string;
      trackingNumber?: string;
      trackingUrl?: string;
    }[];
  } | null;
  retry: boolean;
  sandbox: boolean;
  supportEmail: string | null;
};
export default function OrderPage() {
  const [order, setOrder] = useState<Order | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(true);
  async function refresh() {
    setBusy(true);
    try {
      const res = await fetch('/api/order' + location.search);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setOrder(data);
      setError('');
      if (data.payment === 'paid') localStorage.removeItem('ah-design');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 15000);
    return () => clearInterval(id);
  }, []);
  return (
    <>
      <header className="nav">
        <a href="/" className="brand">
          AFTER HOURS
        </a>
        <a href="/">Back to the studio ↗</a>
      </header>
      <main className="order-page">
        <p className="eyebrow">YOUR PERSONAL TOUR TEE</p>
        <h1>
          {order?.payment === 'paid' ? 'You’re on the bill.' : 'Your order.'}
        </h1>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        {!order && !error && (
          <p role="status">Checking your payment and order…</p>
        )}
        {order && (
          <>
            <p>
              {order.sandbox
                ? 'Sandbox order: no real payment is collected and no shirt will ship.'
                : 'Keep this private link to follow your order.'}
            </p>
            <section className="order-card">
              <div
                className="order-art"
                dangerouslySetInnerHTML={{ __html: artwork(order.design) }}
              />
              <p className="eyebrow">ORDER {order.reference}</p>
              <h2 style={{ fontFamily: 'AH Display', fontSize: 31 }}>
                {order.design.headline}
              </h2>
              <p>
                Black · {order.size.toUpperCase()} · Qty {order.quantity}
              </p>
              <p>Total: ${((order.amount || 0) / 100).toFixed(2)} USD</p>
              <div style={{ clear: 'both' }} />
              <div className="status-step">
                {order.payment === 'paid'
                  ? '✓ Payment confirmed'
                  : '○ Waiting for payment confirmation'}
              </div>
              <div className="status-step">
                {order.prodigiOrderId
                  ? '✓ Sent to print partner'
                  : order.payment === 'paid'
                    ? '◷ Payment received. Print submission is pending.'
                    : '○ Print order waits for payment'}
              </div>
              <div className="status-step">
                {order.production?.issues
                  ? 'Print partner reported an issue. Contact support with your order reference.'
                  : order.production
                    ? `Print partner status: ${order.production.stage}`
                    : '○ Production status will appear here'}
              </div>
              {order.production?.shipments?.map((s, i) => (
                <p key={i}>
                  {s.carrier} {s.trackingNumber}{' '}
                  {s.trackingUrl && (
                    <a href={s.trackingUrl} rel="noreferrer" target="_blank">
                      Track shipment ↗
                    </a>
                  )}
                </p>
              ))}
              {order.prodigiOrderId && (
                <p style={{ fontSize: 12, overflowWrap: 'anywhere' }}>
                  Print reference: {order.prodigiOrderId}
                </p>
              )}
            </section>
            {order.retry && (
              <p className="setup-note">
                Your payment is safe. We’re still confirming printing details.
                Refresh shortly; do not place a replacement order.
              </p>
            )}
            <p>
              {order.supportEmail ? (
                <a
                  href={`mailto:${order.supportEmail}?subject=${encodeURIComponent('Order ' + order.reference)}`}
                >
                  Contact order support
                </a>
              ) : (
                'Support contact is being configured for this sandbox store.'
              )}
            </p>
          </>
        )}
        <button className="buy-button" disabled={busy} onClick={refresh}>
          {busy ? 'Checking…' : 'Refresh order status'} ↻
        </button>
        <p style={{ fontSize: 12 }}>
          This page checks for updates every 15 seconds. Save this private link.
        </p>
      </main>
    </>
  );
}
