"use client";

import Image from "next/image";
import { ArrowRight, Check, MapPin, Minus, Plus, Sparkles } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";

const PALETTES = {
  ridge: { name: "Night ridge", line: "#d6ff3f", route: "#ff6b57", soft: "#17261e" },
  glacier: { name: "Glacier run", line: "#77dcff", route: "#ff8e47", soft: "#13222b" },
  desert: { name: "Desert signal", line: "#f4cf85", route: "#547cff", soft: "#292218" },
} as const;

type PaletteKey = keyof typeof PALETTES;

function hashText(value: string) {
  return Array.from(value).reduce((acc, char) => ((acc << 5) - acc + char.charCodeAt(0)) | 0, 9187);
}

function contourPath(index: number, seed: number) {
  const phase = ((seed % 997) / 997) * Math.PI * 2;
  const base = 42 + index * 18;
  const points = Array.from({ length: 13 }, (_, i) => {
    const angle = (i / 12) * Math.PI * 2;
    const wobble = Math.sin(angle * 3 + phase + index * 0.7) * (7 + index * 0.7);
    const x = 220 + Math.cos(angle) * (base + wobble) + Math.sin(phase * 2 + index) * 8;
    const y = 205 + Math.sin(angle) * (base * 0.78 + wobble) + Math.cos(phase + index) * 9;
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return `${points.join(" ")} Z`;
}

export function Customizer() {
  const [place, setPlace] = useState("Big Sur, California");
  const [latitude, setLatitude] = useState("36.2704");
  const [longitude, setLongitude] = useState("-121.8081");
  const [date, setDate] = useState("2024-06-18");
  const [note, setNote] = useState("WHERE THE ROAD MET THE SEA");
  const [size, setSize] = useState("m");
  const [palette, setPalette] = useState<PaletteKey>("ridge");
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const selected = PALETTES[palette];
  const seed = useMemo(() => hashText(`${place}${latitude}${longitude}${date}${note}`), [place, latitude, longitude, date, note]);

  async function handleCheckout(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ place, latitude, longitude, date, note, size, palette, quantity }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Checkout could not be started.");
      window.location.assign(data.url);
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "Checkout could not be started.");
      setLoading(false);
    }
  }

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Fieldmark home">
          <span className="brand-mark"><MapPin size={16} strokeWidth={2.4} /></span>
          FIELDMARK
        </a>
        <div className="header-note"><span /> Printed once. Made for you.</div>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow">ONE PLACE · ONE MOMENT · ONE SHIRT</p>
          <h1>Wear somewhere<br />that <em>matters.</em></h1>
          <p className="hero-deck">Turn a place you never want to forget into a one-of-one topographic field print.</p>
          <a className="text-link" href="#make-yours">Make yours <ArrowRight size={16} /></a>
        </div>
        <div className="hero-image-wrap">
          <Image src="/field-notes-lifestyle.png" alt="Person wearing a black topographic Fieldmark shirt beside the coast" fill priority sizes="(max-width: 800px) 100vw, 50vw" className="hero-image" />
          <div className="image-caption">Field test 001<br />Pacific coast</div>
        </div>
      </section>

      <section className="maker" id="make-yours">
        <div className="preview-column">
          <div className="section-number">01 / YOUR FIELD</div>
          <div className="print-proof" style={{ backgroundColor: selected.soft }}>
            <div className="proof-label">LIVE PRINT PROOF</div>
            <svg viewBox="0 0 440 540" role="img" aria-label={`Custom topographic print for ${place}`}>
              <defs>
                <filter id="glow"><feGaussianBlur stdDeviation="1.3" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
              </defs>
              <g fill="none" stroke={selected.line} strokeWidth="1.25" opacity=".9">
                {Array.from({ length: 10 }, (_, index) => <path key={index} d={contourPath(index, seed)} />)}
              </g>
              <path d="M90 430 C130 365, 115 280, 205 250 S285 175, 348 104" fill="none" stroke={selected.route} strokeWidth="3" strokeLinecap="round" filter="url(#glow)" />
              <circle cx="205" cy="250" r="7" fill="#101313" stroke={selected.route} strokeWidth="2" />
              <circle cx="205" cy="250" r="2" fill={selected.route} />
              <text x="28" y="43" className="svg-kicker" fill={selected.line}>FIELDMARK / PERSONAL TOPOGRAPHY</text>
              <text x="28" y="473" className="svg-place" fill="#f3f2e9">{place.slice(0, 28).toUpperCase()}</text>
              <text x="28" y="499" className="svg-detail" fill={selected.line}>{latitude || "—"}° / {longitude || "—"}° · {date || "UNDATED"}</text>
              <text x="28" y="520" className="svg-note" fill="#f3f2e9">{note.slice(0, 38).toUpperCase()}</text>
            </svg>
            <div className="proof-corner">FN—{Math.abs(seed % 10000).toString().padStart(4, "0")}</div>
          </div>
          <div className="proof-meta">
            <span><Sparkles size={15} /> Every contour is generated from your story</span>
            <span>Print area 12 × 15 in</span>
          </div>
        </div>

        <form className="customizer" onSubmit={handleCheckout}>
          <div>
            <p className="eyebrow">THE FIELD SHIRT · $42</p>
            <h2>Pin the memory.</h2>
            <p className="form-intro">We turn your coordinates and words into a print no one else can own.</p>
          </div>

          <label className="field full"><span>Place name</span><input value={place} onChange={(e) => setPlace(e.target.value)} maxLength={40} required placeholder="Big Sur, California" /></label>
          <div className="field-row">
            <label className="field"><span>Latitude</span><input value={latitude} onChange={(e) => setLatitude(e.target.value)} inputMode="decimal" required placeholder="36.2704" /></label>
            <label className="field"><span>Longitude</span><input value={longitude} onChange={(e) => setLongitude(e.target.value)} inputMode="decimal" required placeholder="-121.8081" /></label>
          </div>
          <label className="field full"><span>Date of the memory</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></label>
          <label className="field full"><span>Your line <small>{note.length}/38</small></span><input value={note} onChange={(e) => setNote(e.target.value)} maxLength={38} required placeholder="WHERE THE ROAD MET THE SEA" /></label>

          <fieldset><legend>Ink story</legend><div className="palette-grid">
            {(Object.entries(PALETTES) as [PaletteKey, typeof selected][]).map(([key, option]) => (
              <button type="button" key={key} className={`palette-option ${palette === key ? "selected" : ""}`} onClick={() => setPalette(key)} aria-pressed={palette === key}>
                <span className="swatch" style={{ background: `linear-gradient(135deg, ${option.line} 0 48%, ${option.route} 48% 58%, ${option.soft} 58%)` }} />
                <span>{option.name}</span>{palette === key && <Check size={14} />}
              </button>
            ))}
          </div></fieldset>

          <div className="field-row product-row">
            <fieldset className="size-field"><legend>Size</legend><div className="size-grid">
              {["s", "m", "l", "xl", "2xl", "3xl"].map((option) => <button type="button" key={option} onClick={() => setSize(option)} className={size === option ? "selected" : ""} aria-pressed={size === option}>{option.toUpperCase()}</button>)}
            </div></fieldset>
            <fieldset className="quantity-field"><legend>Qty</legend><div className="quantity-control">
              <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} aria-label="Decrease quantity"><Minus size={15} /></button>
              <span>{quantity}</span>
              <button type="button" onClick={() => setQuantity(Math.min(4, quantity + 1))} aria-label="Increase quantity"><Plus size={15} /></button>
            </div></fieldset>
          </div>

          {error && <p className="error-message" role="alert">{error}</p>}
          <button className="checkout-button" type="submit" disabled={loading}>
            <span>{loading ? "Opening secure checkout…" : "Order your field shirt"}</span>
            <span>${42 * quantity}</span>
          </button>
          <div className="trust-row"><span><Check size={14} /> Premium cotton</span><span><Check size={14} /> Worldwide shipping</span><span><Check size={14} /> Secure checkout</span></div>
        </form>
      </section>

      <section className="story-strip">
        <div><span>THE CANVAS</span><strong>Bella + Canvas 3001</strong><p>Soft, ring-spun cotton with a modern unisex fit.</p></div>
        <div><span>THE PRINT</span><strong>Made one at a time</strong><p>Full-color, water-based DTG ink with fine-line detail.</p></div>
        <div><span>THE PROMISE</span><strong>Uniquely yours</strong><p>Your place and words generate the final artwork.</p></div>
      </section>

      <footer><a className="brand" href="#top"><span className="brand-mark"><MapPin size={16} /></span>FIELDMARK</a><p>Custom fieldwear for places worth keeping.</p><span>© {new Date().getFullYear()} Fieldmark</span></footer>
    </main>
  );
}
