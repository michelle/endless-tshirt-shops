"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ClockIcon } from "./icons";

type Status = { paid: boolean; fulfillment: string; mode: string; capturedAt?: string; style?: string; size?: string };

export function OrderConfirmation({ sessionId }: { sessionId: string }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    async function poll() {
      attempts += 1;
      const response = await fetch(`/api/order-status?session_id=${encodeURIComponent(sessionId)}`, { cache: "no-store" });
      if (response.ok && !cancelled) {
        const next = (await response.json()) as Status;
        setStatus(next);
        if (["quoted", "ordered", "failed"].includes(next.fulfillment)) return;
      }
      if (attempts < 15 && !cancelled) window.setTimeout(poll, 1800);
      else if (!cancelled) setTimedOut(true);
    }
    poll();
    return () => { cancelled = true; };
  }, [sessionId]);

  const complete = status && ["quoted", "ordered"].includes(status.fulfillment);
  return (
    <main className="confirmation-page">
      <Link className="wordmark" href="/">datetime<span>.</span>store</Link>
      <section className="confirmation-card">
        <div className="confirmation-icon"><ClockIcon size={32} /></div>
        <p className="kicker">MOMENT CAPTURED</p>
        <h1>It’s yours.<br /><em>Forever.</em></h1>
        <p>Your payment is confirmed. We’ll email your Stripe receipt and order details shortly.</p>
        <div className="order-summary">
          <span>TIMESTAMP<strong>{status?.capturedAt || "···"}</strong></span>
          <span>GARMENT<strong>{status ? `${status.style} / ${status.size}`.toUpperCase() : "···"}</strong></span>
          <span>FULFILLMENT<strong className={status?.fulfillment === "failed" ? "danger" : ""}>
            {complete ? (status.mode === "live" ? "ORDER PLACED" : "SANDBOX VERIFIED") : status?.fulfillment === "failed" ? "NEEDS ATTENTION" : timedOut ? "QUEUED" : "PREPARING…"}
          </strong></span>
        </div>
        <Link className="back-link" href="/">CAPTURE ANOTHER MOMENT →</Link>
      </section>
    </main>
  );
}
