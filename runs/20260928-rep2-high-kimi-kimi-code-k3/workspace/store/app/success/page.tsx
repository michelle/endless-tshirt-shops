'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

type Status = {
  paid: boolean;
  prodigiOrderId?: string;
  prodigiStatus?: string;
};

function StatusInner() {
  const sessionId = useSearchParams().get('session_id') ?? '';
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setError('No session id in the URL — this page is reached after checkout.');
      return;
    }
    let stopped = false;
    async function poll() {
      try {
        const res = await fetch(`/api/order-status?session_id=${encodeURIComponent(sessionId)}`);
        if (res.status === 404 || res.status === 400) {
          if (!stopped) setError('We could not find a paid order for this link.');
          return;
        }
        const data = (await res.json()) as Status;
        if (!stopped) {
          if (!data.paid) {
            setError('This checkout session has not been paid.');
            return;
          }
          setStatus(data);
        }
      } catch {
        // network hiccup — keep polling
      }
      if (!stopped) setTimeout(poll, 4000);
    }
    poll();
    return () => {
      stopped = true;
    };
  }, [sessionId]);

  if (error) {
    return (
      <>
        <h1>Hmm.</h1>
        <p className="sub">{error}</p>
        <a className="back-link" href="/">
          Back to the store
        </a>
      </>
    );
  }

  const sentToPrinter = Boolean(status?.prodigiOrderId);
  const printerStage = status?.prodigiStatus;

  return (
    <>
      <h1>It's yours.</h1>
      <p className="sub">
        Payment received. Your word is being composed into a one-off print file and sent to the
        printer. This page updates live.
      </p>
      <div className="timeline">
        <div className={`timeline-row ${status ? 'done' : ''}`}>
          <span className="dot" />
          Payment received
          <span className="detail">{status ? 'confirmed' : 'checking…'}</span>
        </div>
        <div className={`timeline-row ${sentToPrinter ? 'done' : ''}`}>
          <span className="dot" />
          Sent to printer
          <span className="detail">{sentToPrinter ? 'submitted' : 'pending'}</span>
        </div>
        <div className={`timeline-row ${printerStage && printerStage !== 'submitted' ? 'done' : ''}`}>
          <span className="dot" />
          Printer status
          <span className="detail">{printerStage ?? 'waiting'}</span>
        </div>
      </div>
      <a className="back-link" href="/">
        Make another
      </a>
    </>
  );
}

export default function SuccessPage() {
  return (
    <main className="status-page">
      <Suspense
        fallback={
          <>
            <h1>It's yours.</h1>
            <p className="sub">Loading your order…</p>
          </>
        }
      >
        <StatusInner />
      </Suspense>
    </main>
  );
}
