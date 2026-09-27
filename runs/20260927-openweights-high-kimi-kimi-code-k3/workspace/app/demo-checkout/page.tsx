"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function DemoCheckoutInner() {
  const params = useSearchParams();
  const token = params.get("d") || "";

  let design: any = null;
  try {
    const payload = token.split(".")[0];
    design = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    design = null;
  }

  const [form, setForm] = useState({
    name: "",
    email: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    zip: "",
    country: "US",
    cardNumber: "4242 4242 4242 4242",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!design) {
    return (
      <div className="panel">
        <h1>Invalid checkout link</h1>
        <p>
          <a className="link" href="/">
            Return to the store
          </a>
        </p>
      </div>
    );
  }

  const set = (k: string) => (e: any) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function pay() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/demo-pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, ...form }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Payment failed");
      window.location.href = `/success?ref=${encodeURIComponent(json.ref)}`;
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div className="panel">
      <div className="demo-banner">
        <strong>DEMO PAYMENT GATEWAY</strong> — this store is running in test
        mode (no Stripe key configured). No real money moves. Use test card{" "}
        <strong>4242 4242 4242 4242</strong>; any other card is declined.
      </div>

      <h1>Checkout</h1>

      <div className="order-summary">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/preview?token=${encodeURIComponent(token)}`}
          alt="Your star map"
        />
        <div className="meta">
          <strong>StarMark Night Sky Tee</strong>
          “{design.caption}”<br />
          {design.date} {design.time} · {design.place}
          <br />
          {design.color} · size {String(design.size).toUpperCase()} · $38.90
          (free shipping)
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          pay();
        }}
      >
        <div className="field">
          <label>Full name</label>
          <input value={form.name} onChange={set("name")} required />
        </div>
        <div className="field">
          <label>Email</label>
          <input
            type="email"
            value={form.email}
            onChange={set("email")}
            required
          />
        </div>
        <div className="field">
          <label>Address line 1</label>
          <input value={form.line1} onChange={set("line1")} required />
        </div>
        <div className="field">
          <label>Address line 2 (optional)</label>
          <input value={form.line2} onChange={set("line2")} />
        </div>
        <div className="field-row">
          <div className="field">
            <label>City</label>
            <input value={form.city} onChange={set("city")} required />
          </div>
          <div className="field">
            <label>State / County</label>
            <input value={form.state} onChange={set("state")} />
          </div>
        </div>
        <div className="field-row">
          <div className="field">
            <label>ZIP / Postcode</label>
            <input value={form.zip} onChange={set("zip")} required />
          </div>
          <div className="field">
            <label>Country</label>
            <select value={form.country} onChange={set("country")}>
              {["US", "GB", "CA", "AU", "NZ", "IE", "DE", "FR", "NL", "ES", "IT"].map(
                (c) => (
                  <option key={c}>{c}</option>
                )
              )}
            </select>
          </div>
        </div>
        <div className="field">
          <label>Card number</label>
          <input
            value={form.cardNumber}
            onChange={set("cardNumber")}
            inputMode="numeric"
            required
          />
        </div>

        <div className="buy-row">
          <div className="price">$38.90</div>
          <button className="buy" type="submit" disabled={loading}>
            {loading ? "Processing…" : "Pay now"}
          </button>
        </div>
        {error && <div className="error-msg">{error}</div>}
      </form>
    </div>
  );
}

export default function DemoCheckout() {
  return (
    <div className="wrap">
      <header className="site">
        <a className="logo" href="/">
          STARMARK
        </a>
        <span className="tagline">Secure checkout</span>
      </header>
      <div className="narrow">
        <Suspense>
          <DemoCheckoutInner />
        </Suspense>
      </div>
    </div>
  );
}
