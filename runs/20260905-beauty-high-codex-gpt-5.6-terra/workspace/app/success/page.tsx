"use client";
import { useEffect, useState } from "react";

export default function Success() {
  const [status, setStatus] = useState<"loading" | "complete" | "waiting" | "error">("loading");
  const [email, setEmail] = useState("");
  useEffect(() => { const id = new URLSearchParams(window.location.search).get("session_id"); if (!id) return setStatus("error"); fetch(`/api/session?id=${encodeURIComponent(id)}`).then((r) => r.json()).then((data) => { setEmail(data.email || "your inbox"); setStatus(data.paid ? "complete" : "waiting"); }).catch(() => setStatus("error")); }, []);
  return <main className="success-page"><div className="confetti">✦ &nbsp; ✳ &nbsp; ✦</div><a className="wordmark" href="/">datetime<span>.</span>store</a><div className="success-card"><p className="eyebrow">time capsule sealed</p><h1>{status === "complete" ? "It’s officially a thing." : status === "waiting" ? "Almost there…" : "We couldn’t find that moment."}</h1><p>{status === "complete" ? <>Your timestamp is headed to print. A receipt is on its way to <strong>{email}</strong>; we’ll keep the next steps quietly moving.</> : "Your payment is still being confirmed. Refresh in a moment, or check your email."}</p><a className="buy-button" href="/">capture another now <span>→</span></a></div></main>;
}
