"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

type OrderState = {
  status: "checking" | "confirmed" | "payment_pending" | "fulfillment_pending" | "error";
  orderId?: string;
  timestamp?: string;
  email?: string;
  message?: string;
};

function OrderConfirmation() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [order, setOrder] = useState<OrderState>({ status: "checking" });

  useEffect(() => {
    if (!sessionId) return;

    let canceled = false;
    let attempts = 0;

    async function check() {
      attempts += 1;
      try {
        const response = await fetch(
          `/api/order-status?session_id=${encodeURIComponent(sessionId!)}`,
          { cache: "no-store" },
        );
        const payload = (await response.json()) as {
          status?: OrderState["status"];
          orderId?: string;
          timestamp?: string;
          email?: string;
          error?: string;
        };
        if (canceled) return;
        if (payload.status === "confirmed") {
          setOrder({
            status: "confirmed",
            orderId: payload.orderId,
            timestamp: payload.timestamp,
            email: payload.email,
          });
          return;
        }
        if (attempts < 6) {
          setOrder({ status: payload.status || "checking" });
          window.setTimeout(check, 1800);
        } else {
          setOrder({
            status: "fulfillment_pending",
            message: payload.error || "Your order is queued and will finish automatically.",
          });
        }
      } catch {
        if (!canceled) {
          setOrder({
            status: "fulfillment_pending",
            message: "Your payment succeeded. Confirmation is taking a little longer.",
          });
        }
      }
    }

    check();
    return () => {
      canceled = true;
    };
  }, [sessionId]);

  const confirmed = order.status === "confirmed";

  if (!sessionId) {
    return (
      <main className="confirmation-shell">
        <div className="confirmation-card">
          <p className="eyebrow">ORDER REFERENCE MISSING</p>
          <h1>Let’s find your moment.</h1>
          <p className="confirmation-copy">This confirmation link is incomplete.</p>
          <Link className="text-link" href="/">Return to the store →</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="confirmation-shell">
      <div className="confirmation-card">
        <p className="eyebrow">{confirmed ? "MOMENT CAPTURED" : "FINALIZING YOUR MOMENT"}</p>
        <div className={`status-mark ${confirmed ? "complete" : ""}`} aria-hidden="true">
          {confirmed ? "✓" : "◷"}
        </div>
        <h1>{confirmed ? "It’s officially yours." : "One last second."}</h1>
        <p className="confirmation-copy">
          {confirmed
            ? "Your one-of-one datetime shirt is now in Prodigi’s sandbox order queue."
            : order.message || "Stripe confirmed the checkout. We’re submitting the print order now."}
        </p>
        {confirmed && (
          <dl className="order-details">
            <div><dt>Printed datetime</dt><dd>{order.timestamp}</dd></div>
            <div><dt>Prodigi order</dt><dd>{order.orderId}</dd></div>
            <div><dt>Receipt</dt><dd>{order.email || "Sent by Stripe"}</dd></div>
          </dl>
        )}
        <Link className="text-link" href="/">Get another shirt →</Link>
      </div>
    </main>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<main className="confirmation-shell"><div className="confirmation-card">Loading…</div></main>}>
      <OrderConfirmation />
    </Suspense>
  );
}
