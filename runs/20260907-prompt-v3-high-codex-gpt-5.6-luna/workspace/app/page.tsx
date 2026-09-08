"use client";

import { useEffect, useMemo, useState } from "react";

const THEMES = {
  midnight: { label: "Midnight signal", ink: "#d7ff3f", accent: "#6f6cff", shirt: "#17191f", bg: "#111318" },
  ember: { label: "Ember frequency", ink: "#ff765f", accent: "#ffd18a", shirt: "#f2e4d4", bg: "#241817" },
  ultraviolet: { label: "Ultraviolet drift", ink: "#d29bff", accent: "#6df2dc", shirt: "#dcd7ea", bg: "#21172d" },
} as const;

type ThemeKey = keyof typeof THEMES;

function cleanPhrase(value: string) {
  return value.replace(/[^a-zA-Z0-9 .,!?'&-]/g, "").slice(0, 32);
}

function hashPhrase(value: string) {
  return [...value].reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 7), 17);
}

function SignalArtwork({ phrase, theme, large = false }: { phrase: string; theme: ThemeKey; large?: boolean }) {
  const palette = THEMES[theme];
  const seed = hashPhrase(phrase || "your signal");
  const points = Array.from({ length: 16 }, (_, index) => {
    const y = 132 + Math.sin(index * 1.2 + seed / 17) * (18 + (seed % 16)) + ((seed + index * 23) % 18);
    return `${index * 25},${y.toFixed(1)}`;
  }).join(" ");
  const secondary = Array.from({ length: 16 }, (_, index) => {
    const y = 144 + Math.cos(index * 0.9 + seed / 13) * 22 + ((seed + index * 11) % 12);
    return `${index * 25},${y.toFixed(1)}`;
  }).join(" ");
  const words = (phrase || "YOUR SIGNAL").toUpperCase().split(" ");
  return (
    <svg className="signal-art" viewBox="0 0 380 300" role="img" aria-label={`Signal map for ${phrase || "your phrase"}`}>
      <defs>
        <linearGradient id={`signal-${theme}`} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor={palette.ink} />
          <stop offset="1" stopColor={palette.accent} />
        </linearGradient>
        <filter id="soften"><feGaussianBlur stdDeviation="1.2" /></filter>
      </defs>
      <rect width="380" height="300" rx="20" fill={palette.bg} />
      <g opacity="0.25" stroke={palette.ink} strokeWidth="1">
        {Array.from({ length: 7 }, (_, i) => <path key={`h-${i}`} d={`M24 ${40 + i * 34} H356`} />)}
        {Array.from({ length: 9 }, (_, i) => <path key={`v-${i}`} d={`M${24 + i * 40} 28 V272`} />)}
      </g>
      <path d={`M 12 ${128 + seed % 14} ${points}`} fill="none" stroke={palette.accent} strokeWidth="13" opacity="0.14" filter="url(#soften)" />
      <polyline points={points} fill="none" stroke={`url(#signal-${theme})`} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points={secondary} fill="none" stroke={palette.ink} strokeWidth="1.2" opacity="0.65" strokeDasharray="2 8" />
      <circle cx={34 + (seed % 300)} cy={90 + (seed % 130)} r="4" fill={palette.ink} />
      <text x="25" y="55" fill={palette.ink} fontFamily="Arial, sans-serif" fontWeight="700" fontSize={large ? "20" : "16"} letterSpacing="3">{words.slice(0, 2).join(" / ")}</text>
      <text x="26" y="252" fill={palette.accent} fontFamily="Arial, sans-serif" fontWeight="700" fontSize="10" letterSpacing="2">FREQ. {String(seed).slice(-4)} · SIGNAL / NOISE</text>
    </svg>
  );
}

function ShirtPreview({ phrase, theme }: { phrase: string; theme: ThemeKey }) {
  const palette = THEMES[theme];
  return (
    <div className="shirt-stage" style={{ "--shirt": palette.shirt } as React.CSSProperties}>
      <span className="stage-note">FRONT / DTG</span>
      <svg className="shirt-shape" viewBox="0 0 460 500" aria-label="T-shirt mockup" role="img">
        <path d="M145 56 87 89 22 165l75 61 38-45v267h190V181l38 45 75-61-65-76-58-33-30 27h-75z" fill="var(--shirt)" stroke="#ffffff" strokeOpacity=".12" strokeWidth="2" />
        <path d="M174 55c5 39 107 39 112 0" fill="none" stroke="#fff" strokeOpacity=".08" strokeWidth="10" />
        <foreignObject x="105" y="135" width="250" height="200"><div className="shirt-art"><SignalArtwork phrase={phrase} theme={theme} /></div></foreignObject>
      </svg>
      <div className="stage-swatch"><span style={{ background: palette.shirt }} /> AS Colour 5001 · {THEMES[theme].label}</div>
    </div>
  );
}

export default function Home() {
  const [phrase, setPhrase] = useState("keep going");
  const [theme, setTheme] = useState<ThemeKey>("midnight");
  const [size, setSize] = useState("m");
  const [color, setColor] = useState("black");
  const [quantity, setQuantity] = useState(1);
  const [isPaying, setIsPaying] = useState(false);
  const [notice, setNotice] = useState("");

  const total = 38 * quantity + 5.9;
  const encodedDesign = useMemo(() => `/api/design?phrase=${encodeURIComponent(phrase || "your signal")}&theme=${theme}`, [phrase, theme]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success")) setNotice("Payment received. We’re preparing your one-of-one signal and will send it to print shortly.");
    if (params.get("canceled")) setNotice("Checkout canceled. Your design is still here whenever you’re ready.");
  }, []);

  async function checkout() {
    setIsPaying(true);
    setNotice("");
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phrase, theme, size, color, quantity, designPath: encodedDesign }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Checkout is unavailable right now.");
      window.location.href = payload.url;
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Checkout is unavailable right now.");
      setIsPaying(false);
    }
  }

  return (
    <main>
      <nav className="nav shell">
        <a className="brand" href="#top"><span className="brand-mark">∿</span> SIGNAL / NOISE</a>
        <div className="nav-links"><a href="#how">How it works</a><a href="#details">Details</a><span className="nav-pill">Made after you order</span></div>
      </nav>

      <section className="editor shell" id="top">
        <div className="editor-copy">
          <p className="eyebrow"><span className="live-dot" /> DROP 01 · YOUR FREQUENCY</p>
          <h1>Wear the thing<br /><em>only you</em> would say.</h1>
          <p className="intro">Turn a phrase that lives in your head into a topographic signal map. Every tee is generated once, printed on demand, and never repeated.</p>
          <div className="editor-rule" />
          <div className="form-block">
            <div className="label-row"><label htmlFor="phrase">Your phrase</label><span>{phrase.length}/32</span></div>
            <input id="phrase" value={phrase} onChange={(event) => setPhrase(cleanPhrase(event.target.value))} placeholder="e.g. take the long way home" maxLength={32} />
            <p className="hint">A lyric, a tiny mantra, an inside joke. Keep it yours.</p>
          </div>
          <div className="form-grid">
            <div className="form-block"><label htmlFor="theme">Signal mood</label><select id="theme" value={theme} onChange={(event) => setTheme(event.target.value as ThemeKey)}>{Object.entries(THEMES).map(([key, item]) => <option key={key} value={key}>{item.label}</option>)}</select></div>
            <div className="form-block"><label htmlFor="size">Size</label><select id="size" value={size} onChange={(event) => setSize(event.target.value)}>{["s", "m", "l", "xl", "2xl"].map((item) => <option key={item} value={item}>{item.toUpperCase()}</option>)}</select></div>
          </div>
          <div className="form-grid form-grid-bottom">
            <div className="form-block"><label htmlFor="color">Tee color</label><select id="color" value={color} onChange={(event) => setColor(event.target.value)}>{["black", "dark grey", "heather grey", "navy blue", "white"].map((item) => <option key={item} value={item}>{item.replace("dark", "Dark").replace("heather", "Heather").replace("navy", "Navy").replace("black", "Black").replace("white", "White").replace("grey", "Grey")}</option>)}</select></div>
            <div className="form-block"><label htmlFor="quantity">Quantity</label><select id="quantity" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))}>{[1, 2, 3].map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
          </div>
          <div className="buy-row"><div><span className="price">${total.toFixed(2)}</span><span className="price-note"> includes standard shipping</span></div><button className="buy-button" onClick={checkout} disabled={isPaying}>{isPaying ? "Opening checkout…" : "Make this real ↗"}</button></div>
          {notice && <p className="notice" role="status">{notice}</p>}
          <p className="secure-note">Secure checkout via Stripe · printed only after payment clears</p>
        </div>
        <div className="editor-preview"><ShirtPreview phrase={phrase} theme={theme} /><div className="preview-caption"><span>LIVE PREVIEW</span><span>YOUR SIGNAL, IN CLOTH</span></div></div>
      </section>

      <section className="ticker"><div>ONE PHRASE · ONE PATTERN · ONE TEE</div><div>NO STOCK · NO REPEATS · NO NOISE</div><div>DESIGNED IN YOUR BROWSER · PRINTED FOR YOU</div></section>

      <section className="explain shell" id="how">
        <div><p className="eyebrow">THE IDEA</p><h2>Your words have a shape.</h2></div>
        <div className="explain-body"><p>Signal / Noise translates the rhythm of your phrase into a one-off graphic—part waveform, part map, part private signal. DTG lets us print all those tiny turns without screens, setup, or minimums.</p><div className="steps"><div><span>01</span><strong>Type your phrase</strong><p>The words that sound like you.</p></div><div><span>02</span><strong>Choose a mood</strong><p>Three palettes, infinite signals.</p></div><div><span>03</span><strong>We make it real</strong><p>Printed after payment, then on its way.</p></div></div></div>
      </section>

      <section className="detail-band" id="details"><div className="shell detail-grid"><div><p className="eyebrow">THE BLANK</p><h2>AS Colour 5001</h2><p>Premium 100% cotton, relaxed unisex fit, heavyweight enough to feel considered. Your design lands on the front in crisp DTG color.</p></div><div className="detail-list"><div><span>FABRIC</span><strong>100% cotton</strong></div><div><span>PRINT</span><strong>DTG / front</strong></div><div><span>MADE</span><strong>After you order</strong></div><div><span>SHIPS</span><strong>Worldwide</strong></div></div></div></section>
      <footer className="footer shell"><span>© 2026 SIGNAL / NOISE</span><span>Small signal. Big feeling.</span><span>Questions? hello@signalnoise.studio</span></footer>
    </main>
  );
}
