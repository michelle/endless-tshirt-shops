'use client';

import { useEffect, useState } from 'react';

export default function SuccessState() {
  const [state, setState] = useState({ status: 'loading', orderId: '' });

  useEffect(() => {
    const paymentIntentId = new URLSearchParams(window.location.search).get('payment_intent');
    if (!paymentIntentId) {
      setState({ status: 'error', orderId: '' });
      return;
    }
    fetch('/api/fulfill', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paymentIntentId }) })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || 'Fulfillment could not be confirmed.');
        setState({ status: 'success', orderId: payload.prodigiOrderId });
      })
      .catch((error) => setState({ status: 'error', orderId: '', message: error.message }));
  }, []);

  return <main className="success-shell"><a className="wordmark" href="/">datetime<span>.</span>store</a><div className={`success-card ${state.status}`}>
    {state.status === 'loading' && <><div className="success-icon pulse">◌</div><p className="eyebrow">ONE MOMENT</p><h1>Saving your<br /><em>present.</em></h1><p>We&apos;re confirming payment and sending your timestamp to the print floor.</p></>}
    {state.status === 'success' && <><div className="success-icon">✓</div><p className="eyebrow">ORDER CONFIRMED</p><h1>See you in<br /><em>the future.</em></h1><p>Your shirt is now in the Prodigi print queue. Stripe will email your receipt shortly.</p><p className="order-reference">PRODIGI ORDER<br /><strong>{state.orderId}</strong></p><a className="back-link" href="/">MAKE ANOTHER MOMENT ↗</a></>}
    {state.status === 'error' && <><div className="success-icon">!</div><p className="eyebrow">PAYMENT RECEIVED</p><h1>Almost<br /><em>there.</em></h1><p>{state.message || 'We could not confirm fulfillment automatically. Your payment is safe; please contact support with your Stripe payment ID.'}</p><a className="back-link" href="/">BACK TO STORE ↗</a></>}
  </div><p className="success-footer">PRINTED BY PRODIGI · SECURED BY STRIPE</p></main>;
}
