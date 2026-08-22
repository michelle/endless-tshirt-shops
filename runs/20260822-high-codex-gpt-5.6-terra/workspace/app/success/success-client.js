"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function SuccessClient() {
  const [state, setState] = useState("sending");
  const [orderId, setOrderId] = useState("");

  useEffect(() => {
    const sessionId = new URLSearchParams(window.location.search).get("session_id");
    if (!sessionId) { setState("missing"); return; }
    fetch("/api/fulfill", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId }) })
      .then(async (response) => ({ response, body: await response.json() }))
      .then(({ response, body }) => {
        if (!response.ok) throw new Error(body.error);
        setOrderId(body.fulfillment.orderId);
        setState(body.fulfillment.mode === "dry_run" ? "test" : "done");
      })
      .catch(() => setState("pending"));
  }, []);

  const content = {
    sending: ["Capturing your moment…", "Your payment is confirmed. We’re sending the print details now."],
    done: ["Your moment is on its way.", "Your t-shirt has been sent to production. We’ll email your receipt and updates shortly."],
    test: ["Your test moment was captured.", "This sandbox order completed safely. No physical shirt was submitted for printing."],
    pending: ["Payment received.", "We’re confirming your print order. Keep your Stripe receipt; our team can complete the hand-off if needed."],
    missing: ["Thanks for your order.", "Check your receipt for confirmation details."],
  }[state];

  return <main className="success-page"><div className="success-card"><a className="wordmark" href="/">datetime.store</a><div className="success-stamp">✓</div><p className="eyebrow">{state === "test" ? "SANDBOX CHECKOUT" : "ORDER CONFIRMED"}</p><h1>{content[0]}</h1><p className="success-copy">{content[1]}</p>{orderId && <p className="order-ref">Reference: {orderId}</p>}<Link className="return-link" href="/">Get another shirt →</Link></div></main>;
}
