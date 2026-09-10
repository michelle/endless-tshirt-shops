"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function SuccessContent() {
  const params = useSearchParams();
  const session = params.get("session_id");

  return (
    <main className="success-page">
      <div className="success-card">
        <div className="success-mark">✦</div>
        <p className="eyebrow">TRANSMISSION RECEIVED</p>
        <h1>Your coordinates are in motion.</h1>
        <p className="success-copy">
          Payment cleared. We&apos;re sending your custom artwork to the print network now. Your tee will be made
          just for you, then shipped straight to your door.
        </p>
        <div className="status-row"><span className="status-dot" /> Payment confirmed <span>→</span> Artwork queued <span>→</span> Print &amp; ship</div>
        {session && <p className="session-note">Reference: {session.slice(-12)}</p>}
        <Link className="button button-dark" href="/">Design another tee</Link>
      </div>
    </main>
  );
}

export default function SuccessPage() {
  return <Suspense fallback={<main className="success-page"><div className="success-card"><p>Loading…</p></div></main>}><SuccessContent /></Suspense>;
}
