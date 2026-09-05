"use client";

import { useEffect, useMemo, useState } from "react";

type ShirtStyle = "fitted" | "unisex";
type Size = "S" | "M" | "L" | "XL";

const PRICE = 22.5;
const ORIGINAL_PRICE = 30;
const sizes: Size[] = ["S", "M", "L", "XL"];

function pad(value: number, length = 2) {
  return String(value).padStart(length, "0");
}

function formatTimestamp(value: number | null) {
  if (!value) return "0000000000000";
  return String(value);
}

function formatIso(value: number | null) {
  if (!value) return "syncing with the atomic clock";
  const date = new Date(value);
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}.${pad(date.getUTCMilliseconds(), 3)} UTC`;
}

function ShirtPreview({ style, timestamp }: { style: ShirtStyle; timestamp: string }) {
  return (
    <div className="shirt-stage" aria-label={`${style} black t-shirt with timestamp ${timestamp}`}>
      <div className={`tee tee-${style}`}>
        <div className="tee-shadow" />
        <div className="tee-collar" />
        <div className="tee-seam tee-seam-left" />
        <div className="tee-seam tee-seam-right" />
        <div className="tee-art"><span>{timestamp}</span></div>
        <div className="tee-label">datetime.store</div>
      </div>
      <div className="stage-grid" />
      <div className="stage-caption"><span>one of one</span><span>updates every millisecond</span></div>
    </div>
  );
}

function OptionButton({ active, children, onClick, ariaLabel }: { active: boolean; children: React.ReactNode; onClick: () => void; ariaLabel: string }) {
  return (
    <button type="button" className={`option-button${active ? " is-active" : ""}`} onClick={onClick} aria-label={ariaLabel} aria-pressed={active}>
      {children}
    </button>
  );
}

export default function Home() {
  const [now, setNow] = useState<number | null>(null);
  const [style, setStyle] = useState<ShirtStyle>("fitted");
  const [size, setSize] = useState<Size>("M");
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [success, setSuccess] = useState(false);
  const [fulfillment, setFulfillment] = useState("pending");
  const [orderId, setOrderId] = useState("");
  const [canceled, setCanceled] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialize = window.setTimeout(() => {
      setSuccess(params.get("success") === "1");
      setCanceled(params.get("canceled") === "1");
      setNow(Date.now());
    }, 0);
    const timer = window.setInterval(() => setNow(Date.now()), 42);
    return () => { window.clearTimeout(initialize); window.clearInterval(timer); };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    if (!sessionId || params.get("success") !== "1") return;
    let active = true;
    fetch("/api/fulfill", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId }) })
      .then((response) => response.json())
      .then((payload) => {
        if (!active) return;
        if (payload.orderId || payload.alreadyFulfilled) {
          setOrderId(payload.orderId || "");
          setFulfillment("sandboxed");
        }
      })
      .catch(() => active && setFulfillment("pending"));
    return () => { active = false; };
  }, []);

  const timestamp = formatTimestamp(now);
  const isoTimestamp = useMemo(() => formatIso(now), [now]);

  async function startCheckout() {
    setCheckoutError("");
    setIsCheckingOut(true);
    try {
      const response = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ style, size, timestampMs: now || Date.now() }) });
      const payload = await response.json();
      if (!response.ok || !payload.url) throw new Error(payload.error || "Checkout is momentarily unavailable.");
      window.location.assign(payload.url);
    } catch (error) {
      setIsCheckingOut(false);
      setCheckoutError(error instanceof Error ? error.message : "Checkout is momentarily unavailable.");
    }
  }

  function reset() {
    window.history.replaceState({}, "", window.location.pathname);
    setSuccess(false); setCanceled(false); setOrderId(""); setFulfillment("pending");
  }

  return (
    <main>
      <nav className="topbar" aria-label="Main navigation">
        <a className="wordmark" href="#top" aria-label="datetime.store home">datetime<span>.store</span></a>
        <div className="nav-meta"><span className="live-dot" aria-hidden="true" /><span>live merch / edition 01</span><a href="#details">details</a></div>
      </nav>

      <div id="top" className="site-shell">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow">a wearable timestamp</p>
            <h1 id="hero-title">The present,<br /><em>printed.</em></h1>
            <p className="hero-description">A black tee with the exact moment you claimed it. No reruns. No backstock. Just now.</p>
            <div className="hero-note"><span className="note-rule" /><span>made to order in the moment</span></div>
          </div>
          <div className="hero-index" aria-hidden="true"><span>01</span><span>2026</span></div>
        </section>

        <section className="shop-grid" aria-label="Configure your datetime shirt">
          <div className="product-column">
            <ShirtPreview style={style} timestamp={timestamp} />
            <div className="product-footnote"><span>black / cotton / direct-to-garment</span><span>your timestamp: {isoTimestamp}</span></div>
          </div>

          <aside className="buy-card" aria-labelledby="product-title">
            {success ? (
              <div className="success-state">
                <div className="success-mark" aria-hidden="true">✓</div>
                <p className="eyebrow">order received</p>
                <h2 id="product-title">You got<br /><em>the moment.</em></h2>
                <p className="success-copy">Your timestamp is locked and your tee is queued for fulfillment.</p>
                <div className="order-status"><span className="status-label">print status</span><span>{fulfillment === "sandboxed" ? "sandbox order created" : "payment confirmed"}</span></div>
                {orderId && <p className="order-id">Prodigi order {orderId}</p>}
                <button className="text-button" type="button" onClick={reset}>← start another order</button>
              </div>
            ) : (
              <>
                <div className="card-heading">
                  <p className="eyebrow">your configuration</p>
                  <div className="price-row"><h2 id="product-title">datetime tee</h2><div className="price"><del>${ORIGINAL_PRICE.toFixed(2)}</del> ${PRICE.toFixed(2)}</div></div>
                  <p className="card-subtitle">one shirt. one timestamp. yours.</p>
                </div>

                <div className="control-group"><div className="control-label"><span>cut</span><span className="control-value">{style === "fitted" ? "fitted" : "unisex"}</span></div><div className="option-grid two-up">
                  <OptionButton active={style === "fitted"} onClick={() => setStyle("fitted")} ariaLabel="Choose fitted cut">fitted</OptionButton>
                  <OptionButton active={style === "unisex"} onClick={() => setStyle("unisex")} ariaLabel="Choose unisex cut">unisex</OptionButton>
                </div></div>

                <div className="control-group"><div className="control-label"><span>size</span><span className="control-value">{size}</span></div><div className="option-grid four-up">
                  {sizes.map((item) => <OptionButton key={item} active={size === item} onClick={() => setSize(item)} ariaLabel={`Choose size ${item}`}>{item}</OptionButton>)}
                </div><a className="size-guide" href="#details">size guide <span>↗</span></a></div>

                <div className="checkout-divider" /><div className="checkout-summary"><span>subtotal</span><strong>${PRICE.toFixed(2)}</strong><span>shipping</span><strong className="free">free</strong></div>
                <button className="buy-button" type="button" onClick={startCheckout} disabled={isCheckingOut}><span>{isCheckingOut ? "opening secure checkout…" : "buy the moment"}</span><span aria-hidden="true">→</span></button>
                {checkoutError && <p className="error-message" role="alert">{checkoutError}</p>}
                {canceled && <p className="cancel-message" role="status">No charge made. Your timestamp is still here when you’re ready.</p>}
                <p className="secure-note"><span aria-hidden="true">⌁</span> secure payment via Stripe · free US shipping</p>
              </>
            )}
          </aside>
        </section>

        <section id="details" className="details-section" aria-labelledby="details-heading">
          <div className="details-intro"><p className="eyebrow">the fine print, in plain english</p><h2 id="details-heading">Time is the<br /><em>design.</em></h2></div>
          <div className="details-list">
            <div className="detail-row"><span>01</span><div><h3>Made on demand</h3><p>Each shirt is printed after checkout, so there’s no warehouse full of yesterday.</p></div></div>
            <div className="detail-row"><span>02</span><div><h3>Heavyweight cotton</h3><p>A soft, everyday black tee with a crisp white timestamp across the chest.</p></div></div>
            <div className="detail-row"><span>03</span><div><h3>Take your usual size</h3><p>Fitted is closer to the body. Unisex is relaxed with a little extra room.</p></div></div>
          </div>
        </section>
      </div>
      <footer className="footer"><span>datetime.store — the shop of right now</span><span>© {new Date().getFullYear()}</span></footer>
    </main>
  );
}
