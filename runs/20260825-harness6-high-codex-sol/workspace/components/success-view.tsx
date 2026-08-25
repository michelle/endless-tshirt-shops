"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckIcon } from "./icons";

type OrderState = { status: "checking" | "waiting" | "processing" | "confirmed" | "error"; orderId?: string; timestamp?: string; email?: string };

export function SuccessView() {
  const params = useSearchParams();
  const sessionId = params.get("session_id");
  const [order, setOrder] = useState<OrderState>({ status: sessionId ? "checking" : "error" });

  useEffect(() => {
    if (!sessionId) return;
    let active = true;
    let attempts = 0;
    async function check() {
      attempts += 1;
      try {
        const response = await fetch(`/api/order-status?session_id=${encodeURIComponent(sessionId!)}`, { cache: "no-store" });
        const payload = await response.json() as OrderState;
        if (!active) return;
        if (payload.status === "confirmed") { setOrder(payload); return; }
        setOrder({ status: payload.status === "waiting" ? "waiting" : "processing" });
      } catch { if (active) setOrder({ status: "processing" }); }
      if (active && attempts < 8) window.setTimeout(check, Math.min(1500 * attempts, 5000));
    }
    check();
    return () => { active = false; };
  }, [sessionId]);

  const confirmed = order.status === "confirmed";
  return (
    <main className="success-shell">
      <Link className="wordmark success-wordmark" href="/">datetime<span>.store</span></Link>
      <section className="success-card">
        <div className={confirmed ? "success-mark success-mark--done" : "success-mark"}>
          {confirmed ? <CheckIcon size={30} /> : <span className="spinner spinner--dark" />}
        </div>
        <p className="eyebrow">{confirmed ? "Moment captured" : "Finalizing your order"}</p>
        <h1>{confirmed ? "Congrats on your pretty cool shirt." : "We’re lining up the pixels."}</h1>
        <p className="success-copy">
          {confirmed ? `Your timestamp ${order.timestamp} is locked in. A Stripe receipt is on its way${order.email ? ` to ${order.email}` : ""}.` : "Your payment was received. Keep this page open for a moment while we confirm it with our printer."}
        </p>
        {order.orderId && <div className="order-reference"><span>Production reference</span><strong>{order.orderId}</strong></div>}
        {order.status === "error" && <p className="form-error">This confirmation link is incomplete. Check your Stripe receipt or contact the shop owner.</p>}
        <Link className="text-link" href="/">Capture another moment →</Link>
      </section>
    </main>
  );
}
