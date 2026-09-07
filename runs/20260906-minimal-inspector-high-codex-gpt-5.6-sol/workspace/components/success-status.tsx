"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type OrderState = {
  status: "checking" | "confirmed" | "processing" | "invalid";
  orderId?: string;
  timestamp?: string;
  fit?: string;
  size?: string;
};

export default function SuccessStatus({ sessionId }: { sessionId: string | null }) {
  const [order, setOrder] = useState<OrderState>({ status: sessionId ? "checking" : "invalid" });

  useEffect(() => {
    if (!sessionId) return;

    let cancelled = false;
    let attempts = 0;

    async function check() {
      try {
        const response = await fetch(`/api/order-status?session_id=${encodeURIComponent(sessionId!)}`, { cache: "no-store" });
        const data = (await response.json()) as OrderState;
        if (cancelled) return;
        if (data.status === "confirmed") {
          setOrder(data);
          return;
        }
        setOrder({ status: data.status === "invalid" ? "invalid" : "processing" });
      } catch {
        if (!cancelled) setOrder({ status: "processing" });
      }

      attempts += 1;
      if (!cancelled && attempts < 12) window.setTimeout(check, 2500);
    }

    check();
    return () => { cancelled = true; };
  }, [sessionId]);

  const confirmed = order.status === "confirmed";
  const invalid = order.status === "invalid";

  return (
    <main className="success-page">
      <Link className="wordmark" href="/">datetime.store</Link>
      <section className="success-card">
        <div className={`success-mark ${confirmed ? "done" : ""}`} aria-hidden="true">
          {confirmed ? "✓" : invalid ? "!" : <span />}
        </div>
        <p className="eyebrow">{confirmed ? "MOMENT CAPTURED" : invalid ? "ORDER NOT FOUND" : "PAYMENT RECEIVED"}</p>
        <h1>{confirmed ? "This moment is yours." : invalid ? "We couldn’t find that order." : "We’re preparing your shirt."}</h1>
        <p className="success-copy">
          {confirmed
            ? "Your custom artwork reached our print partner. Keep the reference below for your records."
            : invalid
              ? "Use the link from your Stripe receipt, or return to the store to begin again."
              : "The payment is complete. We’re securely handing the frozen timestamp to our print partner now."}
        </p>

        {confirmed && (
          <dl className="order-details">
            <div><dt>Datetime</dt><dd>{order.timestamp}</dd></div>
            <div><dt>Shirt</dt><dd>{order.fit} / {order.size}</dd></div>
            <div><dt>Prodigi order</dt><dd>{order.orderId}</dd></div>
          </dl>
        )}

        {!confirmed && !invalid && <p className="processing-note"><span /> This can take a few seconds. You can safely leave this page.</p>}
        <Link className="back-link" href="/">{confirmed ? "Capture another moment" : "Return to the store"} <span aria-hidden="true">→</span></Link>
      </section>
      <p className="test-mode success-test"><span /> TEST MODE — NO REAL CHARGE OR SHIPMENT</p>
    </main>
  );
}
