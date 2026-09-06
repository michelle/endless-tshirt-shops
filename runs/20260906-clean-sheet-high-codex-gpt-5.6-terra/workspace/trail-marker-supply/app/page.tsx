"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";

const sizes = ["S", "M", "L", "XL", "2XL"];
const colors = [
  { label: "Charcoal", value: "charcoal", swatch: "#34373a" },
  { label: "Forest", value: "forest", swatch: "#254233" },
  { label: "Cream", value: "cream", swatch: "#ddd5bf" },
];

export default function Home() {
  const [size, setSize] = useState("M");
  const [color, setColor] = useState("charcoal");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function checkout(event: FormEvent) {
    event.preventDefault(); setLoading(true); setError("");
    try {
      const response = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ size, color }) });
      const data = await response.json();
      if (!response.ok || !data.url) throw new Error(data.error || "Checkout could not start.");
      window.location.assign(data.url);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Checkout could not start."); setLoading(false); }
  }

  return <main>
    <header className="site-header"><a className="wordmark" href="#top" aria-label="Trail Marker Supply home"><span className="mark">▲</span> TRAIL MARKER</a><a className="header-link" href="#details">The shirt</a></header>
    <section className="hero" id="top">
      <Image src="/trail-marker-hero.png" alt="Charcoal topographic Trail Marker shirt on a mossy trailhead table" fill priority className="hero-image" sizes="100vw" />
      <div className="hero-shade" /><div className="hero-copy"><p className="eyebrow">Field edition / 01</p><h1>Carry the contour.</h1><p className="hero-description">A heavyweight trail shirt for people who still stop to read the map.</p><a className="outline-button" href="#shop">Pick your route <span>↓</span></a></div><div className="hero-note">Made only when you order<br />Printed &amp; shipped by Prodigi</div>
    </section>
    <section className="product" id="shop">
      <div className="product-art" aria-hidden="true"><div className="grid-lines" /><div className="elevation">04,892<span>FT</span></div><div className="summit-mark">▲</div><p>SUMMIT GRID<br />NORTHWEST / 47.6062° N</p></div>
      <div className="product-info"><p className="eyebrow orange">The first drop</p><h2>Summit Grid<br />Heavyweight Tee</h2><p className="price">$38 <span>USD</span></p><p className="product-copy">A relaxed, heavyweight 100% cotton tee with a quiet topo graphic and a single blaze-orange marker. Cut for trail days, campfire nights, and Sunday map planning.</p>
        <form onSubmit={checkout}><fieldset><legend>Color <span>{colors.find((item) => item.value === color)?.label}</span></legend><div className="swatches">{colors.map((item) => <button key={item.value} type="button" aria-label={item.label} aria-pressed={color === item.value} onClick={() => setColor(item.value)} className={color === item.value ? "selected" : ""}><span style={{ background: item.swatch }} /></button>)}</div></fieldset>
          <fieldset><legend>Size <a href="#details">Size guide</a></legend><div className="sizes">{sizes.map((item) => <button key={item} type="button" aria-pressed={size === item} onClick={() => setSize(item)}>{item}</button>)}</div></fieldset>
          <button className="buy-button" disabled={loading} type="submit">{loading ? "Opening secure checkout…" : "Add to pack — $38"} <span>→</span></button>{error && <p className="form-error" role="alert">{error}</p>}</form><p className="fine-print">Taxes and shipping are calculated securely at checkout.</p>
      </div>
    </section>
    <section className="details" id="details"><div><span className="number">01</span><h3>Heavy on purpose.</h3><p>American Apparel 1301. 100% US cotton, relaxed fit, and a substantial everyday weight.</p></div><div><span className="number">02</span><h3>Made for your route.</h3><p>Your shirt is printed after checkout—no warehouse dust, no dead stock.</p></div><div><span className="number">03</span><h3>Low-impact details.</h3><p>Water-based inks and plastic-free packaging where available through our print partner.</p></div></section>
    <footer><span>TRAIL MARKER SUPPLY / FIELD EDITION 01</span><span>Find your own way.</span></footer>
  </main>;
}
