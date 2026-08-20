'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
export default function Success() {
  const sessionId = useSearchParams().get('session_id');
  const [state, setState] = useState({ status: 'working' });
  useEffect(() => {
    if (!sessionId) { setState({ status: 'error', message: 'This confirmation link is incomplete.' }); return; }
    let active = true;
    fetch('/api/fulfill', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sessionId }) })
      .then(async response => ({ ok: response.ok, data: await response.json() }))
      .then(({ ok, data }) => active && setState(ok ? { status: 'done', fulfillmentStatus: data.status, orderId: data.orderId } : { status: 'error', message: data.error }))
      .catch(() => active && setState({ status: 'error', message: 'We could not load fulfillment status.' }));
    return () => { active = false; };
  }, [sessionId]);
  return <main className="success-page"><a className="wordmark" href="/">datetime<span>.store</span></a><section className="success-card">
    {state.status === 'working' && <><div className="success-mark working">⌛</div><div className="eyebrow">PAYMENT RECEIVED</div><h1>Printing your moment…</h1><p>We’re preparing the timestamp artwork and sending it to our print partner.</p></>}
    {state.status === 'done' && <><div className="success-mark">✓</div><div className="eyebrow">MOMENT SECURED</div><h1>It’s officially yours.</h1><p>{state.fulfillmentStatus === 'review' ? 'Your artwork is staged with our print partner for manual order review. Stripe has emailed your receipt.' : 'Your one-of-one shirt is in the production queue. Stripe has emailed your receipt.'}</p><div className="order-ref">FULFILLMENT REF<br/><strong>{state.orderId}</strong></div></>}
    {state.status === 'error' && <><div className="success-mark error-mark">!</div><div className="eyebrow">PAYMENT RECEIVED</div><h1>Your order needs a hand.</h1><p>{state.message} Your Stripe receipt is proof of purchase; contact <a href="mailto:hello@datetime.store">hello@datetime.store</a>.</p></>}
    <a className="back-link" href="/">← Make another moment</a>
  </section></main>;
}
