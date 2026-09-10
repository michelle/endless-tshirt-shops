"use client";

import { FormEvent, useMemo, useState } from "react";

const moods = [
  { id: "stargazer", label: "Stargazer", icon: "✦", note: "curious & cosmic" },
  { id: "trailblazer", label: "Trailblazer", icon: "↗", note: "restless & brave" },
  { id: "daydreamer", label: "Daydreamer", icon: "☁", note: "soft & surreal" },
  { id: "nightowl", label: "Night owl", icon: "☾", note: "sharp after dark" },
];

const colors = [
  { id: "black", label: "Midnight", hex: "#171718" },
  { id: "white", label: "Cloud", hex: "#f5f0e8" },
  { id: "navy blue", label: "Deep blue", hex: "#183152" },
  { id: "oxblood black", label: "Oxblood", hex: "#3e1d26" },
];

export default function ShirtStudio() {
  const [name, setName] = useState("Avery");
  const [place, setPlace] = useState("Portland, OR");
  const [credo, setCredo] = useState("Find the quiet magic");
  const [mood, setMood] = useState("stargazer");
  const [color, setColor] = useState("black");
  const [size, setSize] = useState("m");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const currentMood = moods.find((item) => item.id === mood)!;
  const garment = colors.find((item) => item.id === color)!;
  const artUrl = useMemo(() => {
    const params = new URLSearchParams({ name, place, credo, mood, color });
    return `/api/print-art?${params}`;
  }, [name, place, credo, mood, color]);

  async function checkout(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, place, credo, mood, color, size }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Couldn’t start checkout.");
      window.location.assign(data.url);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong.");
      setLoading(false);
    }
  }

  return <>
    <header className="nav"><a className="brand" href="#studio">FUTUREFOLK<span>™</span></a><span className="nav-note">PERSONAL LEGENDS, PRINTED TO ORDER</span><a href="#how" className="nav-link">How it works</a></header>
    <section className="hero" id="studio">
      <div className="hero-copy"><p className="eyebrow">YOUR LIFE, IN LEGEND FORM</p><h1>Wear the story<br />only <em>you</em> can tell.</h1><p className="lede">Turn your personal coordinates into a collectible field-guide portrait, printed in vivid DTG color on a premium tee.</p><div className="chips"><span>✦ One-of-one art</span><span>◌ Printed on demand</span><span>↗ Ships in 3–5 days</span></div></div>
      <div className="hero-poster"><div className="poster-star">✦</div><p>THE FUTUREFOLK<br />FIELD GUIDE</p><b>NO TWO<br />LEGENDS<br />ALIKE</b><small>EST. RIGHT NOW</small></div>
    </section>
    <section className="studio-wrap">
      <div className="section-heading"><p className="eyebrow">MAKE YOUR MARK</p><h2>Build your field-guide tee</h2><p>Each detail becomes part of your custom print.</p></div>
      <div className="builder">
        <div className="preview-panel"><div className="shirt" style={{ background: garment.hex }}><div className="sleeve left" style={{ background: garment.hex }} /><div className="sleeve right" style={{ background: garment.hex }} /><div className="collar" /><img src={artUrl} alt={`Custom ${name} field-guide artwork`} /></div><p className="preview-caption">LIVE PREVIEW · FRONT PRINT</p></div>
        <form className="controls" onSubmit={checkout}>
          <label>YOUR NAME<input value={name} maxLength={28} required onChange={(e) => setName(e.target.value)} /></label>
          <label>YOUR HOME BASE<input value={place} maxLength={38} required onChange={(e) => setPlace(e.target.value)} /></label>
          <label>YOUR PERSONAL CREDO<textarea value={credo} maxLength={65} required onChange={(e) => setCredo(e.target.value)} /></label>
          <fieldset><legend>CHOOSE YOUR ENERGY</legend><div className="mood-grid">{moods.map((item) => <button type="button" key={item.id} className={mood === item.id ? "choice selected" : "choice"} onClick={() => setMood(item.id)}><b>{item.icon}</b><span>{item.label}</span><small>{item.note}</small></button>)}</div></fieldset>
          <fieldset><legend>TEE COLOR</legend><div className="swatches">{colors.map((item) => <button type="button" title={item.label} key={item.id} aria-label={item.label} className={color === item.id ? "swatch selected" : "swatch"} style={{ background: item.hex }} onClick={() => setColor(item.id)} />)}</div></fieldset>
          <fieldset><legend>SIZE</legend><div className="sizes">{["s", "m", "l", "xl", "2xl"].map((item) => <button type="button" key={item} className={size === item ? "size selected" : "size"} onClick={() => setSize(item)}>{item.toUpperCase()}</button>)}</div></fieldset>
          <div className="price"><span>YOUR ONE-OF-ONE</span><strong>$36</strong><small>US shipping calculated securely at checkout</small></div>
          <button className="checkout" type="submit" disabled={loading}>{loading ? "Opening secure checkout…" : "Make it mine →"}</button>
          {error && <p className="error" role="alert">{error}</p>}
          <p className="secure">SECURE CHECKOUT · SHIRTS ARE MADE ONLY AFTER PAYMENT</p>
        </form>
      </div>
    </section>
    <section id="how" className="how"><p className="eyebrow">FROM YOU TO YOUR DOOR</p><div><article><b>01</b><h3>Tell us your coordinates</h3><p>Name, home base, mantra and mood become a graphic that belongs only to you.</p></article><article><b>02</b><h3>We print it for real</h3><p>Your art is prepared at print resolution and DTG-printed onto your selected tee.</p></article><article><b>03</b><h3>Meet your future self</h3><p>Your made-to-order legend is sent directly to your door. No inventory, no waste.</p></article></div></section>
    <footer><span>FUTUREFOLK™</span><span>ONE OF ONE. ALWAYS.</span><span>MADE AFTER YOU SAY YES.</span></footer>
  </>;
}
