"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

type Status = {
  paid: boolean;
  paymentStatus: string;
  amountTotal: number | null;
  currency: string | null;
  customerEmail: string | null;
  prodigi: {
    id: string;
    stage: string | null;
    shipmentStatus: string[];
    tracking: { url?: string; number?: string }[];
  } | null;
};

function ConfirmInner() {
  const params = useSearchParams();
  const pi = params.get("pi") ?? "";
  const [status, setStatus] = useState<Status | null>(null);
  const reconciled = useRef(false);

  useEffect(() => {
    if (!pi) return;
    let stopped = false;

    async function poll() {
      try {
        const res = await fetch(`/api/order-status?pi=${encodeURIComponent(pi)}`);
        const data = await res.json();
        if (stopped) return;
        setStatus(data);
        if (data.paid && !data.prodigi && !reconciled.current) {
          reconciled.current = true; // one self-healing retry if the webhook was missed
          await fetch("/api/order-status", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pi }),
          });
          setTimeout(poll, 4000);
          return;
        }
        if (!data.prodigi) setTimeout(poll, 3000);
      } catch {
        if (!stopped) setTimeout(poll, 4000);
      }
    }
    poll();
    return () => { stopped = true; };
  }, [pi]);

  if (!pi) {
    return <div className="confirm-card"><h1>Missing order reference</h1><p>No payment reference supplied.</p></div>;
  }

  const paid = status?.paid;
  const prodigi = status?.prodigi;

  return (
    <div className="confirm-card">
      {!status ? (
        <>
          <div className="spin" />
          <h1>Checking your order…</h1>
        </>
      ) : (
        <>
          <span className={`status-pill ${paid ? "ok" : "err"}`}>
            {paid ? "PAYMENT RECEIVED" : `PAYMENT ${String(status.paymentStatus).toUpperCase()}`}
          </span>
          <h1>{paid ? "Thank you — your sky is being printed." : "Payment not completed"}</h1>
          {paid ? (
            <p>
              {status.customerEmail ? <>A receipt was sent to <b>{status.customerEmail}</b>.<br /></> : null}
              Your personal sky chart has been sent to our print partner.
            </p>
          ) : (
            <p>This payment was not completed. You can close this page or start a new design.</p>
          )}

          <ol className="timeline">
            <li className={paid ? "done" : ""}>Payment confirmed by Stripe</li>
            <li className={prodigi ? "done" : ""}>
              {prodigi ? `Sent to print (Prodigi order ${prodigi.id})` : "Sending to print partner…"}
            </li>
            <li className={prodigi?.stage === "Complete" ? "done" : ""}>
              Production &amp; shipping
              {prodigi?.stage ? ` — currently: ${prodigi.stage}` : ""}
            </li>
          </ol>

          {prodigi && prodigi.tracking && prodigi.tracking.length > 0 && (
            <p style={{ marginTop: 20 }}>
              {prodigi.tracking.map((t, i) => (
                <a key={i} href={t.url ?? "#"} target="_blank" rel="noreferrer" style={{ color: "#8a6a12" }}>
                  Track shipment {t.number ?? ""}
                </a>
              ))}
            </p>
          )}

          <div className="mono-block">payment: {pi}</div>
        </>
      )}
    </div>
  );
}

export default function ConfirmPage() {
  return (
    <main className="confirm-main">
      <div className="wrap">
        <Suspense fallback={<div className="confirm-card"><div className="spin" /></div>}>
          <ConfirmInner />
        </Suspense>
      </div>
    </main>
  );
}
