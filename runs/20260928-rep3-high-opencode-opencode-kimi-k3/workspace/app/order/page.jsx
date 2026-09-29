'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { money } from '../../lib/design';

function OrderStatus() {
  const sessionId = useSearchParams().get('session_id');
  const [state, setState] = useState({ loading: true });

  useEffect(() => {
    if (!sessionId) { setState({ loading: false, error: 'Missing session id.' }); return; }
    let live = true;
    let tries = 0;
    const poll = async () => {
      try {
        const res = await fetch(`/api/order/status?session_id=${encodeURIComponent(sessionId)}`);
        const json = await res.json();
        if (!live) return;
        setState({ loading: false, data: json, error: json.error });
        // keep polling while paid but not yet fulfilled (webhook may land first)
        if (json.paid && !json.fulfillment?.fulfilled && tries < 8) {
          tries += 1;
          setTimeout(poll, 3000);
        }
      } catch (e) {
        if (live) setState({ loading: false, error: e.message });
      }
    };
    poll();
    return () => { live = false; };
  }, [sessionId]);

  if (state.loading) {
    return <div className="narrow muted">Verifying your payment…</div>;
  }
  if (state.error) {
    return (
      <div className="narrow">
        <div className="error-box">{state.error}</div>
        <p className="muted" style={{ marginTop: 16 }}>If you completed payment, your order is safe — contact support with your receipt email.</p>
      </div>
    );
  }

  const d = state.data;
  if (!d?.paid) {
    return (
      <div className="narrow">
        <h1 className="serif" style={{ fontSize: 34 }}>Payment not completed</h1>
        <p className="muted" style={{ margin: '12px 0 20px' }}>This checkout session isn’t paid yet. If you meant to finish it, start again — your card was not charged.</p>
        <a className="btn" href="/create">Back to the studio</a>
      </div>
    );
  }

  const f = d.fulfillment;
  return (
    <div className="narrow">
      <div className="eyebrow">Order confirmed</div>
      <h1 className="serif" style={{ fontSize: 40, fontWeight: 500 }}>Your sky is going to print ✦</h1>
      <p className="muted" style={{ marginTop: 12 }}>
        Thank you{ d.email ? ` — a receipt is on its way to ${d.email}` : '' }.
      </p>

      <div className="order-summary" style={{ marginTop: 26 }}>
        <div>
          <div className="serif" style={{ fontSize: 21 }}>“{d.design?.line1 || 'Written in the Stars'}”</div>
          <div className="muted small">{d.design?.when} · {d.design?.place}</div>
          <div className="muted small">Color {d.design?.color} · size {d.design?.size}</div>
          <div className="muted small" style={{ marginTop: 6 }}>Ships to: {d.shipTo}</div>
          <div className="muted small">Charged: {d.amountTotal != null ? money(d.amountTotal, (d.currency || 'usd').toUpperCase()) : '—'}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          {f?.fulfilled ? (
            <div className="ok-box">
              Sent to the print lab{f.prodigiOrderId ? <> — order <span className="mono">{f.prodigiOrderId}</span></> : null}
              {f.stage ? <div className="small" style={{ marginTop: 4 }}>Status: {f.stage}</div> : null}
            </div>
          ) : (
            <div className="ok-box" style={{ borderColor: 'rgba(212,175,110,.4)', color: 'var(--gold)', background: 'rgba(212,175,110,.08)' }}>
              Payment received — queueing print…
              {f?.error ? <div className="small" style={{ marginTop: 4 }}>Note: {f.error}</div> : null}
            </div>
          )}
        </div>
      </div>

      <h2 className="serif" style={{ fontSize: 24, marginTop: 34 }}>What happens next</h2>
      <div className="facts" style={{ marginTop: 14 }}>
        <div className="fact"><span className="tick">1.</span><span>Your artwork is rendered at 300 DPI and sent to the print lab.</span></div>
        <div className="fact"><span className="tick">2.</span><span>Printed on your Bella + Canvas 3001 with soft DTG inks (2–4 days).</span></div>
        <div className="fact"><span className="tick">3.</span><span>Shipped worldwide with tracking — Standard service.</span></div>
        <div className="fact"><span className="tick">4.</span><span>Wear the exact sky from your moment. It’s one of one.</span></div>
      </div>

      <p className="hint" style={{ marginTop: 26 }}>
        Questions? Reply to your receipt. Keep your order link — it shows live status.
      </p>
      <div style={{ marginTop: 22 }}>
        <a className="btn btn-ghost" href="/create">Make another sky</a>
      </div>
    </div>
  );
}

export default function OrderPage() {
  return (
    <Suspense>
      <OrderStatus />
    </Suspense>
  );
}
