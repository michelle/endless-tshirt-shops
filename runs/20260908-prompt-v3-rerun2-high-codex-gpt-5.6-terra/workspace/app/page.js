"use client";

import { useMemo, useState } from "react";

const moods = ["Restless", "Grounded", "Electric", "Tender", "Brave"];
const colors = [
  { value: "black", label: "Night black", hex: "#151515" },
  { value: "natural", label: "Archive cream", hex: "#e8dfce" },
  { value: "navy blue", label: "Signal navy", hex: "#18253d" },
];

function hash(text) {
  return [...text].reduce((v, c) => ((v << 5) - v + c.charCodeAt(0)) | 0, 0) >>> 0;
}

function Signal({ name, place, mood }) {
  const seed = hash(`${name}|${place}|${mood}`);
  const bars = Array.from({ length: 18 }, (_, i) => 18 + ((seed >> (i % 24)) & 31) * 2);
  const code = (seed % 0xffffff).toString(16).padStart(6, "0").toUpperCase();
  return <div className="print-art" aria-label="Your custom signal print preview">
    <div className="print-kicker">SIGNAL FOUNDRY / 001</div>
    <div className="print-name">{name || "YOUR NAME"}</div>
    <div className="print-place">{place || "SOMEWHERE TRUE"}</div>
    <div className="pulse" aria-hidden="true">{bars.map((h, i) => <i key={i} style={{ height: `${h}px` }} />)}</div>
    <div className="print-meta"><span>STATE: {mood.toUpperCase()}</span><span>SF-{code}</span></div>
    <div className="crosshair" aria-hidden="true">✦</div>
  </div>;
}

export default function Home() {
  const [name, setName] = useState("");
  const [place, setPlace] = useState("");
  const [mood, setMood] = useState("Electric");
  const [size, setSize] = useState("m");
  const [color, setColor] = useState("black");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const selected = useMemo(() => colors.find((item) => item.value === color), [color]);

  async function checkout() {
    setError("");
    if (!name.trim() || !place.trim()) { setError("Add your name and the place you’re making this signal for."); return; }
    setBusy(true);
    try {
      const response = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, place, mood, size, color }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not start checkout.");
      window.location.assign(data.url);
    } catch (err) { setError(err.message); setBusy(false); }
  }

  return <main>
    <nav><a className="brand" href="#top">SIGNAL<br /><em>FOUNDRY</em></a><span className="nav-note">PERSONAL DTG EDITIONS</span><a href="#story">How it works</a></nav>
    <section className="hero" id="top">
      <div className="hero-copy"><p className="eyebrow">A wearable record of a real moment</p><h1>Make a signal<br />only <i>you</i> could send.</h1><p className="intro">Turn a name, a place and a feeling into a one-of-one field note — printed in full colour on a soft, made-to-order tee.</p><div className="hero-foot"><span>01 / CUSTOM GENERATED</span><span>02 / PRINTED TO ORDER</span></div></div>
      <div className="shirt-stage"><div className="shirt" style={{ "--shirt": selected.hex }}><div className="shirt-neck" /><Signal name={name} place={place} mood={mood} /></div><p>Every composition is generated from your details.</p></div>
    </section>
    <section className="builder" aria-labelledby="build-heading">
      <div className="builder-head"><p className="eyebrow">Build your edition</p><h2 id="build-heading">Your field signal</h2><p>There are no templates waiting in a warehouse. This is made when you say go.</p></div>
      <div className="form-grid">
        <label>Your name<input maxLength="32" placeholder="e.g. MIRA" value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label>The place<input maxLength="42" placeholder="e.g. COLDWATER CANYON" value={place} onChange={(e) => setPlace(e.target.value)} /></label>
        <fieldset><legend>What does it carry?</legend><div className="mood-row">{moods.map((item) => <button type="button" key={item} onClick={() => setMood(item)} className={mood === item ? "chosen" : ""}>{item}</button>)}</div></fieldset>
        <div className="select-row"><label>Size<select value={size} onChange={(e) => setSize(e.target.value)}>{["xs", "s", "m", "l", "xl", "2xl", "3xl", "4xl"].map((item) => <option key={item} value={item}>{item.toUpperCase()}</option>)}</select></label><fieldset><legend>Garment</legend><div className="swatches">{colors.map((item) => <button aria-label={item.label} title={item.label} type="button" key={item.value} style={{ background: item.hex }} className={color === item.value ? "chosen" : ""} onClick={() => setColor(item.value)} />)}</div></fieldset></div>
      </div>
      <aside className="order-card"><div><span>YOUR EDITION</span><strong>Signal Tee / 001</strong><small>Bella + Canvas 3001 · unisex fit</small></div><div className="price"><span>$36.00</span><small>+ $5.50 tracked shipping</small></div><button className="checkout" onClick={checkout} disabled={busy}>{busy ? "Opening secure checkout…" : "Make this signal →"}</button>{error && <p className="form-error" role="alert">{error}</p>}<p className="fine-print">Secure checkout via Stripe. Your shirt is only sent to print after payment clears.</p></aside>
    </section>
    <section className="story" id="story"><p className="eyebrow">The process</p><div><article><b>01</b><h3>Give it a pulse</h3><p>Your details become a unique signal code, typography and waveform.</p></article><article><b>02</b><h3>See it before it exists</h3><p>Fine-tune the feeling and garment. What you see is the print direction.</p></article><article><b>03</b><h3>We make one</h3><p>After payment, the final PNG is sent to our DTG print partner and dropshipped to you.</p></article></div></section>
    <footer><span>© {new Date().getFullYear()} SIGNAL FOUNDRY</span><span>MADE FOR THE MOMENTS THAT STICK</span></footer>
  </main>;
}
