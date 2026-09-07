'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function Confirmation() {
  const session = useSearchParams().get('session_id');
  return <main className="success"><div className="success-box"><p className="eyebrow">Order received</p><h1>Your moment is on its way.</h1><p>Payment was successful. Your timestamp has been captured and your made-to-order shirt is being prepared.</p>{session && <p className="microcopy">Confirmation: {session}</p>}<a href="/">Make another moment</a></div></main>;
}

export default function SuccessPage() {
  return <Suspense fallback={<main className="success" />}><Confirmation /></Suspense>;
}
