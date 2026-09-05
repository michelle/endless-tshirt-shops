"use client";

import { FormEvent, useEffect, useState } from "react";

const SIZES = ["S", "M", "L", "XL", "2XL"];
const price = "$30.00";

function stamp(ms: number) {
  return new Intl.NumberFormat("en-US").format(ms);
}

export default function Store() {
  const [now, setNow] = useState(Date.now());
  const [size, setSize] = useState("M");
  const [style, setStyle] = useState<"unisex" | "fitted">("unisex");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let frame = 0;
    const tick = () => { setNow(Date.now()); frame = requestAnimationFrame(tick); };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  async function checkout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true); setNotice(null);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ timestamp: now, size, style }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Checkout could not start.");
      window.location.assign(data.url);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Checkout could not start.");
      setLoading(false);
    }
  }

  return (
    <main>
      <header className="site-header">
        <a className="wordmark" href="/">datetime.store</a>
        <span className="header-note">one moment, made tangible</span>
        <span className="status"><i /> PRINT ON DEMAND</span>
      </header>
      <section className="product-grid" aria-label="The datetime shirt">
        <div className="product-art" aria-label={`Black ${style} T-shirt displaying timestamp ${stamp(now)}`}>
          <div className={`shirt ${style}`}>
            <div className="collar" />
            <div className="sleeve left" /><div className="sleeve right" />
            <div className="shirt-body"><span>{stamp(now)}</span></div>
          </div>
          <div className="art-caption"><span>LIVE MILLIS</span><span>UTC · NOW</span></div>
        </div>
        <div className="purchase-panel">
          <p className="eyebrow">EDITION OF ONE</p>
          <h1>The time<br />is yours.</h1>
          <p className="lede">A heavyweight black tee printed with the exact Unix timestamp of your order. No reruns. No replacements of the moment.</p>
          <div className="price-row"><strong>{price}</strong><span>US shipping included</span></div>
          <form onSubmit={checkout}>
            <fieldset disabled={loading}>
              <legend>Choose your cut</legend>
              <div className="choice-row">
                <button type="button" onClick={() => setStyle("unisex")} className={style === "unisex" ? "selected" : ""} aria-pressed={style === "unisex"}>Unisex<br /><small>classic crew</small></button>
                <button type="button" onClick={() => setStyle("fitted")} className={style === "fitted" ? "selected" : ""} aria-pressed={style === "fitted"}>Fitted<br /><small>soft slim cut</small></button>
              </div>
              <label className="field-label" htmlFor="size">Size</label>
              <div className="sizes">{SIZES.map(value => <button type="button" key={value} onClick={() => setSize(value)} className={size === value ? "selected" : ""} aria-pressed={size === value}>{value}</button>)}</div>
              <button className="buy-button" type="submit">{loading ? "Opening checkout…" : `Make this moment — ${price}`}</button>
            </fieldset>
          </form>
          {notice && <p className="error" role="alert">{notice}</p>}
          <p className="fine-print">Secure checkout by Stripe. Printed on demand and fulfilled by Prodigi.</p>
        </div>
      </section>
      <section className="manifesto">
        <p>Every purchase freezes a passing instant.</p><p>That number is only yours.</p><p>Wear it well.</p>
      </section>
      <footer><span>© {new Date().getFullYear()} datetime.store</span><span>Made after you decided.</span></footer>
    </main>
  );
}
