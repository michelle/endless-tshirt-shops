import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

export default function Success() {
  const router = useRouter();
  const [state, setState] = useState({ status: 'loading' });
  useEffect(() => {
    if (!router.isReady) return;
    const id = router.query.session_id;
    if (!id || typeof id !== 'string') { setState({ status: 'error', message: 'That checkout session is missing.' }); return; }
    fetch(`/api/order-status?session_id=${encodeURIComponent(id)}`)
      .then(async (res) => { const data = await res.json(); if (!res.ok) throw new Error(data.error || 'Could not verify your order.'); return data; })
      .then(setState)
      .catch((err) => setState({ status: 'error', message: err.message }));
  }, [router.isReady, router.query.session_id]);

  const ready = state.status === 'fulfilled' || state.status === 'dry_run';
  return <><Head><title>Order confirmed — datetime.store</title></Head><main className="success-page"><div className="success-mark">✓</div>
    {state.status === 'loading' && <><p className="eyebrow">Payment received</p><h1>Preparing your timestamp…</h1><p>We’re sending your order to the printer.</p></>}
    {ready && <><p className="eyebrow">Order confirmed</p><h1>That moment is yours.</h1><p>Your datetime shirt is now in production. We sent a receipt to <strong>{state.email}</strong>.</p>{state.orderId && <p className="order-ref">Print order {state.orderId}</p>}<Link className="buy back" href="/">Get another shirt</Link></>}
    {state.status === 'processing' && <><p className="eyebrow">Payment received</p><h1>Your order is being prepared.</h1><p>It may take a minute to reach the printer. Your receipt has been emailed.</p><Link className="buy back" href="/">Return to the shop</Link></>}
    {state.status === 'error' && <><p className="eyebrow">Payment received</p><h1>We’re checking on your order.</h1><p>{state.message} Please keep your receipt; no further action is needed right now.</p><Link className="buy back" href="/">Return to the shop</Link></>}
  </main></>;
}
