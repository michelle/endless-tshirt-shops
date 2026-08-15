"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

function Receipt() {
  const params = useSearchParams();
  const [result, setResult] = useState({ loading: true });
  useEffect(() => {
    const sessionId = params.get("session_id");
    if (!sessionId) return setResult({ error: "This receipt link is incomplete." });
    fetch("/api/fulfill", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId }) })
      .then(async r => ({ ok: r.ok, ...(await r.json()) }))
      .then(data => setResult(data.ok ? data : { error: data.error || "We could not prepare fulfillment." }))
      .catch(() => setResult({ error: "We could not reach fulfillment. Your payment receipt is still safe with Stripe." }));
  }, [params]);
  return <main className="success-page"><a className="brand" href="/">datetime.store</a><div className="success-card"><div className="check">✓</div><p className="eyebrow">Payment received</p><h1>Your moment is<br/><em>officially yours.</em></h1>{result.loading ? <p className="status">Preparing your print file and checking fulfillment…</p> : result.error ? <><p className="status error">{result.error}</p><p>Your Stripe payment is complete. Keep this page and contact the store operator before launch fulfillment.</p></> : <><div className="receipt-moment">{result.timestamp}</div><p className="status">{result.dryRun ? "Your print file and production quote were verified in the Scalable Press sandbox." : `Sent to production${result.orderId ? ` · ${result.orderId}` : ""}.`}</p><p>A receipt is on its way to your email. This demo keeps physical production in safe dry-run mode.</p></>}<a className="text-link" href="/">Capture another moment →</a></div></main>;
}

export default function Success() { return <Suspense fallback={<main className="success-page">Loading…</main>}><Receipt/></Suspense>; }
