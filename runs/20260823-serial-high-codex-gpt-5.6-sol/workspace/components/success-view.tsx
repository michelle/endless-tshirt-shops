"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckIcon } from "./icons";

type Order = {
  paymentStatus: string;
  fulfillmentStatus: string;
  reference: string | null;
  email: string | null;
  timestamp: string | null;
  fit: string | null;
  size: string | null;
};

export function SuccessView() {
  const params = useSearchParams();
  const sessionId = params.get("session_id");
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!sessionId) {
      setError("This order link is incomplete.");
      return;
    }
    let active = true;
    const finish = async () => {
      try {
        const fulfillment = await fetch("/api/fulfill", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        if (!fulfillment.ok) {
          const payload = await fulfillment.json();
          throw new Error(payload.error || "Fulfillment needs attention.");
        }
        const status = await fetch(`/api/order-status?session_id=${encodeURIComponent(sessionId)}`);
        const payload = await status.json();
        if (!status.ok) throw new Error(payload.error || "Order could not be loaded.");
        if (active) setOrder(payload);
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught.message : "Order confirmation could not be loaded.");
      }
    };
    void finish();
    return () => { active = false; };
  }, [sessionId]);

  if (error) {
    return (
      <main className="success-shell">
        <a className="wordmark" href="/">datetime<span>.store</span></a>
        <div className="success-card attention">
          <p className="success-kicker">PAYMENT RECEIVED</p>
          <h1>Your order needs<br />a human touch.</h1>
          <p>{error} If your card was charged, your payment is recorded safely in Stripe.</p>
          <a className="success-action" href="mailto:hello@datetime.store">Contact support</a>
        </div>
      </main>
    );
  }

  if (!order) {
    return (
      <main className="success-shell loading-order">
        <a className="wordmark" href="/">datetime<span>.store</span></a>
        <div className="loader-mark"><span /><span /><span /></div>
        <p className="success-kicker">SENDING YOUR MOMENT TO PRINT…</p>
      </main>
    );
  }

  return (
    <main className="success-shell">
      <a className="wordmark" href="/">datetime<span>.store</span></a>
      <div className="success-card">
        <div className="success-check"><CheckIcon /></div>
        <p className="success-kicker">ORDER CONFIRMED</p>
        <h1>This moment<br />is officially yours.</h1>
        <p>We’ve sent your timestamp to print. A receipt is on its way to <strong>{order.email}</strong>.</p>
        <div className="order-stamp">
          <span>YOUR TIMESTAMP</span>
          <code>{order.timestamp}</code>
          <small>{order.fit} / {order.size} · REF {order.reference || "PROCESSING"}</small>
        </div>
        <a className="success-action" href="/">Capture another moment</a>
      </div>
    </main>
  );
}
