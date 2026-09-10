"use client";

import { useMemo, useState } from "react";

type Design = { place: string; name: string; message: string; accent: string; size: string; color: string };

const defaults: Design = { place: "Joshua Tree, CA", name: "Maya", message: "stay curious", accent: "#f4a261", size: "M", color: "black" };
const accents = ["#f4a261", "#8ecae6", "#e9c46a", "#ff7f66", "#cdb4db"];
const colors = [{ name: "Night", value: "black", hex: "#111318" }, { name: "Ink", value: "navy blue", hex: "#172b4d" }, { name: "Cloud", value: "white", hex: "#f3f0e9" }];

function StarField({ accent, small = false }: { accent: string; small?: boolean }) {
  const stars = Array.from({ length: small ? 20 : 42 }, (_, i) => ({
    left: `${(i * 47 + 13) % 94}%`, top: `${(i * 71 + 9) % 88}%`, size: i % 9 === 0 ? 3 : i % 3 === 0 ? 2 : 1
  }));
  return <div className="star-field">{stars.map((s, i) => <i key={i} style={{ left: s.left, top: s.top, width: s.size, height: s.size, background: i % 7 === 0 ? accent : "#faf7ef" }} />)}</div>;
}

function Art({ design, small = false }: { design: Design; small?: boolean }) {
  return <div className={`art ${small ? "art-small" : ""}`} style={{ "--accent": design.accent } as React.CSSProperties}>
    <StarField accent={design.accent} small={small} />
    <div className="orbit orbit-one" /><div className="orbit orbit-two" />
    <div className="planet"><span /></div>
    <div className="art-copy"><span className="art-kicker">ORBITAL POST / 01</span><strong>{design.place.toUpperCase()}</strong><span className="art-name">{design.name.toUpperCase()} · {design.message.toUpperCase()}</span><span className="art-coords">34°08′N 116°18′W &nbsp; / &nbsp; ONE OF ONE</span></div>
  </div>;
}

function Step({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return <section className="builder-section"><div className="section-title"><span>{n}</span><h3>{title}</h3></div>{children}</section>;
}

export default function Storefront() {
  const [design, setDesign] = useState(defaults);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const update = (key: keyof Design, value: string) => setDesign((d) => ({ ...d, [key]: value }));
  const placeLabel = useMemo(() => design.place.trim() || "Your place", [design.place]);

  async function checkout() {
    setBusy(true); setNotice("");
    try {
      const response = await fetch("/api/checkout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ design }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Checkout could not start.");
      window.location.href = data.url;
    } catch (error) { setNotice(error instanceof Error ? error.message : "Something went wrong. Try again."); setBusy(false); }
  }

  return <main>
    <nav className="nav"><a className="brand" href="/"><span className="brand-star">✦</span> ORBITAL POST</a><div className="nav-links"><a href="#how">How it works</a><a href="#details">The details</a><span className="bag">01 <span className="bag-dot" /></span></div></nav>
    <section className="hero"><div className="hero-copy"><p className="eyebrow">MADE FOR YOUR MILESTONE</p><h1>Wear the place<br /><em>that changed you.</em></h1><p className="hero-intro">A one-of-one orbital postcard, designed from your coordinates and printed in full colour on a heavyweight cotton tee.</p><a className="text-link" href="#builder">Start your transmission <span>↓</span></a></div><div className="hero-art"><div className="hero-orbit" /><Art design={design} /></div></section>
    <section className="marquee"><span>YOUR STORY, IN ORBIT</span><span>DTG PRINTED ON DEMAND</span><span>NO TWO ALIKE</span><span>YOUR STORY, IN ORBIT</span></section>
    <section className="builder-wrap" id="builder"><div className="builder-intro"><p className="eyebrow">THE BUILDER</p><h2>Make it yours.</h2><p>Tell us where you were, who you were with, or what you&apos;re becoming. We&apos;ll turn it into a signal only you can wear.</p><div className="mini-note"><span>✦</span> Printed individually after checkout</div></div><div className="builder-grid"><div className="builder-form">
      <Step n="01" title="Name your coordinates"><label>PLACE OR MOMENT<input value={design.place} maxLength={28} onChange={(e) => update("place", e.target.value)} placeholder="e.g. Joshua Tree, CA" /></label><div className="two-col"><label>YOUR NAME<input value={design.name} maxLength={16} onChange={(e) => update("name", e.target.value)} placeholder="e.g. Maya" /></label><label>SHORT MESSAGE<input value={design.message} maxLength={18} onChange={(e) => update("message", e.target.value)} placeholder="e.g. stay curious" /></label></div></Step>
      <Step n="02" title="Choose your signal"><div className="swatches">{accents.map((color) => <button aria-label={`Accent ${color}`} className={`swatch ${design.accent === color ? "selected" : ""}`} key={color} style={{ background: color }} onClick={() => update("accent", color)} />)}</div><p className="field-hint">Accent colour</p></Step>
      <Step n="03" title="Find your fit"><div className="choice-row">{["S", "M", "L", "XL", "2XL", "3XL"].map((size) => <button className={`choice ${design.size === size ? "selected" : ""}`} key={size} onClick={() => update("size", size)}>{size}</button>)}</div><p className="field-hint">AS Colour 5001 · unisex, regular fit</p></Step>
      <Step n="04" title="Choose your base"><div className="color-row">{colors.map((color) => <button className={`color-choice ${design.color === color.value ? "selected" : ""}`} key={color.value} onClick={() => update("color", color.value)}><span style={{ background: color.hex }} />{color.name}</button>)}</div></Step>
      <div className="checkout-bar"><div><span className="price">$54</span><span className="shipping">includes shipping · made to order</span></div><button className="button button-orange" onClick={checkout} disabled={busy}>{busy ? "Opening checkout…" : "Send it to orbit ↗"}</button></div>{notice && <div className="notice">{notice}</div>}
    </div><div className="preview-sticky"><div className="tee-mock" style={{ "--tee": colors.find((c) => c.value === design.color)?.hex } as React.CSSProperties}><div className="tee-sleeve left" /><div className="tee-sleeve right" /><div className="tee-body"><div className="tee-neck" /><Art design={design} small /></div></div><p className="preview-label">LIVE PREVIEW <span>front print · 4200 × 5370 px</span></p></div></div></section>
    <section className="details" id="details"><div><p className="eyebrow">THE OBJECT</p><h2>Soft on you.<br /><em>Sharp in the world.</em></h2></div><div className="detail-copy"><p>Printed one at a time with direct-to-garment ink on the AS Colour 5001 — a premium, midweight cotton tee that holds its shape and your story.</p><div className="detail-list"><span><b>100%</b> combed cotton</span><span><b>72–120h</b> production window</span><span><b>1/1</b> made for you</span></div></div></section>
    <section className="how" id="how"><div className="how-head"><p className="eyebrow">THE SIGNAL PATH</p><h2>From memory<br /><em>to material.</em></h2></div><div className="steps"><div><span>01</span><h3>You set the coordinates</h3><p>Place, person, phrase — the raw material of a good story.</p></div><div><span>02</span><h3>We compose your signal</h3><p>Your details become an orbital postcard, generated just for your order.</p></div><div><span>03</span><h3>Prodigi makes the tee</h3><p>DTG printing, no stock sitting around, shipped to your front door.</p></div></div></section>
    <footer><a className="brand" href="/"><span className="brand-star">✦</span> ORBITAL POST</a><span>Made for the places we carry.</span><span>© 2026</span></footer>
  </main>;
}
