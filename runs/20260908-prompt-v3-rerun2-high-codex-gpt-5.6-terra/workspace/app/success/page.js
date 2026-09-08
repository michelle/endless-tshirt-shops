"use client";

import { useEffect, useState } from "react";

export default function SuccessPage() {
  const [status, setStatus] = useState("Checking your payment and preparing your print file…");
  const [detail, setDetail] = useState("");
  useEffect(() => {
    const sessionId = new URLSearchParams(window.location.search).get("session_id");
    if (!sessionId) { setStatus("We couldn’t find that checkout session."); return; }
    fetch("/api/fulfill", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId }) })
      .then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error); setStatus("Your signal is in the system."); setDetail(d.prodigiOrderId ? `Print reference: ${d.prodigiOrderId}` : "We’ll email you when your shipment starts moving."); })
      .catch((e) => { setStatus("Your payment is confirmed."); setDetail("We’re finalizing your print order now. If you don’t receive an email shortly, contact support with your Stripe receipt."); });
  }, []);
  return <main className="success"><a className="brand" href="/">SIGNAL<br /><em>FOUNDRY</em></a><div><p className="eyebrow">TRANSMISSION RECEIVED</p><h1>{status}</h1><p>{detail}</p><a className="back" href="/">Return to Signal Foundry</a></div></main>;
}
