"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cleanDesign, drawPrintArtwork, makeStars, type DesignInput } from "../lib/design";

const initial: DesignInput = { name: "Mira", date: "2024-08-17", place: "Big Sur, California" };

function StarChart({ input }: { input: DesignInput }) {
  const design = useMemo(() => cleanDesign(input), [input]);
  const stars = useMemo(() => makeStars(design), [design]);
  const lines = [[0,3,1,2,5],[6,4,7],[1,7,3]];
  return <svg className="chart-art" viewBox="0 0 468 579" role="img" aria-label={`Personal star map for ${design.name}, ${design.date}`}>
    <g transform="translate(0 104)" textAnchor="middle">
      <g fill="none" stroke="#183f4b" strokeOpacity=".3" strokeWidth=".7">
        {lines.map((path, n) => <polyline key={n} points={path.map((i) => `${stars[i].x},${stars[i].y}`).join(" ")} />)}
        <path d="M 91 303 A 143 143 0 1 1 315 111" strokeOpacity=".22" strokeWidth=".55" />
        <path d="M 253 88 A 154 154 0 1 1 90 244" strokeOpacity=".22" strokeWidth=".55" />
      </g>
      {stars.map((star, i) => <g key={i}>
        {star.glow && <g stroke="#c88753" strokeOpacity=".55" strokeWidth=".55"><path d={`M${star.x-4} ${star.y}h8M${star.x} ${star.y-4}v8`} /></g>}
        <circle cx={star.x} cy={star.y} r={star.r} fill={i % 7 === 0 ? "#c88753" : "#183f4b"} />
      </g>)}
      <circle cx="230" cy="84" r="4" fill="#c88753" />
      <text x="230" y="38" className="chart-kicker">A SKY OF YOUR OWN</text>
      <text x="230" y="462" className="chart-name">{design.name}</text>
      <text x="230" y="485" className="chart-date">{new Date(`${design.date}T12:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }).toUpperCase()}</text>
      <text x="230" y="504" className="chart-place">{design.place.toUpperCase()}</text>
      <path d="M198 524h64" stroke="#c88753" strokeWidth=".7" />
    </g>
  </svg>;
}

export default function DesignStudio() {
  const [design, setDesign] = useState(initial);
  const [size, setSize] = useState("m");
  const [busy, setBusy] = useState(false);
  const [checkoutReady, setCheckoutReady] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("paid") === "1") setNotice("Payment received. Your personalized shirt is being prepared for print.");
    if (params.get("canceled") === "1") setNotice("Checkout canceled. Your design is still here when you’re ready.");
  }, []);

  useEffect(() => {
    fetch("/api/store-status").then((response) => response.json() as Promise<{ checkoutReady?: boolean }>).then((status) => setCheckoutReady(Boolean(status.checkoutReady))).catch(() => setCheckoutReady(false)).finally(() => setCheckingStatus(false));
  }, []);

  function update(key: keyof DesignInput, value: string) {
    setDesign((current) => ({ ...current, [key]: value }));
    setError("");
  }

  async function checkout() {
    setBusy(true); setError(""); setNotice("");
    try {
      if (!canvasRef.current) throw new Error("The design preview is still loading. Try again in a moment.");
      drawPrintArtwork(canvasRef.current, design);
      const blob = await new Promise<Blob>((resolve, reject) => canvasRef.current!.toBlob((file) => file ? resolve(file) : reject(new Error("We couldn’t prepare the print file.")), "image/png"));
      const saved = await fetch("/api/design", { method: "POST", headers: { "Content-Type": "image/png" }, body: blob });
      const savedData = await saved.json() as { id?: string; error?: string };
      if (!saved.ok) throw new Error(savedData.error ?? "Your design could not be saved.");
      const response = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ designKey: savedData.id, design: cleanDesign(design), size }) });
      const result = await response.json() as { url?: string; error?: string };
      if (!response.ok) throw new Error(result.error ?? "Checkout could not be started.");
      if (!result.url) throw new Error("Checkout did not return a payment link.");
      window.location.assign(result.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setBusy(false);
    }
  }

  return <main className="store-shell">
    <div className="top-note">MADE TO ORDER · PRINTED JUST FOR YOU</div>
    <header className="site-header">
      <a className="brand" href="#top" aria-label="Orbit and Origin home"><span className="brand-mark"><i /><i /><i /></span><span>ORBIT <em>&</em> ORIGIN</span></a>
      <nav aria-label="Main navigation"><a href="#story">The idea</a><a href="#details">Details</a></nav>
      <a href="#customize" className="header-link">MAKE YOURS <span>↗</span></a>
    </header>
    <section className="hero" id="top">
      <div className="hero-copy">
        <p className="eyebrow"><span /> ONE DATE. ONE PLACE. ONE SKY.</p>
        <h1>Wear a moment<br />that’s <i>yours.</i></h1>
        <p className="hero-intro">A custom star map, drawn from the details you choose. Made into a soft, everyday tee and printed just for you.</p>
        <a className="primary-cta" href="#customize">DESIGN YOUR STAR MAP <span>↓</span></a>
        <p className="hero-footnote">BELLA + CANVAS 3001 · $38 <span>·</span> FREE US SHIPPING</p>
      </div>
      <div className="hero-visual" aria-label="Preview of a personalized star map tee">
        <div className="visual-index">01 / A PERSONAL SKY</div>
        <div className="shirt-wrap"><img src="/tee-base.jpg" alt="White Bella + Canvas 3001 crew-neck t-shirt" /><div className="shirt-print"><StarChart input={initial} /></div></div>
        <div className="visual-caption"><span>PRINTED IN FULL COLOR</span><span>01 — 03</span></div>
        <div className="orbit-note">Your moment,<br /><i>mapped in stars.</i></div>
      </div>
      <div className="hero-rule"><span>01</span><span>THE PERSONAL SKY TEE</span><span>SCROLL TO EXPLORE</span><span>↓</span></div>
    </section>
    <section className="customizer-section" id="customize">
      <div className="section-heading"><div><p className="eyebrow">MAKE IT MEAN SOMETHING</p><h2>Start with a moment.</h2></div><p>Three small details become a map that belongs only to you.</p></div>
      {notice && <div className="notice" role="status">{notice}</div>}
      <div className="customizer-grid">
        <div className="form-panel">
          <label className="field"><span>01 / NAME OR WORD</span><input maxLength={24} value={design.name} onChange={(e) => update("name", e.target.value)} placeholder="The name to print" /><small>Up to 24 characters</small></label>
          <label className="field"><span>02 / A DATE TO KEEP</span><input type="date" value={design.date} onChange={(e) => update("date", e.target.value)} /></label>
          <label className="field"><span>03 / WHERE IT HAPPENED</span><input maxLength={32} value={design.place} onChange={(e) => update("place", e.target.value)} placeholder="City, place, or coordinates" /><small>A place name or coordinates</small></label>
          <div className="field"><span>04 / YOUR SIZE</span><div className="sizes" role="group" aria-label="T-shirt size">{["xs","s","m","l","xl","2xl","3xl","4xl"].map((item) => <button key={item} className={size === item ? "size selected" : "size"} onClick={() => setSize(item)} aria-pressed={size === item}>{item.toUpperCase()}</button>)}</div><a className="size-link" href="#details">Bella + Canvas unisex fit · see details</a></div>
          <div className="order-summary"><div><span>Bella + Canvas 3001 · White</span><strong>$38</strong></div><div><span>US shipping</span><span>On us</span></div><div className="total"><span>Total</span><strong>$38 USD</strong></div></div>
          <button className="checkout-button" onClick={checkout} disabled={busy || !checkoutReady}>{busy ? "PREPARING YOUR DESIGN…" : checkingStatus ? "CHECKING CHECKOUT…" : checkoutReady ? "CONTINUE TO SECURE CHECKOUT" : "CHECKOUT SETUP IN PROGRESS"}<span>↗</span></button>
          <p className="checkout-note">{checkoutReady ? "Secure checkout powered by Stripe · US shipping only" : "Design your shirt now. Secure checkout will open once the store is connected."}</p>
          {error && <p className="form-error" role="alert">{error}</p>}
        </div>
        <div className="preview-panel">
          <div className="preview-meta"><span>LIVE PREVIEW</span><span>PRINT AREA · FRONT</span></div>
          <div className="preview-shirt"><img src="/tee-base.jpg" alt="White shirt preview" /><div className="preview-art"><StarChart input={design} /></div></div>
          <div className="preview-caption"><span>YOUR STAR MAP</span><span>Changes as you type</span></div>
          <canvas ref={canvasRef} className="print-canvas" aria-hidden="true" />
        </div>
      </div>
    </section>
    <section className="story-section" id="story"><div className="story-number">02 / THE IDEA</div><div className="story-content"><p className="eyebrow">A LITTLE COSMIC, A LOT PERSONAL</p><h2>The sky is always<br /><i>changing.</i></h2><p>Each print is an original, stylized star pattern generated from the name, date and place you choose. It’s a personal sky to remember a moment by, not a scientific record of the stars.</p><div className="story-signature">MADE FOR YOUR MOMENT <span>✳</span></div></div><div className="story-orbit" aria-hidden="true"><div className="ring ring-one" /><div className="ring ring-two" /><div className="ring ring-three" /><span>O</span><i>✦</i></div></section>
    <section className="details-section" id="details"><div><p className="eyebrow">BUILT FOR THE EVERYDAY</p><h2>A good tee.<br /><i>A better story.</i></h2></div><div className="details-list"><article><span>01</span><div><h3>Soft, easy fit</h3><p>Bella + Canvas 3001, a lightweight unisex crew neck in 100% cotton.</p></div></article><article><span>02</span><div><h3>Made one at a time</h3><p>Your artwork is printed to order with direct-to-garment color for fine lines and small details.</p></div></article><article><span>03</span><div><h3>Designed to be kept</h3><p>Machine wash cold, inside out. Skip bleach and tumble drying to help the print last.</p></div></article></div></section>
    <footer><a className="brand" href="#top"><span className="brand-mark"><i /><i /><i /></span><span>ORBIT <em>&</em> ORIGIN</span></a><span>YOUR MOMENT, MADE VISIBLE.</span><a href="#customize">MAKE YOURS ↑</a></footer>
  </main>;
}
