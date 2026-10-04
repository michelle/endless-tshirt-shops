"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PRICE_CENTS, SHIRT_COLORS, SIZES } from "@/lib/catalog";
import { BADGE_ON_SHIRT, COLLAR_PATH, SHIRT_PATH, isDark } from "@/lib/shirt";
import { LIMITS, PALETTES, SCENES, type Design, type PaletteKey, type Scene } from "@/lib/styles";

function encode(d: Design) {
  const bytes = new TextEncoder().encode(JSON.stringify(d));
  let s = "";
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

const EXAMPLES: Design[] = [
  { name: "Grandpa Joe’s Garage", year: "1957", motto: "Home of the eternal project", scene: "desert", palette: "sage", v: 0 },
  { name: "The Couch", year: "2019", motto: "", scene: "coast", palette: "night", v: 0 },
  { name: "Camp Mom", year: "", motto: "Snacks available at ranger station", scene: "forest", palette: "alpine", v: 0 },
  { name: "Lake Overthink", year: "1988", motto: "Elevation: 5’7", scene: "mountains", palette: "dusk", v: 0 },
];

export default function Designer({
  initialDesign,
  initialColor,
  initialSize,
  canceled,
}: {
  initialDesign: Design;
  initialColor: string;
  initialSize: string;
  canceled: boolean;
}) {
  const [design, setDesign] = useState<Design>(initialDesign);
  const [color, setColor] = useState(initialColor);
  const [size, setSize] = useState(initialSize);
  const [badge, setBadge] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<"shirt" | "badge">("shirt");
  const reqId = useRef(0);

  const shirt = SHIRT_COLORS.find((c) => c.id === color) ?? SHIRT_COLORS[0];
  const enc = useMemo(() => encode(design), [design]);

  useEffect(() => {
    const id = ++reqId.current;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/design?d=${enc}`);
        if (id !== reqId.current) return;
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          setError(j.error || "Couldn’t draw that one.");
          return;
        }
        const svg = await res.text();
        if (id !== reqId.current) return;
        setBadge(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
        setError(null);
      } catch {
        if (id === reqId.current) setError("Network hiccup — retrying when you type.");
      }
    }, 220);
    return () => clearTimeout(t);
  }, [enc]);

  const set = <K extends keyof Design>(k: K, v: Design[K]) => setDesign((d) => ({ ...d, [k]: v }));

  async function buy() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ design, color, size }),
      });
      const j = await res.json();
      if (!res.ok || !j.url) throw new Error(j.error || "Checkout failed.");
      window.location.href = j.url;
    } catch (e: any) {
      setError(e.message);
      setBusy(false);
    }
  }

  const b = BADGE_ON_SHIRT;
  const dark = isDark(shirt.hex);

  return (
    <section className="designer" id="design">
      <div className="stage">
        <div className="stage-tabs" role="tablist">
          <button role="tab" aria-selected={view === "shirt"} onClick={() => setView("shirt")}>
            On the shirt
          </button>
          <button role="tab" aria-selected={view === "badge"} onClick={() => setView("badge")}>
            Close-up
          </button>
        </div>
        {view === "shirt" ? (
          <svg className="mockup" viewBox="40 60 920 960" role="img" aria-label={`${design.name} National Park shirt preview`}>
            <path d={SHIRT_PATH} fill={shirt.hex} stroke={dark ? "#000" : "rgba(0,0,0,.14)"} strokeWidth={3} />
            <path d={COLLAR_PATH} fill="none" stroke={dark ? "rgba(255,255,255,.12)" : "rgba(0,0,0,.08)"} strokeWidth={14} />
            <path d="M228 344Q300 600 240 1000" fill="none" stroke="rgba(0,0,0,.06)" strokeWidth={30} />
            <path d="M772 344Q700 620 760 1000" fill="none" stroke="rgba(0,0,0,.06)" strokeWidth={30} />
            {badge && <image href={badge} x={b.cx - b.size / 2} y={b.cy - b.size / 2} width={b.size} height={b.size} />}
          </svg>
        ) : (
          <div className="closeup">{badge && <img src={badge} alt="Badge close-up" />}</div>
        )}
        <p className="stage-note">
          Preview of the actual print file — ~11″ wide, printed in full colour with DTG.
        </p>
      </div>

      <div className="controls">
        <h1>
          Every person deserves a <em>national park</em>.
        </h1>
        <p className="lede">
          Name one after anyone — or anything. We survey a one-of-a-kind landscape from its name and print it on a
          soft tee.
        </p>
        {canceled && <p className="notice">Checkout canceled — your park is right where you left it.</p>}

        <label className="field">
          <span>Park name</span>
          <input
            value={design.name}
            maxLength={LIMITS.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Maya’s Backyard"
          />
          <small>{design.name.length}/{LIMITS.name} · “National Park” is added for you</small>
        </label>

        <div className="row">
          <label className="field">
            <span>Established</span>
            <input
              value={design.year}
              inputMode="numeric"
              maxLength={4}
              onChange={(e) => set("year", e.target.value.replace(/\D/g, ""))}
              placeholder="1991"
            />
          </label>
          <label className="field grow">
            <span>Motto (top of the ring)</span>
            <input
              value={design.motto}
              maxLength={LIMITS.motto}
              onChange={(e) => set("motto", e.target.value)}
              placeholder="Protected since birth"
            />
          </label>
        </div>

        <fieldset className="field">
          <legend>Landscape</legend>
          <div className="chips">
            {(Object.keys(SCENES) as Scene[]).map((s) => (
              <button key={s} className="chip" aria-pressed={design.scene === s} onClick={() => set("scene", s)}>
                {SCENES[s]}
              </button>
            ))}
            <button className="chip ghost" onClick={() => set("v", (design.v + 1) % 10000)} title="Generate new terrain">
              ↻ Re‑survey
            </button>
          </div>
        </fieldset>

        <fieldset className="field">
          <legend>Palette</legend>
          <div className="chips">
            {(Object.keys(PALETTES) as PaletteKey[]).map((k) => {
              const p = PALETTES[k];
              return (
                <button key={k} className="chip palette" aria-pressed={design.palette === k} onClick={() => set("palette", k)}>
                  <span className="sw">
                    {[p.sky, p.halo, p.layers[0], p.layers[2], p.ribbon].map((c) => (
                      <i key={c} style={{ background: c }} />
                    ))}
                  </span>
                  {p.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="field">
          <legend>
            Shirt colour <span className="muted">— {shirt.label}</span>
          </legend>
          <div className="swatches">
            {SHIRT_COLORS.map((c) => (
              <button
                key={c.id}
                className="swatch"
                aria-label={c.label}
                aria-pressed={color === c.id}
                style={{ background: c.hex }}
                onClick={() => setColor(c.id)}
              />
            ))}
          </div>
        </fieldset>

        <fieldset className="field">
          <legend>Size (unisex)</legend>
          <div className="chips">
            {SIZES.map((s) => (
              <button key={s} className="chip size" aria-pressed={size === s} onClick={() => setSize(s)}>
                {s.toUpperCase()}
              </button>
            ))}
          </div>
        </fieldset>

        {error && <p className="error" role="alert">{error}</p>}

        <button className="buy" onClick={buy} disabled={busy || !!error || !badge}>
          {busy ? "Opening checkout…" : `Establish my park — $${(PRICE_CENTS / 100).toFixed(0)}`}
        </button>
        <p className="fine">Free standard shipping · printed to order · secure checkout by Stripe</p>
      </div>

      <div className="examples">
        <h2>Recently established</h2>
        <div className="example-grid">
          {EXAMPLES.map((ex) => (
            <button
              key={ex.name}
              className="example"
              onClick={() => {
                setDesign(ex);
                document.getElementById("design")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              <img src={`/api/design?d=${encode(ex)}`} alt={`${ex.name} National Park badge`} loading="lazy" />
              <span>{ex.name}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
