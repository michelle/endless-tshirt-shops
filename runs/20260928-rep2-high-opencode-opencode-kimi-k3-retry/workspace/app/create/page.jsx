"use client";

import { useMemo, useState } from "react";
import { generateArt, ART_W, ART_H } from "../../lib/art.js";
import {
  PALETTES,
  SHIRT_COLORS,
  SHIRT_SIZES,
  SHIRT_COLOR_HEX,
} from "../../lib/palettes.js";

// Print area placement inside the mockup viewBox (500x560).
const PRINT = { x: 172, y: 150, w: 156, h: 193 };

function ShirtMockup({ svg, shirtHex }) {
  return (
    <svg viewBox="0 0 500 560" className="mock" role="img" aria-label="Shirt preview">
      <defs>
        <clipPath id="printArea">
          <rect x={PRINT.x} y={PRINT.y} width={PRINT.w} height={PRINT.h} rx="4" />
        </clipPath>
        <linearGradient id="shade" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.10" />
          <stop offset="45%" stopColor="#ffffff" stopOpacity="0.02" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.16" />
        </linearGradient>
      </defs>

      {/* tee silhouette */}
      <path
        d="M185,45 C215,72 285,72 315,45 L395,82 L468,190 L380,232 L352,196 L352,505 Q352,522 334,522 L166,522 Q148,522 148,505 L148,196 L120,232 L32,190 L105,82 Z"
        fill={shirtHex}
        stroke="rgba(0,0,0,0.35)"
        strokeWidth="2"
      />
      <path
        d="M185,45 C215,72 285,72 315,45 L395,82 L468,190 L380,232 L352,196 L352,505 Q352,522 334,522 L166,522 Q148,522 148,505 L148,196 L120,232 L32,190 L105,82 Z"
        fill="url(#shade)"
      />
      {/* collar rib */}
      <path
        d="M185,45 C215,72 285,72 315,45 C300,58 275,64 250,64 C225,64 200,58 185,45 Z"
        fill="rgba(0,0,0,0.22)"
      />
      {/* sleeve seams */}
      <path d="M380,232 L352,196" stroke="rgba(0,0,0,0.25)" strokeWidth="1.5" fill="none" />
      <path d="M120,232 L148,196" stroke="rgba(0,0,0,0.25)" strokeWidth="1.5" fill="none" />

      {/* the artwork, clipped to the print area */}
      <g clipPath="url(#printArea)">
        <g
          transform={`translate(${PRINT.x},${PRINT.y}) scale(${PRINT.w / ART_W})`}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </g>
      <rect
        x={PRINT.x}
        y={PRINT.y}
        width={PRINT.w}
        height={PRINT.h}
        rx="4"
        fill="none"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth="1"
      />
    </svg>
  );
}

export default function CreatePage() {
  const [word, setWord] = useState("");
  const [paletteId, setPaletteId] = useState("ember");
  const [color, setColor] = useState("black");
  const [size, setSize] = useState("l");
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const palette = PALETTES.find((p) => p.id === paletteId);

  const art = useMemo(
    () => generateArt(word || "your word", paletteId),
    [word, paletteId]
  );

  async function buy() {
    setError("");
    const w = word.trim();
    if (!w) {
      setError("Type your word first — it becomes the seed of your artwork.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word: w, palette: paletteId, color, size, qty }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not start checkout");
      window.location.href = data.url;
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }

  return (
    <main className="wrap">
      <section className="studio">
        <div className="preview-card">
          <ShirtMockup svg={art.svg} shirtHex={SHIRT_COLOR_HEX[color] || "#232323"} />
          <div className="edition-line">
            <span>
              “<b>{art.word}</b>” · {palette.name}
            </span>
            <span>
              EDITION <b>№ {art.edition}</b> · 1/1
            </span>
          </div>
        </div>

        <div>
          <h1 style={{ fontSize: "34px", marginBottom: "8px" }}>The Studio</h1>
          <p style={{ color: "var(--ink-dim)", marginBottom: "30px", lineHeight: 1.6 }}>
            Your word is the seed. Change it and the artwork regrows — the preview is the exact
            file we print.
          </p>

          <div className="field">
            <label htmlFor="word">Your word</label>
            <input
              id="word"
              type="text"
              maxLength={40}
              placeholder="a name, a place, a promise…"
              value={word}
              onChange={(e) => setWord(e.target.value)}
              autoFocus
            />
            <div className="hint">
              Same word + palette = same art, forever. Capitalization doesn&apos;t matter; the
              feeling does.
            </div>
          </div>

          <div className="field">
            <label>Palette — {palette.name}</label>
            <div className="swatches">
              {PALETTES.map((p) => (
                <button
                  key={p.id}
                  className={`swatch ${p.id === paletteId ? "on" : ""}`}
                  onClick={() => setPaletteId(p.id)}
                  title={p.blurb}
                >
                  <span className="dots">
                    {p.inks.slice(0, 3).map((i) => (
                      <span key={i} className="dot" style={{ background: i }} />
                    ))}
                  </span>
                  {p.name}
                </button>
              ))}
            </div>
            <div className="hint">{palette.blurb}</div>
          </div>

          <div className="field">
            <label>Shirt color</label>
            <div className="chips">
              {SHIRT_COLORS.map((c) => (
                <button
                  key={c}
                  className={`chip ${c === color ? "on" : ""}`}
                  onClick={() => setColor(c)}
                >
                  <span className="hexdot" style={{ background: SHIRT_COLOR_HEX[c] }} />
                  {c}
                </button>
              ))}
            </div>
            <div className="hint">
              {palette.name} pairs best with {palette.shirts.join(", ")} — but it&apos;s your
              shirt.
            </div>
          </div>

          <div className="field">
            <label>Size</label>
            <div className="chips">
              {SHIRT_SIZES.map((s) => (
                <button
                  key={s}
                  className={`chip ${s === size ? "on" : ""}`}
                  onClick={() => setSize(s)}
                  style={{ textTransform: "uppercase" }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label>Quantity</label>
            <div className="qty">
              <button onClick={() => setQty(Math.max(1, qty - 1))} aria-label="decrease">−</button>
              <span>{qty}</span>
              <button onClick={() => setQty(Math.min(5, qty + 1))} aria-label="increase">+</button>
              <span style={{ color: "var(--ink-faint)", fontSize: "13px" }}>
                same artwork, up to 5 shirts
              </span>
            </div>
          </div>

          <div className="buy-row">
            <div className="price">
              ${36 * qty}.00
              <small>free tracked shipping · printed once, ever</small>
            </div>
            <button className="btn" onClick={buy} disabled={busy}>
              {busy ? "Opening checkout…" : "Buy this 1/1"}
            </button>
          </div>
          {error && <div className="err">{error}</div>}
        </div>
      </section>
    </main>
  );
}
