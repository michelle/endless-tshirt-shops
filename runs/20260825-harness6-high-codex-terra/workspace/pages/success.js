import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

export default function Success() {
  const router = useRouter();
  const [state, setState] = useState({ status: 'loading' });
  useEffect(() => {
    if (!router.query.session_id) return;
    fetch(`/api/fulfill?session_id=${encodeURIComponent(router.query.session_id)}`, { method: 'POST' })
      .then(async (r) => ({ ok: r.ok, data: await r.json() }))
      .then(({ ok, data }) => setState(ok ? { status: 'complete', order: data.orderId } : { status: 'issue', message: data.error }))
      .catch(() => setState({ status: 'issue', message: 'We have your payment, but could not confirm fulfillment yet.' }));
  }, [router.query.session_id]);
  return <main className="status-page">
    <Head><title>Thank you — datetime.store</title></Head>
    <div className="status-card">
      <p className="eyebrow">Payment received</p>
      <h1>Your moment is<br />on its way.</h1>
      {state.status === 'loading' && <p>Confirming your made-to-order shirt…</p>}
      {state.status === 'complete' && <><p>Congrats on your pretty cool shirt. We’ve sent your order to our print partner.</p><p className="order-reference">Order reference: {state.order}</p></>}
      {state.status === 'issue' && <p>{state.message} Please keep your Stripe receipt; our team can match it to your order.</p>}
      <Link className="return-link" href="/">← Get another shirt</Link>
    </div>
  </main>;
}
