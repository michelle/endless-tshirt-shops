"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Check, Clock3, PackageCheck, ShieldCheck } from "lucide-react";

const SIZES = ["XS", "S", "M", "L", "XL", "2XL"] as const;

function formatTimestamp(value: number) {
  return String(value).padStart(13, "0");
}

export default function Storefront() {
  const [timestamp, setTimestamp] = useState(() => Date.now());
  const [size, setSize] = useState<(typeof SIZES)[number]>("M");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const frozen = useRef(false);

  useEffect(() => {
    let frame = 0;
    const tick = () => {
      if (!frozen.current) setTimestamp(Date.now());
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  async function checkout() {
    const capturedAt = Date.now();
    frozen.current = true;
    setTimestamp(capturedAt);
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ size, timestamp: capturedAt }),
      });
      const result = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !result.url) throw new Error(result.error || "Checkout is unavailable.");
      window.location.assign(result.url);
    } catch (checkoutError) {
      frozen.current = false;
      setLoading(false);
      setError(checkoutError instanceof Error ? checkoutError.message : "Checkout is unavailable.");
    }
  }

  return (
    <main>
      <nav className="nav" aria-label="Primary navigation">
        <a className="wordmark" href="#top" aria-label="datetime.store home">datetime<span>.store</span></a>
        <a className="nav-link" href="#story">How it works <ArrowUpRight size={15} aria-hidden="true" /></a>
      </nav>

      <section className="hero" id="top">
        <div className="product-stage" aria-label={`Black shirt preview displaying ${formatTimestamp(timestamp)}`}>
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="edition-tag"><span>Edition</span> one of one</div>
          <div className="shirt-wrap">
            <div className="shirt">
              <div className="collar" />
              <span className="shirt-time">{formatTimestamp(timestamp)}</span>
            </div>
          </div>
          <div className="live-tag"><i /> updating live</div>
        </div>

        <div className="buy-panel">
          <p className="eyebrow"><Clock3 size={15} /> The current moment, made physical</p>
          <h1>A timestamp<br />you can wear.</h1>
          <p className="lede">A black cotton tee printed with the exact Unix millisecond you check out. No two are ever the same.</p>
          <div className="price-row">
            <span className="price">$24</span>
            <span className="was">$30</span>
            <span className="shipping">US shipping included</span>
          </div>
          <fieldset className="size-picker">
            <legend><span>Choose a size</span><a href="#size-guide">Size guide</a></legend>
            <div className="size-grid">
              {SIZES.map((option) => (
                <button className={size === option ? "size active" : "size"} type="button" key={option}
                  onClick={() => setSize(option)} aria-pressed={size === option}>{option}</button>
              ))}
            </div>
          </fieldset>
          <button className="checkout-button" type="button" onClick={checkout} disabled={loading}>
            <span>{loading ? "Freezing your moment…" : "Freeze this moment — $24"}</span>
            {loading ? <span className="spinner" aria-hidden="true" /> : <ArrowUpRight size={21} aria-hidden="true" />}
          </button>
          {error && <p className="checkout-error" role="alert">{error}</p>}
          <p className="microcopy"><ShieldCheck size={14} /> Secure checkout by Stripe · Prodigi sandbox fulfillment</p>
        </div>
      </section>

      <section className="marquee" aria-label="Product highlights"><div>YOUR MOMENT <span>✦</span> 100% COTTON <span>✦</span> ONE OF ONE <span>✦</span> PRINTED ON DEMAND <span>✦</span> YOUR MOMENT</div></section>

      <section className="story" id="story">
        <div><p className="section-no">01 / THE IDEA</p><h2>Thirteen digits.<br />One exact moment.</h2></div>
        <div className="story-copy">
          <p>Unix time counts milliseconds since January 1, 1970. Usually it disappears into logs and databases. We put yours front and center.</p>
          <p>When you press the button, the live clock stops. That number becomes your artwork, then a fulfillment-ready print file made only for your order.</p>
        </div>
      </section>

      <section className="steps" aria-label="How your shirt is made">
        <article><span>1</span><Clock3 /><h3>Catch it</h3><p>Choose your size and freeze the timestamp you see.</p></article>
        <article><span>2</span><Check /><h3>Print it</h3><p>Your number is rendered in white and printed to order.</p></article>
        <article><span>3</span><PackageCheck /><h3>Wear it</h3><p>Prodigi routes it to a print lab and ships it to you.</p></article>
      </section>

      <section className="details" id="size-guide">
        <div className="detail-title"><p className="section-no">02 / THE SHIRT</p><h2>Your new<br />favorite artifact.</h2></div>
        <dl>
          <div><dt>Blank</dt><dd>Bella + Canvas 3001</dd></div>
          <div><dt>Fit</dt><dd>Unisex, tailored</dd></div>
          <div><dt>Fabric</dt><dd>100% combed cotton</dd></div>
          <div><dt>Color</dt><dd>Black / white print</dd></div>
          <div><dt>Care</dt><dd>Cold wash, inside out</dd></div>
          <div><dt>Sizes</dt><dd>XS—2XL</dd></div>
        </dl>
      </section>

      <footer>
        <a className="wordmark" href="#top">datetime<span>.store</span></a>
        <p>Made for this exact moment.</p>
        <p>© {new Date().getFullYear()} datetime.store</p>
      </footer>
    </main>
  );
}
