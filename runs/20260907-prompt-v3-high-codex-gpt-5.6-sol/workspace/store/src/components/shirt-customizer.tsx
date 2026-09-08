"use client";

import { useMemo, useState } from "react";

const sizes = ["S", "M", "L", "XL", "2XL"] as const;
const inks = {
  acid: { name: "Acid", main: "#c8ff35", accent: "#ff5a45" },
  solar: { name: "Solar", main: "#ff754f", accent: "#ffe55c" },
  ice: { name: "Ice", main: "#8be9ff", accent: "#c8ff35" },
} as const;
type Ink = keyof typeof inks;

function hashSeed(value: string) {
  return Array.from(value).reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 3), 97);
}

function OrbitPreview({ place, date, phrase, ink, shirtColor }: { place: string; date: string; phrase: string; ink: Ink; shirtColor: "black" | "white" }) {
  const palette = inks[ink];
  const seed = hashSeed(`${place}${date}${phrase}`);
  const dark = shirtColor === "black";
  const paths = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const turn = (seed * (i + 7)) % 56 - 28;
    const rise = 45 + ((seed + i * 31) % 150);
    return `M ${112 + i * 19} ${330 - i * 18} C ${45 + rise} ${80 + i * 27}, ${345 - rise / 2} ${95 + turn + i * 18}, ${290 - i * 7} ${330 - i * 10}`;
  }), [seed]);
  const formattedDate = date ? new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }).toUpperCase() : "YOUR DATE";

  return (
    <div className={`proof ${dark ? "proof-dark" : "proof-light"}`} aria-label="Live preview of your personalized orbital design">
      <div className="proof-chrome"><span>FRONT / PRINT PROOF</span><span>01:01</span></div>
      <svg viewBox="0 0 400 500" role="img" aria-label={`Orbital artwork for ${place || "your place"}`}>
        <g fill="none" stroke={palette.main} strokeLinecap="round">
          <circle cx="200" cy="239" r="151" strokeWidth="1.2" opacity=".42" />
          <circle cx="200" cy="239" r="108" strokeWidth=".8" strokeDasharray="3 8" opacity=".7" />
          {paths.map((path, i) => <path key={path} d={path} strokeWidth={i === 2 ? 2 : 1} opacity={0.42 + i * 0.08} />)}
          <path d="M55 239H345M200 74V405" strokeWidth=".6" strokeDasharray="2 9" opacity=".55" />
        </g>
        {Array.from({ length: 16 }, (_, i) => {
          const angle = (i / 16) * Math.PI * 2 + (seed % 20) / 10;
          return <circle key={i} cx={200 + Math.cos(angle) * (76 + (i % 3) * 27)} cy={239 + Math.sin(angle) * (76 + (i % 3) * 27)} r={i === seed % 16 ? 5.5 : 1.8} fill={i === seed % 16 ? palette.accent : palette.main} />;
        })}
        <text x="38" y="42" fill={dark ? "#f2f4ed" : "#151614"} fontSize="11" letterSpacing="2.6">ORBIT / {String(seed).slice(-4).padStart(4, "0")}</text>
        <text x="38" y="451" fill={palette.main} fontSize="18" fontWeight="700" letterSpacing="1.5">{(place || "YOUR PLACE").toUpperCase().slice(0, 28)}</text>
        <text x="38" y="473" fill={dark ? "#f2f4ed" : "#151614"} fontSize="9" letterSpacing="2">{formattedDate}  /  {(phrase || "WORDS TO KEEP").toUpperCase().slice(0, 34)}</text>
      </svg>
    </div>
  );
}

export function ShirtCustomizer() {
  const [place, setPlace] = useState("Joshua Tree, CA");
  const [date, setDate] = useState("2024-10-14");
  const [phrase, setPhrase] = useState("Where we found our north");
  const [ink, setInk] = useState<Ink>("acid");
  const [shirtColor, setShirtColor] = useState<"black" | "white">("black");
  const [size, setSize] = useState<(typeof sizes)[number]>("M");
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function checkout() {
    setError("");
    if (!place.trim() || !date || !phrase.trim()) return setError("Add your place, date, and phrase before checkout.");
    setLoading(true);
    try {
      const response = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ place, date, phrase, ink, shirtColor, size, quantity }) });
      const data = await response.json();
      if (!response.ok || !data.url) throw new Error(data.error || "Checkout is unavailable right now.");
      window.location.assign(data.url);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Checkout is unavailable right now.");
      setLoading(false);
    }
  }

  return (
    <div className="customizer-shell">
      <div className="preview-column">
        <OrbitPreview place={place} date={date} phrase={phrase} ink={ink} shirtColor={shirtColor} />
        <p className="preview-note"><span>↳</span> Live composition preview. Production artwork is rendered at 4677 × 5787 px.</p>
      </div>
      <div className="controls-column">
        <div className="field-grid">
          <label className="field field-wide"><span>01 / THE PLACE</span><input value={place} maxLength={40} onChange={(event) => setPlace(event.target.value)} placeholder="City, trail, coordinates…" /></label>
          <label className="field"><span>02 / THE DATE</span><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
          <label className="field"><span>03 / THE WORDS</span><input value={phrase} maxLength={48} onChange={(event) => setPhrase(event.target.value)} placeholder="Keep it short and true" /></label>
        </div>

        <fieldset><legend>04 / INK SIGNAL</legend><div className="ink-options">
          {(Object.keys(inks) as Ink[]).map((value) => <button key={value} type="button" className={ink === value ? "selected" : ""} onClick={() => setInk(value)} aria-pressed={ink === value}><span className="ink-dot" style={{ background: inks[value].main }} />{inks[value].name}</button>)}
        </div></fieldset>

        <div className="option-row">
          <fieldset><legend>05 / SHIRT</legend><div className="segmented"><button type="button" className={shirtColor === "black" ? "selected" : ""} onClick={() => setShirtColor("black")}>Black</button><button type="button" className={shirtColor === "white" ? "selected" : ""} onClick={() => setShirtColor("white")}>White</button></div></fieldset>
          <fieldset className="size-fieldset"><legend>06 / SIZE</legend><div className="size-options">{sizes.map((value) => <button type="button" key={value} className={size === value ? "selected" : ""} onClick={() => setSize(value)}>{value}</button>)}</div></fieldset>
        </div>

        <div className="buy-row">
          <div className="price"><strong>${(42 * quantity).toFixed(2)}</strong><span>USD · shipping calculated at checkout</span></div>
          <label className="quantity">QTY<select value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} aria-label="Quantity">{[1, 2, 3, 4, 5].map((value) => <option key={value}>{value}</option>)}</select></label>
        </div>
        <button className="button button-checkout" type="button" onClick={checkout} disabled={loading}>{loading ? "Opening secure checkout…" : "Order your one-of-one"}<span aria-hidden="true">↗</span></button>
        {error && <p className="form-error" role="alert">{error}</p>}
        <p className="secure-note">Secure payment · Printed only after payment · 30-day quality guarantee</p>
      </div>
    </div>
  );
}
