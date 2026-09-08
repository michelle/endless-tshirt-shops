"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { ArrowRight, Check, ChevronDown, LockKeyhole, RotateCcw, Sparkles, Truck } from "lucide-react";
import { Artwork } from "@/components/artwork";
import type { Design } from "@/lib/design";

const palettes = [
  { id: "solar", label: "Solar flare", colors: ["#ff5c39", "#b8ffd8"] },
  { id: "electric", label: "Electric dusk", colors: ["#9d7bff", "#58e7ff"] },
  { id: "acid", label: "Acid garden", colors: ["#d9ff43", "#ff77a8"] },
] as const;
const shirtColors = [
  { id: "black", label: "Black", color: "#101010" },
  { id: "navy blue", label: "Navy", color: "#142752" },
  { id: "asphalt", label: "Asphalt", color: "#4b4e52" },
  { id: "white", label: "White", color: "#f5f2e9" },
] as const;
const sizes = ["S", "M", "L", "XL", "2XL"];
const starter: Design = { name: "MAYA", place: "MARFA, TX", date: "2024-10-14", note: "MEET ME UNDER THE SAME SKY", palette: "solar" };

export default function Home() {
  const [design, setDesign] = useState<Design>(starter);
  const [shirtColor, setShirtColor] = useState("black");
  const [size, setSize] = useState("M");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const garment = shirtColors.find((item) => item.id === shirtColor)?.color ?? "#101010";
  const artTone = shirtColor === "white" ? "dark" : "light";
  const formattedDate = useMemo(() => {
    const [year, month, day] = design.date.split("-");
    return year && month && day ? `${month}.${day}.${year}` : design.date;
  }, [design.date]);

  function change<K extends keyof Design>(key: K, value: Design[K]) {
    setDesign((current) => ({ ...current, [key]: value }));
    setError("");
  }

  async function checkout() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ design, shirtColor, size }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.url) throw new Error(payload.error || "Checkout could not be started.");
      window.location.href = payload.url;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Checkout could not be started.");
      setLoading(false);
    }
  }

  return (
    <main>
      <header className="site-header">
        <a className="wordmark" href="#top" aria-label="Signal Atlas home">SIGNAL <span>✦</span> ATLAS</a>
        <div className="header-note">One person. One place. One shirt.</div>
        <a className="text-link" href="#story">Our process <ArrowRight size={15} aria-hidden="true" /></a>
      </header>

      <section className="builder" id="top">
        <div className="builder-copy">
          <div className="eyebrow"><Sparkles size={14} /> MADE FROM YOUR COORDINATES</div>
          <h1>Wear the place<br />that changed you.</h1>
          <p className="lede">Your name, your moment, your map—composed into an orbital print that exists only once.</p>
          <div className="form-grid">
            <label><span>Name or initials</span><input value={design.name} maxLength={18} onChange={(event) => change("name", event.target.value.toUpperCase())} placeholder="MAYA" /></label>
            <label><span>Meaningful place</span><input value={design.place} maxLength={28} onChange={(event) => change("place", event.target.value.toUpperCase())} placeholder="MARFA, TX" /></label>
            <label><span>Date</span><input type="date" value={design.date} onChange={(event) => change("date", event.target.value)} /></label>
            <label><span>Your line</span><input value={design.note} maxLength={42} onChange={(event) => change("note", event.target.value.toUpperCase())} placeholder="MEET ME UNDER THE SAME SKY" /></label>
          </div>
          <fieldset className="choice-set"><legend>Color signal</legend><div className="palette-list">
            {palettes.map((palette) => <button type="button" key={palette.id} className={design.palette === palette.id ? "palette active" : "palette"} onClick={() => change("palette", palette.id)} aria-label={palette.label} aria-pressed={design.palette === palette.id}><i style={{ background: palette.colors[0] }} /><i style={{ background: palette.colors[1] }} /></button>)}
          </div></fieldset>
        </div>

        <div className="product-stage" style={{ "--garment": garment } as React.CSSProperties}>
          <div className="edition-stamp">01 / 01</div>
          <div className="shirt" aria-label="Live preview of your custom shirt"><div className="sleeve left" /><div className="sleeve right" /><div className="torso"><div className="collar" /><div className="print-preview"><Artwork design={design} tone={artTone} formattedDate={formattedDate} /></div></div></div>
          <div className="preview-caption"><span><i /> LIVE PREVIEW</span><button type="button" onClick={() => setDesign(starter)}><RotateCcw size={14} /> Reset</button></div>
        </div>

        <aside className="buy-panel">
          <div><span className="micro">SIGNAL ATLAS / PERSONAL EDITION</span><div className="price">$42 <small>USD</small></div></div>
          <fieldset className="choice-set"><legend>Shirt color</legend><div className="shirt-colors">
            {shirtColors.map((color) => <button type="button" key={color.id} className={shirtColor === color.id ? "color active" : "color"} onClick={() => setShirtColor(color.id)} aria-label={color.label} aria-pressed={shirtColor === color.id} style={{ background: color.color }}>{shirtColor === color.id && <Check size={14} />}</button>)}
          </div></fieldset>
          <fieldset className="choice-set"><legend>Size <a href="#size-guide">Size guide</a></legend><div className="size-list">
            {sizes.map((item) => <button type="button" key={item} className={size === item ? "active" : ""} onClick={() => setSize(item)} aria-pressed={size === item}>{item}</button>)}
          </div></fieldset>
          <button className="checkout-button" onClick={checkout} disabled={loading}>{loading ? "Opening secure checkout…" : "Create mine"}{!loading && <ArrowRight size={19} />}</button>
          {error && <p className="checkout-error" role="alert">{error}</p>}
          <div className="trust-row"><span><LockKeyhole size={15} /> Secure checkout</span><span><Truck size={16} /> Printed near you</span></div>
          <p className="fineprint">Custom-made in 3–5 business days. $6 shipping added at checkout.</p>
        </aside>
      </section>

      <section className="ticker" aria-label="Product details"><div>ONE-OF-ONE ARTWORK</div><span>✦</span><div>BELLA + CANVAS 3001</div><span>✦</span><div>WATER-BASED INKS</div><span>✦</span><div>GLOBAL FULFILLMENT</div></section>

      <section className="story" id="story">
        <div className="story-image"><Image src="/signal-atlas-editorial.png" alt="Model wearing a black Signal Atlas orbital-map shirt" fill sizes="(max-width: 800px) 100vw, 46vw" /><div className="image-label">THE MARFA SIGNAL / 2024</div></div>
        <div className="story-copy"><span className="section-number">/ 01</span><h2>Not merch.<br />A personal artifact.</h2><p>We translate your inputs into a repeatable visual system: contour lines seeded from your words, an orbit for your date, and a bright point for the place you keep returning to.</p>
          <ol><li><span>01</span><div><b>You set the signal</b><small>Name a person, place, and moment.</small></div></li><li><span>02</span><div><b>We compose the map</b><small>Your artwork is generated in print resolution.</small></div></li><li><span>03</span><div><b>It’s made for you</b><small>DTG printed and shipped by our global partner.</small></div></li></ol>
        </div>
      </section>

      <section className="details" id="size-guide"><div><div><span className="micro">THE CANVAS</span><h2>A tee worth keeping.</h2></div></div><div className="detail-grid"><article><b>100%</b><span>Airlume combed<br />ring-spun cotton*</span></article><article><b>3001</b><span>Bella + Canvas<br />unisex retail fit</span></article><article><b>DTG</b><span>Full-color, water-based<br />direct-to-garment print</span></article></div><details><summary>Size & care notes <ChevronDown size={18} /></summary><p>S 34–37″ chest · M 38–41″ · L 42–45″ · XL 46–49″ · 2XL 50–53″. Machine wash cold, inside out. Tumble dry low. *Fiber content varies by color.</p></details></section>
      <footer><a className="wordmark" href="#top">SIGNAL <span>✦</span> ATLAS</a><p>Made for the coordinates you carry.</p><nav><a href="/privacy">Privacy</a><a href="/terms">Terms</a></nav></footer>
    </main>
  );
}
