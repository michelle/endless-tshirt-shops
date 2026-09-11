"use client";

import { FormEvent, useMemo, useState } from "react";

const palettes = {
  "black": { shirt: "#121314", ink: "#f4e7ca", trim: "#ef6947" },
  "white": { shirt: "#f2f0e9", ink: "#1e2523", trim: "#e14e34" },
  "navy blue": { shirt: "#102e4d", ink: "#f5e9cc", trim: "#f3a649" },
  "heather grey": { shirt: "#a9aba9", ink: "#16211f", trim: "#ed5c3f" },
} as const;

type Color = keyof typeof palettes;

export default function TeeCustomizer() {
  const [name, setName] = useState("Mara");
  const [place, setPlace] = useState("Echo Canyon");
  const [ritual, setRitual] = useState("makes coffee at sunrise");
  const [year, setYear] = useState("2047");
  const [size, setSize] = useState("m");
  const [color, setColor] = useState<Color>("black");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const query = useMemo(() => new URLSearchParams({ name, place, ritual, year }).toString(), [name, place, ritual, year]);
  const artUrl = `/api/print-art?${query}`;
  const palette = palettes[color];

  async function checkout(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, place, ritual, year, size, color }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not start checkout.");
      window.location.assign(data.url);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Could not start checkout.");
      setLoading(false);
    }
  }

  return <>
    <nav><a className="brand" href="#top"><span>FFC</span> Future Fossil Club</a><div className="nav-note">Small-batch lore, printed for real life.</div></nav>
    <section className="hero" id="top">
      <div className="hero-copy">
        <p className="eyebrow">ARCHIVE SERIES 001 · YOU WERE HERE</p>
        <h1>Wear the relic<br/><i>before it’s history.</i></h1>
        <p className="lede">Turn your daily obsession into a museum-exhibit tee. Every print is generated from your own tiny piece of lore, then made to order with DTG ink.</p>
        <div className="micro-proof"><span>✦</span> Printed one at a time <span>✦</span> No two archive tags alike</div>
      </div>
      <div className="orbit"><span>THE FUTURE<br/>REMEMBERS</span><b>↗</b></div>
    </section>
    <section className="maker" aria-label="Customize your Future Fossil tee">
      <form className="controls" onSubmit={checkout}>
        <div className="section-kicker">BUILD YOUR EXHIBIT LABEL</div>
        <label>Your name or nickname<input maxLength={26} value={name} onChange={e => setName(e.target.value)} required /></label>
        <label>Your place<input maxLength={30} value={place} onChange={e => setPlace(e.target.value)} required /></label>
        <label>Your signature ritual<input maxLength={46} value={ritual} onChange={e => setRitual(e.target.value)} required /></label>
        <label>Archive year<input inputMode="numeric" pattern="[0-9]{4}" maxLength={4} value={year} onChange={e => setYear(e.target.value)} required /></label>
        <fieldset><legend>Shirt color</legend><div className="swatches">
          {(Object.keys(palettes) as Color[]).map(option => <button type="button" aria-label={option} aria-pressed={color === option} key={option} className={color === option ? "swatch active" : "swatch"} onClick={() => setColor(option)}><span style={{ background: palettes[option].shirt }} /></button>)}
        </div></fieldset>
        <label>Size<select value={size} onChange={e => setSize(e.target.value)}><option value="s">S</option><option value="m">M</option><option value="l">L</option><option value="xl">XL</option><option value="2xl">2XL</option></select></label>
        <button className="buy" disabled={loading} type="submit">{loading ? "Opening secure checkout…" : "Claim this relic · $44"}<span>→</span></button>
        <p className="fine">US standard shipping included. Your personal artwork is made to order.</p>
        {error && <p className="error" role="alert">{error}</p>}
      </form>
      <div className="preview-wrap">
        <div className="preview-label"><span>LIVE PRINT PREVIEW</span><span>FRONT / 01</span></div>
        <div className="tee" style={{ "--shirt": palette.shirt } as React.CSSProperties}>
          <div className="collar" />
          <img className="art" src={artUrl} alt={`Museum label tee for ${name}`} />
        </div>
        <div className="specs"><span>AS COLOUR 5001</span><span>100% COTTON</span><span>DTG FRONT PRINT</span></div>
      </div>
    </section>
    <section className="how"><p className="eyebrow">HOW IT BECOMES REAL</p><div><article><b>01</b><h2>Write the lore</h2><p>A name, a place, a habit. Your mundane detail becomes the artifact description.</p></article><article><b>02</b><h2>We archive it</h2><p>Your custom exhibit label is composed as crisp, full-color vector art—not a template dropped on a shirt.</p></article><article><b>03</b><h2>You wear it out</h2><p>We print your one-off tee with direct-to-garment ink and ship it to your door.</p></article></div></section>
    <footer><span>FUTURE FOSSIL CLUB © 2026</span><span>MADE FOR THE STORIES YOU ALMOST FORGOT</span></footer>
  </>;
}
