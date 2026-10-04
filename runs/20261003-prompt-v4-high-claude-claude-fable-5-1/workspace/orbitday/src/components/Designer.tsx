"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DesignPreview } from "./DesignPreview";
import {
  ACCENTS,
  DEFAULT_DESIGN,
  PRODUCT,
  SHIRT_COLORS,
  SIZES,
  STYLES,
  decodeDesign,
  designSchema,
  encodeDesign,
  money,
  type Accent,
  type Design,
  type ShirtColor,
  type Style,
} from "@/lib/design";
import { skySnapshot } from "@/lib/astro";

function todayIso() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
}

export function Designer() {
  const params = useSearchParams();
  const router = useRouter();
  const [design, setDesign] = useState<Design>(() => {
    const t = params.get("d");
    if (t) {
      try {
        return decodeDesign(t);
      } catch {
        /* fall through */
      }
    }
    return { ...DEFAULT_DESIGN, name: "", subtitle: "", date: "1994-06-14" };
  });
  const [mode, setMode] = useState<"mockup" | "print">("mockup");
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsed = designSchema.safeParse(design);
  const valid = parsed.success;
  const safeDesign = parsed.success ? parsed.data : { ...design, date: DEFAULT_DESIGN.date };
  const sky = useMemo(() => skySnapshot(safeDesign.date), [safeDesign.date]);

  // keep the URL shareable
  useEffect(() => {
    if (!valid) return;
    const t = encodeDesign(parsed.data);
    const id = setTimeout(() => router.replace(`/design?d=${t}`, { scroll: false }), 300);
    return () => clearTimeout(id);
  }, [valid, parsed.success ? encodeDesign(parsed.data) : "", router]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = <K extends keyof Design>(k: K, v: Design[K]) => setDesign((d) => ({ ...d, [k]: v }));

  async function checkout() {
    if (!valid) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ design: parsed.data, quantity }),
      });
      const json = await res.json();
      if (!res.ok || !json.url) throw new Error(json.error ?? "Checkout failed");
      window.location.href = json.url;
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  const subtotal = PRODUCT.priceCents * quantity;
  const earth = sky.planets.find((p) => p.id === "earth")!;

  return (
    <div className="designer">
      <div className="preview-panel">
        <div className="preview-tabs" role="tablist">
          <button className={mode === "mockup" ? "active" : ""} onClick={() => setMode("mockup")}>
            On the shirt
          </button>
          <button className={mode === "print" ? "active" : ""} onClick={() => setMode("print")}>
            Print file
          </button>
        </div>
        <div className={`preview-stage ${mode}`}>
          <DesignPreview design={safeDesign} mode={mode} />
        </div>
        <p className="preview-note">
          {mode === "mockup"
            ? "Mockup is schematic. Print covers roughly 11 inches across the chest."
            : `Exactly what goes to the printer: ${PRODUCT.printPx.w} × ${PRODUCT.printPx.h} px at 300 DPI, transparent background, ${SHIRT_COLORS[safeDesign.shirt].dark ? "white" : "charcoal"} ink.`}
        </p>
        <div className="sky-facts" aria-label="Sky facts for this date">
          <span className="chip">
            Moon <b>{sky.moon.name}</b> · {Math.round(sky.moon.illumination * 100)}% lit
          </span>
          <span className="chip">
            Earth at <b>{earth.longitude.toFixed(1)}°</b> heliocentric longitude
          </span>
          {sky.planets
            .filter((p) => p.id !== "earth")
            .map((p) => (
              <span key={p.id} className="chip">
                {p.label} <b>{Math.round(p.longitude)}°</b>
              </span>
            ))}
        </div>
      </div>

      <div className="form">
        <div className="field">
          <label htmlFor="date">The date</label>
          <div className="input-row">
            <input
              id="date"
              className="input"
              type="date"
              min="1900-01-01"
              max="2050-12-31"
              value={design.date}
              onChange={(e) => set("date", e.target.value)}
            />
            <button type="button" className="btn btn-ghost" onClick={() => set("date", todayIso())}>
              Today
            </button>
          </div>
          {!valid && <div className="error" style={{ marginTop: 6 }}>Pick a valid day between 1900 and 2050.</div>}
          <div className="hint">Birthdays, anniversaries, the day you met. Future dates work too.</div>
        </div>

        <div className="field">
          <label htmlFor="name">Main caption</label>
          <input
            id="name"
            className="input"
            placeholder="A name, or a phrase like THE DAY WE MET"
            maxLength={24}
            value={design.name}
            onChange={(e) => set("name", e.target.value)}
          />
          <div className="counter">{design.name.length}/24</div>
        </div>

        <div className="field">
          <label htmlFor="subtitle">Small line (optional)</label>
          <input
            id="subtitle"
            className="input"
            placeholder="A place, a weight, a time, a message"
            maxLength={40}
            value={design.subtitle}
            onChange={(e) => set("subtitle", e.target.value)}
          />
          <div className="counter">{design.subtitle.length}/40</div>
        </div>

        <div className="field">
          <label>Shirt colour</label>
          <div className="swatches">
            {(Object.keys(SHIRT_COLORS) as ShirtColor[]).map((c) => (
              <button
                key={c}
                type="button"
                title={SHIRT_COLORS[c].label}
                aria-label={SHIRT_COLORS[c].label}
                className={`swatch ${design.shirt === c ? "active" : ""}`}
                style={{ background: SHIRT_COLORS[c].hex }}
                onClick={() => set("shirt", c)}
              />
            ))}
          </div>
          <div className="swatch-label">
            {SHIRT_COLORS[design.shirt].label} · printed in {SHIRT_COLORS[design.shirt].dark ? "white" : "charcoal"} ink
          </div>
        </div>

        <div className="field">
          <label>Accent (sun and Earth)</label>
          <div className="swatches">
            {(Object.keys(ACCENTS) as Accent[]).map((a) => (
              <button
                key={a}
                type="button"
                title={ACCENTS[a].label}
                aria-label={ACCENTS[a].label}
                className={`swatch ${a === "mono" ? "mono" : ""} ${design.accent === a ? "active" : ""}`}
                style={a === "mono" ? undefined : { background: ACCENTS[a].hex }}
                onClick={() => set("accent", a)}
              />
            ))}
          </div>
          <div className="swatch-label">{ACCENTS[design.accent].label}</div>
        </div>

        <div className="field">
          <label>Style</label>
          <div className="segmented">
            {(Object.keys(STYLES) as Style[]).map((s) => (
              <button key={s} type="button" className={design.style === s ? "active" : ""} onClick={() => set("style", s)}>
                {STYLES[s].label}
              </button>
            ))}
          </div>
          <div className="hint">{STYLES[design.style].blurb}</div>
          <label className="toggle" style={{ marginTop: 12, textTransform: "none", letterSpacing: 0, fontSize: 14 }}>
            <input type="checkbox" checked={design.showDate} onChange={(e) => set("showDate", e.target.checked)} />
            Show the date and moon phase under the caption
          </label>
        </div>

        <div className="field">
          <label>Size (unisex)</label>
          <div className="sizes">
            {SIZES.map((s) => (
              <button key={s} type="button" className={design.size === s ? "active" : ""} onClick={() => set("size", s)}>
                {s}
              </button>
            ))}
          </div>
          <div className="hint">Bella+Canvas 3001 runs true to size. Chest width: S 18" · M 20" · L 22" · XL 24".</div>
        </div>

        <div className="checkout-box">
          <div className="price-row" style={{ alignItems: "center" }}>
            <span>Quantity</span>
            <span className="qty">
              <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} aria-label="Decrease">
                −
              </button>
              <span>{quantity}</span>
              <button type="button" onClick={() => setQuantity((q) => Math.min(10, q + 1))} aria-label="Increase">
                +
              </button>
            </span>
          </div>
          <div className="price-row">
            <span>
              {quantity} × Orbitday Tee
            </span>
            <span>{money(subtotal)}</span>
          </div>
          <div className="price-row">
            <span>Standard shipping (worldwide)</span>
            <span>{money(PRODUCT.shippingCents)}</span>
          </div>
          <div className="price-row total">
            <span>Total</span>
            <span>{money(subtotal + PRODUCT.shippingCents)}</span>
          </div>
          <button className="btn btn-primary btn-lg" disabled={!valid || busy} onClick={checkout}>
            {busy ? "Opening secure checkout…" : "Checkout"}
          </button>
          {error && <div className="error">{error}</div>}
          <div className="fine">
            Payment is handled by Stripe. Your shirt is only sent to print after payment succeeds. Made to order, so please double-check the date and spelling.
          </div>
        </div>
      </div>
    </div>
  );
}
