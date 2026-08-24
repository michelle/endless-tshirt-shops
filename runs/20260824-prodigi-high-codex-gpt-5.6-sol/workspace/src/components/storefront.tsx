"use client";

import { useEffect, useState } from "react";
import { Logo } from "@/components/logo";
import { ShirtPreview } from "@/components/shirt-preview";
import {
  SHIRT_SIZES,
  SHIRT_STYLES,
  shirtConfig,
  type ShirtSize,
  type ShirtStyle,
} from "@/lib/products";

export function Storefront({ priceCents, currency }: { priceCents: number; currency: string }) {
  const [style, setStyle] = useState<ShirtStyle>("fitted");
  const [size, setSize] = useState<ShirtSize>("M");
  const [timestamp, setTimestamp] = useState("0000000000000");
  const [frozenAt, setFrozenAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [canceled, setCanceled] = useState(false);

  useEffect(() => {
    const initial = window.setTimeout(() => {
      setCanceled(new URLSearchParams(window.location.search).get("canceled") === "1");
      setTimestamp(String(Date.now()));
    }, 0);
    const tick = () => setTimestamp(String(Date.now()));
    const timer = window.setInterval(tick, 31);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, []);

  const beginCheckout = async () => {
    const exactMoment = String(Date.now());
    setFrozenAt(exactMoment);
    setLoading(true);
    setError("");
    setCanceled(false);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ style, size, timestamp: exactMoment }),
      });
      const payload = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !payload.url) throw new Error(payload.error || "Checkout could not start");
      window.location.assign(payload.url);
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "Checkout could not start");
      setLoading(false);
      setFrozenAt(null);
    }
  };

  const shownTimestamp = frozenAt ?? timestamp;
  const price = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(priceCents / 100);

  return (
    <main>
      <header className="site-header">
        <Logo />
        <div className="header-actions">
          {process.env.NEXT_PUBLIC_STORE_MODE !== "live" && <span className="test-badge">Sandbox preview</span>}
          <a className="header-link" href="#story">
            The idea <span aria-hidden="true">↘</span>
          </a>
        </div>
      </header>

      {(canceled || error) && (
        <div className="notice" role="status">
          <span>{error || "Checkout canceled — your moment is live again."}</span>
          <button type="button" onClick={() => { setCanceled(false); setError(""); }} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}

      <section className="hero" aria-labelledby="product-title">
        <div className="hero-copy">
          <p className="eyebrow">A one-of-one timestamp tee</p>
          <h1 id="product-title">
            Wear this
            <br />
            <em>exact</em> moment.
          </h1>
          <p className="intro">
            A black cotton shirt printed with the Unix timestamp from the instant you choose to
            check out. Thirteen digits. Never repeated.
          </p>

          <div className="price-row">
            <strong>{price}</strong>
            {priceCents < 3000 && <s>$30.00</s>}
            <span>free US shipping</span>
          </div>

          <div className="option-group">
            <div className="option-heading">
              <span>01 / Cut</span>
              <small>{shirtConfig[style].description}</small>
            </div>
            <div className="segmented two" role="radiogroup" aria-label="Shirt cut">
              {SHIRT_STYLES.map((value) => (
                <button
                  type="button"
                  role="radio"
                  aria-checked={style === value}
                  className={style === value ? "selected" : ""}
                  key={value}
                  onClick={() => setStyle(value)}
                  disabled={loading}
                >
                  {shirtConfig[value].label}
                </button>
              ))}
            </div>
          </div>

          <div className="option-group">
            <div className="option-heading">
              <span>02 / Size</span>
              <a href="#sizing">Size guide</a>
            </div>
            <div className="segmented four" role="radiogroup" aria-label="Shirt size">
              {SHIRT_SIZES.map((value) => (
                <button
                  type="button"
                  role="radio"
                  aria-checked={size === value}
                  className={size === value ? "selected" : ""}
                  key={value}
                  onClick={() => setSize(value)}
                  disabled={loading}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

          <button className="checkout-button" type="button" onClick={beginCheckout} disabled={loading}>
            <span>{loading ? "Freezing your moment…" : "Choose this moment"}</span>
            <span aria-hidden="true">{loading ? "···" : "→"}</span>
          </button>
          <p className="checkout-note">
            <span aria-hidden="true">⌁</span> Secure Stripe checkout · made to order by Prodigi
          </p>
        </div>

        <div className="hero-product">
          <div className="edition-tag">
            <span>Edition</span>
            <strong>{shownTimestamp.slice(-6)}</strong>
          </div>
          <ShirtPreview style={style} timestamp={shownTimestamp} />
          <div className="product-footnote">
            <span>front print</span>
            <span>100% cotton</span>
          </div>
        </div>
      </section>

      <section className="story" id="story">
        <p className="eyebrow">The smallest possible souvenir</p>
        <div className="story-grid">
          <h2>Time moves on.<br />This shirt doesn’t.</h2>
          <div>
            <p>
              Unix time counts every millisecond since January 1, 1970. Click checkout and one
              number becomes yours—typeset in white and printed across the chest.
            </p>
            <ol>
              <li><span>01</span> Pick your cut and size.</li>
              <li><span>02</span> Freeze the timestamp.</li>
              <li><span>03</span> We print and ship it to you.</li>
            </ol>
          </div>
        </div>
      </section>

      <section className="details" id="sizing">
        <div>
          <p className="eyebrow">Fit & care</p>
          <h2>Made for regular rotation.</h2>
        </div>
        <div className="detail-card">
          <h3>Fitted</h3>
          <p>Close, shaped silhouette. If you prefer ease through the body, size up.</p>
          <span>Bella + Canvas 6004 · S–XL</span>
        </div>
        <div className="detail-card">
          <h3>Unisex</h3>
          <p>Classic retail fit with a little more room. Choose your usual t-shirt size.</p>
          <span>Bella + Canvas 3001 · S–XL</span>
        </div>
        <div className="detail-card care">
          <h3>Care</h3>
          <p>Wash cold, inside out. Tumble dry low. Don’t iron directly over the print.</p>
          <span>Printed on demand · less waste</span>
        </div>
      </section>

      <footer>
        <Logo />
        <p>One shirt. One number. One exact moment.</p>
        <span>© {new Date().getFullYear()} datetime.store</span>
      </footer>
    </main>
  );
}
