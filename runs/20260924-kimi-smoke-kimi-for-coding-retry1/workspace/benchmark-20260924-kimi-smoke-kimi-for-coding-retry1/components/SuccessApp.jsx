'use client';

import { useEffect, useState } from 'react';

const STAGES = [
  { key: 'payment', label: 'Payment received' },
  { key: 'created', label: 'Sent to the print lab' },
  { key: 'production', label: 'In production' },
  { key: 'shipped', label: 'Shipped' },
];

export default function SuccessApp({ mode, refId }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    let stop = false;
    async function poll() {
      try {
        const res = await fetch('/api/order-status?ref=' + encodeURIComponent(refId));
        const json = await res.json();
        if (!stop) setData(json);
      } catch (e) {
        if (!stop) setErr('Could not reach order status: ' + e.message);
      }
      if (!stop) setTimeout(poll, 8000);
    }
    poll();
    return () => { stop = true; };
  }, [refId]);

  const order = data?.orders?.[0] || null;
  const stage = !order ? 'payment' : order.stage === 'Complete' ? 'shipped' : order.details?.inProduction === 'Complete' || order.details?.inProduction === 'InProgress' ? 'production' : 'created';
  const stageIdx = STAGES.findIndex((s) => s.key === stage);
  const shipped = order?.shipments?.length > 0;

  return (
    <div className="page">
      <span className="badge">{mode === 'sandbox' ? 'Sandbox order' : 'Order confirmed'}</span>
      <h1>Thank you — your sky is on its way to the press.</h1>
      <p className="lead">
        Order reference <b style={{ color: 'var(--gold)' }}>{refId}</b>
        {order ? <> · print order <b style={{ color: 'var(--gold)' }}>{order.id}</b></> : null}.
        {mode === 'sandbox' ? ' This ran against the Prodigi sandbox, so nothing is actually printed — the full pipeline is identical to production.' : ' We’ll print and ship it as soon as the lab confirms.'}
      </p>

      <div className="statusbox">
        <h3>Status</h3>
        {STAGES.map((s, i) => (
          <div key={s.key} className={'stageline' + (i <= stageIdx ? ' done' : '')}>
            <span className="dot" />
            <span>{s.label}</span>
            {s.key === 'shipped' && shipped && order.shipments.map((sh, i) => (
              <span key={i} className="track">
                {sh.carrier} {sh.service}
                {sh.tracking ? <> · {sh.url ? <a href={sh.url} target="_blank" rel="noreferrer">{sh.tracking}</a> : sh.tracking}</> : null}
              </span>
            ))}
          </div>
        ))}
        {order?.issues?.length > 0 && (
          <div className="err" style={{ marginTop: 12 }}>
            Print lab flagged an issue: {order.issues.map((i) => i.description).join('; ')}
          </div>
        )}
        {!order && !err && <p className="hint" style={{ color: 'var(--muted)', fontSize: 13 }}>Waiting for the print lab to acknowledge… (this page refreshes itself)</p>}
        {err && <p className="hint" style={{ color: '#ffb3b3', fontSize: 13 }}>{err}</p>}
      </div>

      <p style={{ marginTop: 26 }}>
        <a className="btn" href="/">Create another sky</a>
      </p>
    </div>
  );
}
