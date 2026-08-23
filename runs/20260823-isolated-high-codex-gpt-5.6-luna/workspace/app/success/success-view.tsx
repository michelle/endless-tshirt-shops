'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const shortId = sessionId ? sessionId.slice(-10).toUpperCase() : 'CONFIRMED';

  return (
    <main className="success-page">
      <div className="success-card">
        <div className="success-mark" aria-hidden="true">✦</div>
        <p className="eyebrow">order received</p>
        <h1>You&apos;re wearing the moment.</h1>
        <p className="success-copy">
          Your timestamp tee is heading to the printer. We&apos;ll send a confirmation and tracking
          link to your email when it ships.
        </p>
        <div className="order-number">
          <span>Order reference</span>
          <strong>{shortId}</strong>
        </div>
        <Link className="text-link" href="/">Back to the store <span>↗</span></Link>
      </div>
    </main>
  );
}

export default function SuccessView() {
  return <Suspense fallback={<main className="success-page" />}><SuccessContent /></Suspense>;
}
