"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { decodeDesign, type Design } from "../../lib/design";

export default function SuccessPage() {
  return <Suspense fallback={<main className="success-page"><div className="success-card"><span className="success-spinner" /></div></main>}><SuccessInner /></Suspense>;
}

function SuccessInner() {
  const params = useSearchParams();
  const sessionId = params.get("session_id");
  const isDemo = params.get("demo") === "1";
  const [state, setState] = useState<"checking" | "ready" | "done" | "error">(isDemo ? "ready" : "checking");
  const [orderId, setOrderId] = useState("");
  const [error, setError] = useState("");
  const design: Design = decodeDesign(params.get("design"));

  useEffect(() => {
    if (!sessionId || isDemo) return;
    fetch("/api/checkout/confirm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId }) }).then(async (response) => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "We could not confirm payment yet.");
      setOrderId(result.orderId || "queued");
      setState("done");
    }).catch((confirmationError) => { setError(confirmationError instanceof Error ? confirmationError.message : "Confirmation failed."); setState("error"); });
  }, [sessionId, isDemo]);

  async function releaseDemo() {
    setState("checking"); setError("");
    const response = await fetch("/api/checkout/demo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: params.get("name") || design.name, email: params.get("email") || "demo@example.com", design, recipient: { name: params.get("name") || design.name, address: { line1: "123 Demo Street", townOrCity: "Brooklyn", stateOrCounty: "NY", postalOrZipCode: "11201", countryCode: "US" } } }) });
    const result = await response.json();
    if (!response.ok) { setError(result.error || "Sandbox fulfillment failed."); setState("error"); return; }
    setOrderId(result.orderId || "sandbox-queued"); setState("done");
  }

  return <main className="success-page"><div className="success-card"><a className="wordmark" href="/"><span className="mark">+</span>PATCHWORK</a>{state === "checking" && <div className="success-content"><span className="success-spinner" /><p className="eyebrow">[ VERIFYING PAYMENT ]</p><h1>Locking in<br /><em>your signal.</em></h1><p>We’re checking payment, then releasing your design to the print studio.</p></div>}{state === "done" && <div className="success-content"><div className="success-check">✓</div><p className="eyebrow">[ ORDER CONFIRMED ]</p><h1>Your signal<br /><em>is in motion.</em></h1><p>Order <strong>{orderId}</strong> has been released to the Prodigi print network. We’ll email tracking updates as it travels.</p><a className="button button-dark" href="/">Make another signal <span>↗</span></a></div>}{state === "ready" && <div className="success-content"><div className="success-check demo">◎</div><p className="eyebrow">[ SANDBOX PAYMENT ]</p><h1>Ready to release<br /><em>your signal.</em></h1><p>No Stripe key is configured on this run, so this is a safe sandbox checkout. The button below marks payment as successful and submits a non-charged Prodigi sandbox order.</p><button className="button button-dark" onClick={releaseDemo}>Complete sandbox payment <span>↗</span></button><a className="back-link" href="/">← Back to customizer</a></div>}{state === "error" && <div className="success-content"><div className="success-check error">!</div><p className="eyebrow">[ NEEDS ATTENTION ]</p><h1>We paused<br /><em>your signal.</em></h1><p>{error}</p><a className="button button-dark" href="/">Return to store <span>↗</span></a></div>}<div className="success-foot"><span>DTG / BUILT TO ORDER</span><span>PATCHWORK 001</span></div></div></main>;
}
