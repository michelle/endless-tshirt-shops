"use client";

import { useEffect, useMemo, useState } from "react";

const styles = [
  { id: "fitted", label: "Fitted", note: "A closer, modern cut" },
  { id: "unisex", label: "Unisex", note: "An easy, classic cut" },
];
const sizes = ["S", "M", "L", "XL"];

function formatTime(value) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(value);
}

export default function Storefront() {
  const [style, setStyle] = useState("fitted");
  const [size, setSize] = useState("M");
  const [now, setNow] = useState(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const update = () => setNow(new Date());
    update();
    const timer = window.setInterval(update, 43);
    return () => window.clearInterval(timer);
  }, []);

  const timestamp = useMemo(() => (now ? String(now.getTime()) : "─────────────"), [now]);
  const displayTime = now ? formatTime(now) : "Loading this very moment…";

  async function beginCheckout() {
    setWorking(true);
    setError("");
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ style, size, timestamp: Date.now() }),
      });
      const body = await response.json();
      if (!response.ok || !body.url) throw new Error(body.error || "Checkout could not be started.");
      window.location.assign(body.url);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
      setWorking(false);
    }
  }

  return (
    <main>
      <header className="masthead">
        <a className="wordmark" href="/" aria-label="datetime.store home">datetime.store</a>
        <p>we sell a t-shirt with the current datetime.</p>
      </header>

      <section className="product-grid" aria-label="datetime t-shirt">
        <div className="product-stage">
          <div className="moment-label">
            <span className="live-dot" /> LIVE MOMENT
          </div>
          <div className={`shirt shirt--${style}`} aria-label={`Black ${style} shirt preview`}>
            <div className="shirt-neck" />
            <div className="shirt-sleeve shirt-sleeve--left" />
            <div className="shirt-sleeve shirt-sleeve--right" />
            <div className="shirt-body">
              <div className="timestamp">{timestamp}</div>
              <div className="timestamp-caption">UNIX TIME · MILLSECONDS</div>
            </div>
          </div>
          <p className="preview-copy">Your shirt will be printed with the moment checkout begins.</p>
        </div>

        <aside className="purchase-card">
          <div className="eyebrow">ONE OF ONE</div>
          <h1>A shirt for right now.</h1>
          <p className="lede">A black tee carrying one irretrievable instant: <strong>{displayTime}</strong>.</p>

          <fieldset>
            <legend>Choose your fit</legend>
            <div className="choice-row fit-row">
              {styles.map((option) => (
                <button key={option.id} type="button" className={`choice ${style === option.id ? "selected" : ""}`} onClick={() => setStyle(option.id)} aria-pressed={style === option.id}>
                  <span>{option.label}</span><small>{option.note}</small>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend>Choose your size</legend>
            <div className="choice-row size-row">
              {sizes.map((option) => (
                <button key={option} type="button" className={`size-choice ${size === option ? "selected" : ""}`} onClick={() => setSize(option)} aria-pressed={size === option}>{option}</button>
              ))}
            </div>
          </fieldset>

          <div className="price-line"><span>Printed t-shirt</span><span>$22.50</span></div>
          <div className="price-line shipping"><span>US shipping</span><span>Free</span></div>
          <button className="checkout-button" type="button" onClick={beginCheckout} disabled={working}>
            {working ? "Opening secure checkout…" : "Buy this moment — $22.50"}
            <span aria-hidden="true">→</span>
          </button>
          {error && <p className="error" role="alert">{error}</p>}
          <p className="secure-note">Secure checkout by Stripe · Printed to order · US only</p>
        </aside>
      </section>

      <section className="details">
        <div><span>01</span><h2>It is yours alone.</h2><p>The timestamp is captured only when you choose to buy. No two shirts share the same moment.</p></div>
        <div><span>02</span><h2>Made to order.</h2><p>Your timestamp is sent straight to our print partner on a soft black tee.</p></div>
        <div><span>03</span><h2>Sent simply.</h2><p>Free US shipping. You’ll get a receipt and order confirmation after checkout.</p></div>
      </section>

      <footer>© {new Date().getFullYear()} datetime.store <span>•</span> the present is fleeting</footer>
    </main>
  );
}
