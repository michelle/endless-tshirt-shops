"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

const SIZES = ["S", "M", "L", "XL"];
type Style = "fitted" | "unisex";

function formatTime(value: number) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(value);
}

function Shirt({ style, timestamp }: { style: Style; timestamp: number }) {
  const digits = timestamp.toString();
  return (
    <div className="shirt-stage" aria-label={`Black ${style} t-shirt printed with ${digits}`}>
      <svg className={`shirt-svg ${style}`} viewBox="0 0 560 650" role="img">
        <defs>
          <filter id="shirt-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="18" stdDeviation="13" floodOpacity=".18" />
          </filter>
          <linearGradient id="fabric" x1="0" x2="1" y1="0" y2="1">
            <stop stopColor="#1d1d20" />
            <stop offset=".48" stopColor="#070708" />
            <stop offset="1" stopColor="#17171a" />
          </linearGradient>
        </defs>
        <path
          filter="url(#shirt-shadow)"
          className="shirt-shape"
          d={style === "fitted"
            ? "M190 93c21 27 46 41 90 41s69-14 90-41l82 35 103 137-77 62-50-49 25 281c-58 28-238 28-296 0l25-281-50 49-77-62 103-137z"
            : "M180 76c25 34 60 51 100 51s75-17 100-51l92 37 72 136-81 59-43-44 17 298c-49 22-265 22-314 0l17-298-43 44-81-59 72-136 92-37z"}
        />
        <path className="collar" d="M207 84c21 29 43 43 73 43s52-14 73-43c-14-15-30-24-45-28-9 21-17 31-28 31s-19-10-28-31c-15 4-31 13-45 28z" />
        <text x="280" y="220" textAnchor="middle" className="timestamp">{digits}</text>
        <text x="280" y="255" textAnchor="middle" className="timestamp-note">THE MOMENT YOU MADE IT YOURS</text>
      </svg>
      <div className="price-tag"><span>$30.00</span> $22.50</div>
    </div>
  );
}

export default function Storefront() {
  const [style, setStyle] = useState<Style>("fitted");
  const [size, setSize] = useState("M");
  const [now, setNow] = useState(() => Date.now());
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 50);
    return () => window.clearInterval(timer);
  }, []);

  const readableTime = useMemo(() => formatTime(now), [now]);

  async function checkout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ style, size, email, timestamp: now }),
      });
      const data = await response.json();
      if (!response.ok || !data.url) throw new Error(data.error || "We couldn't start checkout. Please try again.");
      window.location.assign(data.url);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <main>
      <header className="site-header">
        <a className="wordmark" href="#top">datetime.store</a>
        <span className="header-note">one shirt · one moment</span>
      </header>
      <section id="top" className="hero">
        <div className="intro">
          <p className="eyebrow">The current time, permanently yours</p>
          <h1>we sell a t-shirt<br />with the current datetime.</h1>
          <p className="lede">The number on the shirt moves until you check out. Then we lock that exact millisecond and print it just for you.</p>
          <div className="time-chip"><span className="pulse" /> right now: {readableTime}</div>
        </div>
        <Shirt style={style} timestamp={now} />
      </section>

      <section className="shop" aria-labelledby="customize-heading">
        <div className="shop-copy">
          <p className="eyebrow">Made for the present</p>
          <h2 id="customize-heading">Choose your shirt.</h2>
          <p>Soft black cotton, white direct-to-garment print, made to order in the US.</p>
          <div className="facts"><span>Free US shipping</span><span>Secure checkout</span><span>Printed to order</span></div>
        </div>
        <form className="order-card" onSubmit={checkout}>
          <fieldset>
            <legend>Style</legend>
            <div className="choice-grid two">
              {([['fitted', 'Fitted', 'A shaped, closer fit'], ['unisex', 'Unisex', 'An easy classic fit']] as const).map(([value, title, detail]) => (
                <label className={`choice ${style === value ? 'selected' : ''}`} key={value}>
                  <input type="radio" name="style" value={value} checked={style === value} onChange={() => setStyle(value)} />
                  <b>{title}</b><small>{detail}</small>
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend>Size</legend>
            <div className="choice-grid sizes">
              {SIZES.map((value) => <label className={`size-choice ${size === value ? 'selected' : ''}`} key={value}><input type="radio" name="size" value={value} checked={size === value} onChange={() => setSize(value)} />{value}</label>)}
            </div>
          </fieldset>
          <label className="email-field">Email for your receipt
            <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" />
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button type="submit" disabled={loading}>{loading ? "Preparing checkout…" : "Buy this moment — $22.50"}<span>→</span></button>
          <p className="fine-print">Free US shipping. You’ll enter your address securely at checkout.</p>
        </form>
      </section>
      <footer><span>© {new Date().getFullYear()} datetime.store</span><span>Nothing lasts. This shirt does.</span></footer>
    </main>
  );
}
