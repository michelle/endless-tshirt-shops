'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/** Retry button shown when fulfilment failed after a successful payment. */
export function RetryFulfill({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function retry() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/fulfill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId }),
      });
      const body = await res.json();
      if (!res.ok || body.state === 'failed') {
        setError(body.error ?? 'Still failing — please try again shortly.');
        setBusy(false);
        return;
      }
      router.refresh();
    } catch {
      setError('Network error — please try again.');
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={retry}
        disabled={busy}
        className="rounded-xl bg-moonlight px-6 py-3 font-semibold text-night-950 transition hover:bg-white disabled:opacity-50"
      >
        {busy ? 'Sending to the press…' : 'Retry sending to print'}
      </button>
      {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
    </div>
  );
}
