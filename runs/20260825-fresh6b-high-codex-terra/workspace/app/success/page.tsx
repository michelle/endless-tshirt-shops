'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function Success() {
  const [status, setStatus] = useState<'loading'|'done'|'error'>('loading');
  const [message, setMessage] = useState('Verifying your payment and starting production…');
  useEffect(() => { const sessionId = new URLSearchParams(location.search).get('session_id'); if (!sessionId) { setStatus('error'); setMessage('We could not find your checkout session.'); return; }
    fetch('/api/fulfill', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({sessionId})}).then(async r => { const data = await r.json(); if (!r.ok) throw new Error(data.error); setStatus('done'); setMessage(data.alreadyFulfilled ? 'Your order was already sent to production.' : 'Your one-off timestamp has been sent to production.'); }).catch(e => { setStatus('error'); setMessage(e.message || 'Your payment was received, but fulfillment needs attention.'); }); }, []);
  return <main className="success-page"><a className="wordmark" href="/">datetime<span>.store</span></a><section><p className="eyebrow">{status === 'done' ? 'TIME CAPTURED' : 'ONE MOMENT'}</p><h1>{status === 'done' ? 'It’s on its way.' : 'Almost there.'}</h1><p>{message}</p>{status === 'loading' && <div className="loader" />}{status === 'done' && <p className="success-small">A receipt has been emailed by Stripe. We’ll use the checkout address to make and ship your shirt.</p>}{status === 'error' && <p className="success-small">Please keep your receipt and contact support with the session ID in its URL.</p>}<Link className="back-link" href="/">← Make another moment</Link></section></main>;
}
