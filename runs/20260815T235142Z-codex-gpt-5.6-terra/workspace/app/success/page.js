'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
export default function Success() {
 const [state, setState] = useState('Checking your payment…');
 useEffect(() => { const id = new URLSearchParams(window.location.search).get('session_id'); if (!id) return setState('We could not find your checkout session.'); fetch(`/api/fulfill?session_id=${encodeURIComponent(id)}`).then(r => r.json()).then(d => setState(d.message || (d.orderId ? `Your order is in! Confirmation ${d.orderId}.` : 'Your payment was received.'))).catch(() => setState('Your payment was received. We’ll email your order confirmation shortly.')); }, []);
 return <main className="success"><a className="wordmark" href="/">datetime<span>.</span>store</a><div className="success-card"><div className="check">✓</div><div className="eyebrow">MOMENT CAPTURED</div><h1>That was a good<br/>time to buy a shirt.</h1><p>{state}</p><p className="fine">We’ll send a receipt and shipping updates to the email you used at checkout.</p><Link className="again" href="/">Capture another moment →</Link></div></main>
}
