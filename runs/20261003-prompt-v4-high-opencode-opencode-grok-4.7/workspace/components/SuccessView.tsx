"use client";

import { useEffect, useState } from "react";

type Result = {
  paid?: boolean;
  prodigiOrderId?: string;
  stage?: string;
  alreadyExisted?: boolean;
  issues?: string[];
  error?: string;
};

export function SuccessView({ sessionId }: { sessionId: string }) {
  const [result, setResult] = useState<Result | null>(null);
  const [working, setWorking] = useState(true);

  async function fulfill() {
    setWorking(true);
    const res = await fetch("/api/fulfill", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
    const data = await res.json();
    setResult(data);
    setWorking(false);
  }

  useEffect(() => {
    if (sessionId) fulfill();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  return (
    <div className="panel">
      <div className="success-card">
        {!sessionId && <h1>Missing payment.</h1>}
        {sessionId && working && <h1>Confirming payment…</h1>}
        {result?.error && (
          <>
            <p className="eyebrow">Payment may have succeeded</p>
            <h1>The printer didn’t take it yet.</h1>
            <p>{result.error}</p>
            <p>If the card was charged, use retry. We won’t send a second shirt — the print order is tied to this payment.</p>
            <div className="row-actions">
              <button className="primary" type="button" onClick={fulfill}>Retry print order</button>
            </div>
          </>
        )}
        {result?.paid && result.prodigiOrderId && (
          <>
            <p className="eyebrow">Paid, then sent to print</p>
            <h1>It’s kept.</h1>
            <p>Stripe confirmed the payment. Only after that did we send the shirt to Prodigi. In this test store the lab will not actually print or ship it.</p>
            <p className="mono">Print order {result.prodigiOrderId}</p>
            <p className="mono">Status {result.stage || "In progress"}</p>
            <p className="mono">Payment {sessionId}</p>
            {result.issues && result.issues.length > 0 && <p className="error">{result.issues.join(" ")}</p>}
            <div className="row-actions">
              <a className="ghost" href={`/order?session_id=${encodeURIComponent(sessionId)}`}>Refresh status</a>
              <a className="primary" href="/">Design another</a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
