"use client";

import { useMemo, useState } from "react";
import { buildArtworkSvg } from "@/lib/design";
import { specPhase, validateSpec, type OrderSpec } from "@/lib/params";
import { GARMENTS, SIZE_LABELS, SIZES, unitPriceCents } from "@/lib/products";
import { formatDisplayDate } from "@/lib/moon";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function usd(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

const TEE_PATH =
  "M346,96 C366,72 534,72 554,96 L672,124 C772,158 836,224 856,318 " +
  "L872,382 C876,402 862,418 842,422 L770,436 C748,556 742,700 748,872 " +
  "C749,906 726,928 692,928 L208,928 C174,928 151,906 152,872 " +
  "C158,700 152,556 130,436 L58,422 C38,418 24,402 28,382 L44,318 " +
  "C64,224 128,158 228,124 Z";
const NECK_PATH = "M346,96 C382,152 518,152 554,96";

export default function StorePage() {
  const [date, setDate] = useState(todayIso());
  const [time, setTime] = useState("");
  const [hemisphere, setHemisphere] = useState<"N" | "S">("N");
  const [garment, setGarment] = useState<string>("black");
  const [size, setSize] = useState<string>("m");
  const [quantity, setQuantity] = useState(1);
  const [line, setLine] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [issues, setIssues] = useState<{ field: string; message: string }[]>([]);
  const [cancelled, setCancelled] = useState(false);

  const design = useMemo(
    () => ({
      date,
      time: time || undefined,
      hemisphere,
      garment: garment as "black" | "navy" | "cream",
      line: line || undefined,
    }),
    [date, time, hemisphere, garment, line]
  );

  const svg = useMemo(() => buildArtworkSvg(design), [design]);
  const phase = useMemo(() => specPhase(design), [design]);
  const garmentOption = GARMENTS.find((g) => g.id === garment)!;
  const price = unitPriceCents(size as (typeof SIZES)[number]) * quantity;

  async function buy() {
    setIssues([]);
    setCancelled(false);
    // Fast client-side check; the server re-validates everything.
    const local = validateSpec({ ...design, size, quantity });
    if (local.issues.length > 0) {
      setIssues(local.issues);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...design, size, quantity }),
      });
      const data = await res.json();
      if (!res.ok) {
        setIssues(
          Array.isArray(data?.issues)
            ? data.issues
            : [{ field: "", message: data?.error ?? "Checkout could not start." }]
        );
        return;
      }
      window.location.assign(data.url);
    } catch {
      setIssues([{ field: "", message: "Network error — please try again." }]);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="wrap">
      <header className="masthead">
        <a className="brand" href="/">☾ Under This Moon</a>
        <span className="fine">printed on demand · paid in one step</span>
      </header>

      <section className="hero">
        <div>
          <p className="kicker">Every shirt computed from your one night</p>
          <h1 className="display">Wear the sky<br />from your moment.</h1>
          <p className="lede">
            Pick a date — the night you arrived, the night they did, the night
            everything changed. We compute the <em>exact phase of the moon</em>{" "}
            for that evening and print it true: the lit side in ink, the dark
            side left to the shirt itself, scattered with stars mapped to your
            date. Direct-to-garment printing makes each one a single,
            one-of-one piece.
          </p>

          <ol className="steps">
            <li className="step"><b>1 · Your moment</b><span>Choose the date — and the hemisphere you watched it from.</span></li>
            <li className="step"><b>2 · Your moon</b><span>We draw the moon precisely as it stood, down to the terminator.</span></li>
            <li className="step"><b>3 · Your shirt</b><span>Pay securely; only then does your shirt go to the print lab.</span></li>
          </ol>

          <div className="config">
            <div className="row">
              <div className="field">
                <label htmlFor="date">The night <span className="hint">· your moment</span></label>
                <input id="date" type="date" value={date} min="1900-01-01" max="2100-12-31"
                  onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="time">Hour <span className="hint">· optional, refines the phase</span></label>
                <input id="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              </div>
              <div className="field">
                <label>Seen from</label>
                <div className="segmented" role="group" aria-label="Hemisphere">
                  <button type="button" aria-pressed={hemisphere === "N"} onClick={() => setHemisphere("N")}>
                    Northern sky
                  </button>
                  <button type="button" aria-pressed={hemisphere === "S"} onClick={() => setHemisphere("S")}>
                    Southern sky
                  </button>
                </div>
              </div>
            </div>

            <div className="field">
              <label>Garment</label>
              <div className="swatches" role="group" aria-label="Garment color">
                {GARMENTS.map((g) => (
                  <button key={g.id} type="button" className="swatch" title={g.blurb}
                    aria-pressed={garment === g.id} aria-label={g.name}
                    style={{ background: g.fabricCss }}
                    onClick={() => setGarment(g.id)}>
                    <small>{g.name}</small>
                  </button>
                ))}
              </div>
            </div>

            <div className="row">
              <div className="field">
                <label>Size</label>
                <div className="pills" role="group" aria-label="Size">
                  {SIZES.map((s) => (
                    <button key={s} type="button" className="pill" aria-pressed={size === s}
                      onClick={() => setSize(s)}>
                      {SIZE_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="field">
                <label>Quantity</label>
                <div className="counter" role="group" aria-label="Quantity">
                  <button type="button" aria-label="Fewer" disabled={quantity <= 1}
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}>−</button>
                  <output>{quantity}</output>
                  <button type="button" aria-label="More" disabled={quantity >= 5}
                    onClick={() => setQuantity((q) => Math.min(5, q + 1))}>+</button>
                </div>
              </div>
            </div>

            <div className="field">
              <label htmlFor="line">
                A line under the date{" "}
                <span className="hint">· optional — a name, a place, a promise</span>
                <span className={`charcount${line.length > 28 ? " over" : ""}`}>{line.length}/28</span>
              </label>
              <input id="line" type="text" value={line} maxLength={40} placeholder="for Mira · Berlin · chapter one"
                onChange={(e) => setLine(e.target.value)} />
            </div>

            <div className="buybar">
              <div className="price">
                <span className="amount">{usd(price)}</span>
                <span className="sub">
                  {garmentOption.name} · {SIZE_LABELS[size as (typeof SIZES)[number]]} ·
                  free worldwide shipping
                </span>
              </div>
              <button className="buy" type="button" onClick={buy} disabled={submitting}>
                {submitting ? "Opening checkout…" : "Print my moon"}
              </button>
            </div>

            {cancelled && (
              <div className="errorbox">Checkout cancelled — your moon is still here.</div>
            )}
            {issues.length > 0 && (
              <div className="errorbox">
                One or two things need a look:
                <ul>
                  {issues.map((i, idx) => (
                    <li key={idx}>{i.message}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <aside className="stage">
          <div className="mock" aria-label="Preview of the shirt">
            <svg className="tee" viewBox="0 0 900 1000" aria-hidden="true">
              <defs>
                <linearGradient id="fabricShade" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#000" stopOpacity="0.28" />
                  <stop offset="18%" stopColor="#000" stopOpacity="0.04" />
                  <stop offset="72%" stopColor="#000" stopOpacity="0.02" />
                  <stop offset="100%" stopColor="#000" stopOpacity="0.32" />
                </linearGradient>
                <filter id="grain">
                  <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" result="n" />
                  <feColorMatrix in="n" type="matrix"
                    values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.06 0" />
                </filter>
                <clipPath id="teeClip">
                  <path d={TEE_PATH} />
                </clipPath>
              </defs>
              <path d={TEE_PATH} fill={garmentOption.fabricCss} />
              <g clipPath="url(#teeClip)">
                <rect x="0" y="0" width="900" height="1000" fill="url(#fabricShade)" />
                <rect x="0" y="0" width="900" height="1000" filter="url(#grain)" />
              </g>
              <path d={NECK_PATH} fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth="10" />
              <path d={TEE_PATH} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2" />
            </svg>
            <div className="print" dangerouslySetInnerHTML={{ __html: svg }} />
          </div>
          <p className="phase-caption">
            <b>{phase.phaseName}</b> · <span className="pct">
              {Math.round(phase.illumination * 100)}% illuminated
            </span>
            <br />
            the moon of {formatDisplayDate(date)}
            {time ? ` at ${time} UTC` : ""}
            {hemisphere === "S" ? ", southern sky" : ""}
          </p>
        </aside>
      </section>

      <footer className="site">
        <div className="cols">
          <div>
            <h3>The shirt</h3>
            Bella+Canvas 3001 unisex tee — 100% Airlume combed cotton, crew
            neck, tailored fit. Printed with water-based direct-to-garment inks
            that soften into the fabric. Your artwork is rendered at 300 dpi
            exactly as previewed; the unlit half of the moon is deliberately
            left unprinted, so the garment itself completes the design.
          </div>
          <div>
            <h3>Getting it</h3>
            Production 72–120 hours, then shipped from the lab nearest you
            (US, UK, EU, AU). Shipping is free and included. Care: wash inside
            out, cold; hang dry; iron on the reverse.
          </div>
          <div>
            <h3>Good to know</h3>
            Payment is processed by Stripe — your card details never touch this
            store. Your shirt is only sent to the print network after your
            payment clears. Dates are computed with a truncated lunar series
            (Meeus), accurate to a fraction of a degree.
          </div>
        </div>
      </footer>
    </div>
  );
}
