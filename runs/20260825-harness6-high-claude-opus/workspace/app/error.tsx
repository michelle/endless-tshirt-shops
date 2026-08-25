'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[datetime.store]', error);
  }, [error]);

  return (
    <main className="shell">
      <header className="masthead">
        <h1>datetime.store</h1>
        <p>something came unstuck.</p>
      </header>
      <div className="panel" style={{ maxWidth: 520 }}>
        <div className="alert">
          The store hit an unexpected error. Nothing was charged.
          {error.digest ? (
            <div style={{ marginTop: 6, fontSize: 12 }}>Reference: {error.digest}</div>
          ) : null}
        </div>
        <button className="btn" type="button" onClick={reset}>
          Try again
        </button>
      </div>
    </main>
  );
}
