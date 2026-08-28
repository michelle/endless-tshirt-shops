'use client';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function Confirmation() {
  const id = useSearchParams().get('session_id');
  return <main className="success-page"><a className="brand" href="/">datetime.store</a><div className="success-card"><p className="eyebrow">Moment captured</p><h1>It’s officially yours.</h1><p>Thanks for making a very precise piece of clothing. We’ve received your order and Stripe will email your receipt. Your made-to-order tee is now headed into production.</p>{id && <p className="session">Order reference: {id}</p>}<a href="/" className="back">Make another moment →</a></div></main>;
}

export default function Success() {
  return <Suspense><Confirmation /></Suspense>;
}
