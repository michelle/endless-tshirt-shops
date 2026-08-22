"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowIcon, CheckIcon, ClockIcon, LockIcon } from "./icons";
import { ShirtPreview, type ShirtStyle } from "./shirt-preview";

const sizes = ["S", "M", "L", "XL"] as const;
type Size = (typeof sizes)[number];

export function Storefront() {
  const [timestamp, setTimestamp] = useState(() => Date.now());
  const [style, setStyle] = useState<ShirtStyle>("unisex");
  const [size, setSize] = useState<Size>("M");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let frame = 0;
    let previous = 0;
    const tick = (now: number) => {
      if (now - previous > 34) {
        setTimestamp(Date.now());
        previous = now;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  const checkout = useCallback(async () => {
    const capturedAt = Date.now();
    setTimestamp(capturedAt);
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ style, size, timestamp: capturedAt }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.url) throw new Error(payload.error || "Checkout could not be started.");
      window.location.assign(payload.url);
    } catch (cause) {
      setLoading(false);
      setError(cause instanceof Error ? cause.message : "Something went wrong. Please try again.");
    }
  }, [size, style]);

  return (
    <main>
      <nav className="nav container">
        <a className="brand" href="#top" aria-label="datetime.store home"><ClockIcon/>datetime<span>.store</span></a>
        <a className="nav-link" href="#story">Our process <ArrowIcon/></a>
      </nav>

      <section id="top" className="hero container">
        <div className="eyebrow"><span>Edition 001</span><span className="eyebrow-line"/>Made in the USA</div>
        <div className="hero-grid">
          <div className="hero-copy">
            <h1>Wear this<br/><em>exact moment.</em></h1>
            <p className="lede">A one-of-one tee printed with the Unix timestamp from the instant you claim it. No two are ever the same.</p>
            <div className="proof-row"><div className="avatars"><span>12</span><span>34</span><span>56</span></div><p><strong>Small-batch original</strong><br/>Printed only when you order</p></div>
          </div>
          <ShirtPreview timestamp={timestamp} style={style} frozen={loading}/>
          <aside className="buy-card" aria-label="Product options">
            <div className="buy-heading"><div><p className="kicker">The Timestamp Tee</p><h2>Make it yours</h2></div><div className="price"><s>$30</s><strong>$22.50</strong></div></div>
            <fieldset><legend>Cut</legend><div className="segmented">
              {(["unisex", "fitted"] as ShirtStyle[]).map((option) => <button type="button" className={style === option ? "selected" : ""} onClick={() => setStyle(option)} key={option} aria-pressed={style === option}>{style === option && <CheckIcon/>}{option === "unisex" ? "Unisex" : "Fitted"}</button>)}
            </div></fieldset>
            <fieldset><div className="legend-row"><legend>Size</legend><span>True to size</span></div><div className="size-row">
              {sizes.map((option) => <button type="button" className={size === option ? "selected" : ""} onClick={() => setSize(option)} key={option} aria-pressed={size === option}>{option}</button>)}
            </div></fieldset>
            <button className="checkout-button" type="button" onClick={checkout} disabled={loading}>{loading ? <><span className="spinner"/>Locking your moment…</> : <>Claim this moment <ArrowIcon/></>}</button>
            {error && <p className="form-error" role="alert">{error}</p>}
            <p className="secure"><LockIcon/>Secure test checkout by Stripe · Free US shipping</p>
            <div className="micro-details"><span><CheckIcon/>100% combed cotton</span><span><CheckIcon/>Made to order</span></div>
          </aside>
        </div>
      </section>

      <section id="story" className="story">
        <div className="container story-grid">
          <div><p className="section-number">01 / THE IDEA</p><h2>Time moves.<br/>This one stays.</h2></div>
          <div className="story-copy"><p>Every timestamp is a coordinate in history. We turn yours into a quiet artifact: nineteen digits, screen-bright and permanently yours.</p><ol><li><span>01</span><div><strong>Choose your fit</strong><p>Pick a cut and size, then watch your timestamp move in real time.</p></div></li><li><span>02</span><div><strong>Claim the instant</strong><p>Your millisecond is locked when you head to secure checkout.</p></div></li><li><span>03</span><div><strong>We print one</strong><p>Your unique artwork is created and sent to our US print partner.</p></div></li></ol></div>
        </div>
      </section>

      <footer className="container"><a className="brand" href="#top"><ClockIcon/>datetime<span>.store</span></a><p>A small experiment about time, objects, and the internet.</p><span>© {new Date().getFullYear()}</span></footer>
    </main>
  );
}
