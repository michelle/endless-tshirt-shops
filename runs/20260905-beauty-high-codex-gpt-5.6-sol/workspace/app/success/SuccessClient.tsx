"use client";

import { ArrowLeft, Check, Clock3, PackageCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

type OrderState = {
  status: "loading" | "confirmed" | "paid" | "processing" | "error";
  orderId?: string;
  timestamp?: string;
  size?: string;
  email?: string;
  error?: string;
};

export default function SuccessClient({ sessionId }: { sessionId?: string }) {
  const [order, setOrder] = useState<OrderState>({ status: sessionId ? "loading" : "error", error: sessionId ? undefined : "No checkout session was found." });

  useEffect(() => {
    if (!sessionId) return;
    let active = true;
    fetch(`/api/order-status?session_id=${encodeURIComponent(sessionId)}`)
      .then(async (response) => ({ response, payload: await response.json() }))
      .then(({ payload }) => active && setOrder(payload))
      .catch(() => active && setOrder({ status: "error", error: "We could not load your order just yet." }));
    return () => { active = false; };
  }, [sessionId]);

  const confirmed = order.status === "confirmed";

  return (
    <main className="success-page">
      <div className="success-orbit" />
      <Link className="wordmark success-mark" href="/"><span>datetime</span><i>.store</i></Link>
      <section className="success-card">
        <div className={`success-icon ${confirmed ? "done" : ""}`}>
          {confirmed ? <Check size={30} /> : <Clock3 size={30} />}
        </div>
        <p className="section-kicker">{confirmed ? "Moment successfully captured" : "Your moment is being prepared"}</p>
        <h1>{confirmed ? <>The present is<br /><em>officially yours.</em></> : <>Hold that<br /><em>thought…</em></>}</h1>
        <p className="success-copy">
          {confirmed
            ? `Your one-of-one timestamp tee is safely in the Prodigi sandbox queue${order.email ? `, and a Stripe receipt is heading to ${order.email}` : ""}.`
            : order.error || "Payment is confirmed. We’re handing your artwork to the print studio now."}
        </p>
        {confirmed && (
          <div className="order-ticket">
            <div><small>TIMESTAMP</small><strong>{order.timestamp}</strong></div>
            <div><small>SIZE</small><strong>{order.size}</strong></div>
            <div><small>PRODIGI ORDER</small><strong>{order.orderId}</strong></div>
          </div>
        )}
        <div className="success-notes">
          <span><Sparkles size={15} /> Artwork made</span>
          <span><PackageCheck size={15} /> {confirmed ? "Sandbox order submitted" : "Submitting order"}</span>
        </div>
        <Link className="back-button" href="/"><ArrowLeft size={17} /> Catch another moment</Link>
      </section>
    </main>
  );
}
