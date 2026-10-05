"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

function SuccessInner() {
  const params = useSearchParams();
  const sessionId = params.get("session_id");
  const [result, setResult] = useState(null);
  const [working, setWorking] = useState(true);

  async function fulfill() {
    setWorking(true);
    try {
      const res = await fetch("/api/fulfill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      setResult(await res.json());
    } catch (err) {
      setResult({ status: "error", message: err.message });
    } finally {
      setWorking(false);
    }
  }

  useEffect(() => {
    if (sessionId) fulfill();
    else setWorking(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  return (
    <main className="success">
      <p className="eyebrow">Order</p>
      {working && <h1>Confirming payment…</h1>}
      {!working && result?.status === "printed" && (
        <>
          <h1>It’s going to print.</h1>
          <p className="lede">{result.message} This sandbox will not actually manufacture or ship the shirt.</p>
          <div className="card">
            <p><strong>{result.summary?.title}</strong></p>
            <p className="note">
              {result.summary?.place} · {result.summary?.date} {result.summary?.time}<br />
              {result.summary?.color} / {result.summary?.size} · qty {result.summary?.qty}
            </p>
            <p>Ship to {result.shipTo?.name}, {result.shipTo?.city}, {result.shipTo?.country}</p>
            <p>Prodigi order <code>{result.prodigiOrderId}</code> · {result.stage}</p>
            {result.artworkUrl && <p><a href={result.artworkUrl}>View the print file</a></p>}
          </div>
        </>
      )}
      {!working && result?.status === "unpaid" && (
        <>
          <h1>Payment isn’t complete.</h1>
          <p>{result.message}</p>
          <a className="btn" href="/create">Back to the shirt</a>
        </>
      )}
      {!working && result?.status === "error" && (
        <>
          <h1>Payment landed. Print did not.</h1>
          <p>{result.message}</p>
          {result.issues && <pre className="note">{JSON.stringify(result.issues, null, 2)}</pre>}
          <button className="btn" type="button" onClick={fulfill}>Try sending to print again</button>
        </>
      )}
      {!working && !result && (
        <>
          <h1>No checkout session.</h1>
          <a className="btn" href="/create">Make a shirt</a>
        </>
      )}
    </main>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<main className="success"><h1>Confirming payment…</h1></main>}>
      <SuccessInner />
    </Suspense>
  );
}
