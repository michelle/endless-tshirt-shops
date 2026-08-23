"use client";

import { useEffect, useState } from "react";

export default function SuccessPage() {
  const [status, setStatus] = useState("Confirming your moment…");
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("session_id");
    if (!id) { setStatus("Your payment was completed. We’ll email your confirmation shortly."); return; }
    fetch(`/api/order-status?session_id=${encodeURIComponent(id)}`)
      .then((response) => response.json())
      .then((data) => setStatus(data.status || "Your payment was completed. We’ll email your confirmation shortly."))
      .catch(() => setStatus("Your payment was completed. We’ll email your confirmation shortly."));
  }, []);
  return <main className="success-page"><a className="wordmark" href="/">datetime.store</a><div className="success-card"><p className="eyebrow">A moment, made physical</p><h1>Congrats on your pretty cool shirt.</h1><p>{status}</p><a className="back-button" href="/">Get another shirt →</a></div></main>;
}
