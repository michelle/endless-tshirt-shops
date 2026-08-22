"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowIcon, CheckIcon, ClockIcon } from "./icons";

type OrderState = { status: "loading" | "pending" | "processing" | "complete" | "failed"; orderId?: string; mode?: string; error?: string };

export function OrderStatus({ sessionId }: { sessionId: string }) {
  const [state, setState] = useState<OrderState>({ status: sessionId ? "loading" : "failed", error: sessionId ? undefined : "No checkout session was provided." });

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const check = async () => {
      try {
        const response = await fetch(`/api/order?session_id=${encodeURIComponent(sessionId)}`, { cache: "no-store" });
        const payload = await response.json();
        if (cancelled) return;
        if (payload.status === "complete") setState(payload);
        else if (!response.ok || payload.status === "failed") setState({ status: "failed", error: payload.error });
        else { setState({ status: payload.status || "processing" }); timer = setTimeout(check, 1800); }
      } catch {
        if (!cancelled) timer = setTimeout(check, 2500);
      }
    };
    check();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [sessionId]);

  const complete = state.status === "complete";
  const failed = state.status === "failed";
  return <main className="order-page"><section className="order-card">
    <div className={`status-icon ${complete || failed ? "" : "loading"}`}>{complete ? <CheckIcon/> : failed ? <span>!</span> : <ClockIcon/>}</div>
    <p className="kicker">{complete ? "Moment claimed" : failed ? "Order update" : "Creating your one-of-one"}</p>
    <h1>{complete ? "It’s officially yours." : failed ? "We need a hand." : "Hold that thought…"}</h1>
    <p>{complete ? "Your payment is confirmed and your unique artwork has been sent to our print partner. A Stripe receipt is on its way." : failed ? state.error : "Payment confirmed. We’re generating the print-ready timestamp and reserving your shirt now."}</p>
    {complete && <div className="order-details"><div className="detail-row"><span>Fulfillment</span><strong>{state.mode === "ordered" ? "Test order submitted" : "Quote verified"}</strong></div><div className="detail-row"><span>Order reference</span><strong>{state.orderId}</strong></div></div>}
    <Link className="order-link" href="/">Back to datetime.store <ArrowIcon/></Link>
  </section></main>;
}
