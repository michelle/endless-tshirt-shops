"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

declare global {
  interface Window {
    Stripe?: any;
  }
}

let stripeJsPromise: Promise<any> | null = null;
function loadStripeJs(): Promise<any> {
  if (!stripeJsPromise) {
    stripeJsPromise = new Promise((resolve, reject) => {
      if (window.Stripe) return resolve(window.Stripe);
      const s = document.createElement("script");
      s.src = "https://js.stripe.com/v3";
      s.async = true;
      s.onload = () => resolve(window.Stripe);
      s.onerror = () => reject(new Error("Could not load Stripe.js"));
      document.body.appendChild(s);
    });
  }
  return stripeJsPromise;
}

function PayInner() {
  const params = useSearchParams();
  const pi = params.get("pi") ?? "";
  const pk = params.get("pk") ?? "";
  const label = params.get("label") ?? "your sky";
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [paying, setPaying] = useState(false);
  const elRef = useRef<HTMLDivElement>(null);
  const addrRef = useRef<HTMLDivElement>(null);
  const stripeRef = useRef<any>(null);
  const elementsRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const Stripe = await loadStripeJs();
        if (cancelled || !elRef.current || !addrRef.current) return;
        const clientSecret = sessionStorage.getItem(`cs_${pi}`);
        if (!clientSecret) throw new Error("Payment session expired — please start again from the designer.");
        const stripe = Stripe(pk);
        const elements = stripe.elements({ clientSecret });
        elements.create("payment", { layout: "tabs" }).mount(elRef.current);
        elements.create("address", {
          mode: "shipping",
          fields: { phone: "always" },
          validation: { phone: { required: "never" } },
        }).mount(addrRef.current);
        stripeRef.current = stripe;
        elementsRef.current = elements;
        setReady(true);
      } catch (e: any) {
        setError(e.message ?? "Failed to initialize payment form.");
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pi, pk]);

  async function pay() {
    if (!stripeRef.current || !elementsRef.current) return;
    setPaying(true);
    setError(null);
    try {
      const { error } = await stripeRef.current.confirmPayment({
        elements: elementsRef.current,
        confirmParams: {
          return_url: `${window.location.origin}/order/confirm?pi=${encodeURIComponent(pi)}`,
        },
      });
      if (error) setError(error.message ?? "Payment failed.");
    } finally {
      setPaying(false);
    }
  }

  if (!pi || !pk) {
    return <div className="confirm-card"><h1>Missing payment reference</h1><p>Start again from the designer.</p></div>;
  }

  return (
    <div className="confirm-card" style={{ maxWidth: 560 }}>
      <span className="status-pill wait">SECURE CHECKOUT · STRIPE</span>
      <h1 style={{ fontSize: 30 }}>Pay for your sky</h1>
      <p>
        <b>{label}</b> — one personalized DTG tee, printed and shipped after payment.
      </p>
      <div ref={addrRef} style={{ margin: "22px 0 14px", textAlign: "left" }} />
      <div ref={elRef} style={{ margin: "8px 0 20px", textAlign: "left", minHeight: 60 }} />
      {error && <div className="status-pill err" style={{ marginBottom: 14 }}>{error}</div>}
      <button className="btn btn-gold" style={{ width: "100%" }} onClick={pay} disabled={!ready || paying}>
        {paying ? "Processing…" : "Pay $39.99"}
      </button>
      <p style={{ fontSize: 12.5, marginTop: 16 }}>
        Test mode: use card 4242 4242 4242 4242, any future date, any CVC/ZIP.
      </p>
    </div>
  );
}

export default function PayPage() {
  return (
    <main className="confirm-main">
      <div className="wrap">
        <Suspense fallback={<div className="confirm-card"><div className="spin" /></div>}>
          <PayInner />
        </Suspense>
      </div>
    </main>
  );
}
