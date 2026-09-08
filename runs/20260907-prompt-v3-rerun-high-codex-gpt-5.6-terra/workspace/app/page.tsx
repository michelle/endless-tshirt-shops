"use client";

import { FormEvent, useMemo, useState } from "react";

const signs = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
const palettes = [
  { id: "amber", label: "Solar amber", hex: "#ffc847" },
  { id: "blue", label: "Blue hour", hex: "#72b7ff" },
  { id: "rose", label: "Rose signal", hex: "#ff8bbd" }
];

export default function Storefront() {
  const [name, setName] = useState("Avery");
  const [place, setPlace] = useState("LOS ANGELES, CA");
  const [sign, setSign] = useState("Aquarius");
  const [palette, setPalette] = useState("amber");
  const [color, setColor] = useState("black");
  const [size, setSize] = useState("m");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const designUrl = useMemo(() => {
    const params = new URLSearchParams({ name: name || "YOUR NAME", place: place || "YOUR COORDINATES", sign, palette });
    return `/api/design?${params}`;
  }, [name, place, sign, palette]);

  async function checkout(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, place, sign, palette, color, size })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Checkout could not start.");
      window.location.assign(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <main>
      <section className="hero">
        <nav><a className="brand" href="#top">STAR SIGNAL <i>STUDIO</i></a><span className="nav-note">MADE FOR YOUR ORBIT</span><a href="#create">CREATE YOURS ↓</a></nav>
        <div className="hero-grid" id="top">
          <div className="hero-copy">
            <p className="eyebrow">PERSONAL SKY WEAR · ISSUE 001</p>
            <h1>Wear the<br/><em>coordinates</em><br/>of your story.</h1>
            <p className="lede">A small celestial field note, made only once—using your name, your place and your sign. Printed in durable, vivid DTG color on organic cotton.</p>
            <a className="button" href="#create">BUILD MY SIGNAL <span>↗</span></a>
            <div className="proof"><span>✦</span><p>Printed to order<br/><b>Zero overproduction</b></p><span>✦</span><p>Organic cotton<br/><b>DTG full color</b></p></div>
          </div>
          <div className="hero-art"><div className="orb orb-a"/><div className="orb orb-b"/><div className="shoot">✦</div><div className="shirt-silhouette"><img src={designUrl} alt="A personalized celestial design"/></div><p>THE NIGHT YOU CHOSE / <b>YOUR SIGNAL</b></p></div>
        </div>
      </section>

      <section className="story"><p className="eyebrow">NOT MERCH. A MARKER.</p><h2>Every signal starts<br/>somewhere.</h2><p>Star Signal turns the details you carry—home, identity, a little cosmic shorthand—into a wearable artifact. No templates sitting on a shelf. Your edition is generated when you make it.</p></section>

      <section className="builder" id="create">
        <div className="builder-title"><p className="eyebrow">THE SIGNAL GENERATOR</p><h2>Make it<br/><em>unmistakably</em> yours.</h2><p>It takes less than a minute. We turn the inputs into a print-ready celestial field note and ship it from the closest available print lab.</p></div>
        <form onSubmit={checkout}>
          <label>01 / YOUR NAME<input value={name} onChange={e => setName(e.target.value.slice(0, 24))} maxLength={24} placeholder="Avery" required /></label>
          <label>02 / YOUR PLACE<input value={place} onChange={e => setPlace(e.target.value.toUpperCase().slice(0, 28))} maxLength={28} placeholder="LOS ANGELES, CA" required /></label>
          <label>03 / YOUR SIGN<select value={sign} onChange={e => setSign(e.target.value)}>{signs.map(item => <option key={item}>{item}</option>)}</select></label>
          <fieldset><legend>04 / SIGNAL COLOR</legend><div className="palette">{palettes.map(item => <button type="button" aria-label={item.label} className={palette === item.id ? "swatch active" : "swatch"} key={item.id} onClick={() => setPalette(item.id)} style={{ backgroundColor: item.hex }} />)}</div></fieldset>
          <div className="options"><label>TEE COLOR<select value={color} onChange={e => setColor(e.target.value)}><option value="black">Black</option><option value="white">White</option></select></label><label>SIZE<select value={size} onChange={e => setSize(e.target.value)}>{["xs", "s", "m", "l", "xl", "2xl", "3xl"].map(item => <option key={item} value={item}>{item.toUpperCase()}</option>)}</select></label></div>
          <button className="checkout" disabled={loading}>{loading ? "OPENING SECURE CHECKOUT…" : "CLAIM THIS EDITION · $39"}</button>
          {error && <p className="error">{error}</p>}
          <p className="fine">Secure payment via Stripe · Shipping and taxes calculated at checkout</p>
        </form>
        <div className="live-card"><div className={`shirt ${color}`}><img src={designUrl} alt="Live shirt artwork preview"/></div><p>YOUR EDITION / <b>LIVE PREVIEW</b></p><div className="card-spec"><span>FRONT PRINT</span><span>ORGANIC COTTON</span><span>MADE TO ORDER</span></div></div>
      </section>

      <section className="details"><div><span>01</span><h3>One-off by design</h3><p>Your field-note is generated on purchase, then kept out of the regular catalog.</p></div><div><span>02</span><h3>Built for color</h3><p>DTG lets the tiny stars, gradients and personal typography stay sharp and saturated.</p></div><div><span>03</span><h3>Thoughtful materials</h3><p>Organic cotton, water-based inks and white-label shipping from the nearest print network.</p></div></section>
      <footer><a className="brand" href="#top">STAR SIGNAL <i>STUDIO</i></a><p>PERSONAL SKY WEAR FOR EARTHLINGS</p><p>© {new Date().getFullYear()} STAR SIGNAL STUDIO</p></footer>
    </main>
  );
}
