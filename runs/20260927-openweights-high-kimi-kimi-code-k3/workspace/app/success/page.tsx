"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function SuccessInner() {
  const params = useSearchParams();
  const ref = params.get("ref") || "";
  const [status, setStatus] = useState<any>(null);

  useEffect(() => {
    if (!ref) return;
    let tries = 0;
    const tick = async () => {
      try {
        const res = await fetch(
          `/api/order-status?ref=${encodeURIComponent(ref)}`
        );
        const json = await res.json();
        setStatus(json);
        if (!json.found && tries < 6) {
          tries++;
          setTimeout(tick, 4000);
        }
      } catch {
        /* keep last state */
      }
    };
    tick();
  }, [ref]);

  return (
    <div className="panel">
      <h1>Thank you — your sky is being printed.</h1>
      <p style={{ color: "var(--muted)", lineHeight: 1.7 }}>
        Your payment succeeded and your one-of-a-kind star map has been sent to
        our print partner. You'll receive shipping confirmation by email.
      </p>
      <div className="status-box">
        <div>
          Order reference: <strong>{ref || "—"}</strong>
        </div>
        {status ? (
          status.found ? (
            <>
              <div>
                Print order: <strong>{status.id}</strong>
              </div>
              <div>
                Status: <strong>{status.stage}</strong>
              </div>
              {status.issues?.length > 0 && (
                <div>Issues: {status.issues.join(", ")}</div>
              )}
            </>
          ) : (
            <div>Print order is being registered… (this updates automatically)</div>
          )
        ) : (
          <div>Checking print status…</div>
        )}
      </div>
      <p style={{ marginTop: 26 }}>
        <a className="link" href="/">
          ← Create another moment
        </a>
      </p>
    </div>
  );
}

export default function Success() {
  return (
    <div className="wrap">
      <header className="site">
        <a className="logo" href="/">
          STARMARK
        </a>
        <span className="tagline">Order confirmed</span>
      </header>
      <div className="narrow">
        <Suspense>
          <SuccessInner />
        </Suspense>
      </div>
    </div>
  );
}
