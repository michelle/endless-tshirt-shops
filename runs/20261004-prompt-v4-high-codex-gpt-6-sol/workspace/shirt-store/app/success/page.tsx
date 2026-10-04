"use client";
import { useEffect, useState } from "react";
export default function Success() {
  const [status, setStatus] = useState("checking");
  useEffect(() => {
    const sessionId = new URLSearchParams(window.location.search).get("session_id");
    if (!sessionId) { setStatus("unknown"); return; }
    let active = true, tries = 0;
    async function check() {
      let current = "checking";
      try { const response = await fetch(`/api/order-status?session_id=${encodeURIComponent(sessionId!)}`); const result = await response.json() as { status?: string }; current = result.status || "unknown"; if (active) setStatus(current); } catch { if (active) setStatus("checking"); }
      if (active && ++tries < 12 && current !== "submitted") setTimeout(check, 2500);
    }
    check(); return () => { active = false; };
  }, []);
  const complete = status === "submitted", paid = complete || status === "processing" || status === "needs_review";
  return <main className="success-page"><a className="brand" href="/"><span className="brand-mark">◎</span> ELSEWHERE, ALWAYS</a><div className="success-card"><span className="detail-icon">✳</span><p className="eyebrow">YOUR STORY IS ON ITS WAY</p><h1>{complete ? "It’s being made." : paid ? "Thank you for your order." : "Checking your order."}</h1><p>{complete ? "Your personalized shirt has been sent to our print partner." : paid ? "Payment is complete. We’re arranging your print." : "We’re confirming your payment and preparing the next step. Please keep your receipt."}</p><a className="checkout-button" href="/">Create another <span>↗</span></a></div></main>;
}
