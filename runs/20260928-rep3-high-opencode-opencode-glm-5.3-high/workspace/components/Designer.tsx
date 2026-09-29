"use client";

import { useMemo, useState } from "react";
import {
  ACCENTS,
  SHIRTS,
  SHIRT_PRICE_CENTS,
  SHIPPING_PRICE_CENTS,
  SIZES,
  SIZE_LABELS,
  SizeId,
} from "../lib/config";
import { DesignParams, parseDesignInput, renderDesignSVG, weekStats } from "../lib/design";

const DEFAULTS = {
  name: "",
  born: "",
  caption: "Make every week count",
  shirt: "black",
  size: "m" as SizeId,
  accent: "ember",
  qty: 1,
};

export default function Designer() {
  const [form, setForm] = useState({ ...DEFAULTS });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const design: DesignParams | null = useMemo(
    () => parseDesignInput({ ...form }),
    [form]
  );

  // Preview always renders: fall back to a demo design until the form is valid.
  const previewDesign: DesignParams = useMemo(() => {
    if (design) return design;
    return parseDesignInput({
      ...form,
      name: form.name.trim() === "" ? "Your Name" : form.name,
      born: form.born === "" ? "1992-06-12" : form.born,
    })!;
  }, [design, form]);

  const svg = useMemo(() => renderDesignSVG(previewDesign), [previewDesign]);
  const stats = useMemo(() => weekStats(previewDesign), [previewDesign]);

  const shirt = SHIRTS.find((s) => s.id === form.shirt)!;
  const subtotal = (SHIRT_PRICE_CENTS * form.qty) / 100;
  const total = subtotal + SHIPPING_PRICE_CENTS / 100;

  const nameError =
    form.name.trim().length === 0
      ? "Add a name — it becomes the headline of the print."
      : form.name.trim().length > 24
        ? "Keep the name to 24 characters."
        : "";
  const bornError =
    form.born === ""
      ? "Add a birth date — every dot is one week since that day."
      : null;

  function set<K extends keyof typeof DEFAULTS>(key: K, value: (typeof DEFAULTS)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function buy() {
    if (!design || busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          born: form.born,
          caption: form.caption,
          shirt: form.shirt,
          size: form.size,
          accent: form.accent,
          qty: form.qty,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Checkout could not be started");
      }
      window.location.href = data.url as string;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout could not be started");
      setBusy(false);
    }
  }

  return (
    <section id="make" className="designer-wrap">
      {/* ---------------------------------------------------- controls -- */}
      <div className="panel">
        <h2>Make yours</h2>

        <div className="field">
          <label htmlFor="name">Name on the print</label>
          <input
            id="name"
            type="text"
            maxLength={24}
            value={form.name}
            placeholder="e.g. JUNE CARTER"
            onChange={(e) => set("name", e.target.value)}
          />
          <div className="hint">{nameError || `${form.name.trim().length}/24 characters`}</div>
        </div>

        <div className="field">
          <label htmlFor="born">Birth date</label>
          <input
            id="born"
            type="date"
            value={form.born}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => set("born", e.target.value)}
          />
          <div className="hint">{bornError || "Dots are counted from this exact day."}</div>
        </div>

        <div className="field">
          <label htmlFor="caption">Bottom caption (optional)</label>
          <input
            id="caption"
            type="text"
            maxLength={48}
            value={form.caption}
            placeholder="MAKE EVERY WEEK COUNT"
            onChange={(e) => set("caption", e.target.value)}
          />
          <div className="hint">Leave empty to print no caption.</div>
        </div>

        <div className="field">
          <label>Shirt colour — Bella+Canvas 3001</label>
          <div className="swatches" role="radiogroup" aria-label="Shirt colour">
            {SHIRTS.map((s) => (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={form.shirt === s.id}
                aria-label={s.label}
                title={s.label}
                className={`swatch ${form.shirt === s.id ? "selected" : ""}`}
                style={{ background: s.previewHex }}
                onClick={() => set("shirt", s.id)}
              />
            ))}
          </div>
          <div className="hint">{shirt.label} — {shirt.dark ? "light ink" : "dark ink"} print</div>
        </div>

        <div className="field">
          <label>Accent — highlights the week you&apos;re living now</label>
          <div className="swatches" role="radiogroup" aria-label="Accent colour">
            {ACCENTS.map((a) => (
              <button
                key={a.id}
                type="button"
                role="radio"
                aria-checked={form.accent === a.id}
                aria-label={a.label}
                title={a.label}
                className={`swatch accent-swatch ${form.accent === a.id ? "selected" : ""}`}
                style={{ background: a.hex }}
                onClick={() => set("accent", a.id)}
              />
            ))}
          </div>
        </div>

        <div className="field">
          <label>Size</label>
          <div className="size-chips" role="radiogroup" aria-label="Size">
            {SIZES.map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={form.size === s}
                className={`chip ${form.size === s ? "selected" : ""}`}
                onClick={() => set("size", s)}
              >
                {SIZE_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Quantity</label>
          <div className="qty-row">
            <button
              type="button"
              className="qty-btn"
              aria-label="Fewer shirts"
              disabled={form.qty <= 1}
              onClick={() => set("qty", Math.max(1, form.qty - 1))}
            >
              –
            </button>
            <span aria-live="polite">{form.qty}</span>
            <button
              type="button"
              className="qty-btn"
              aria-label="More shirts"
              disabled={form.qty >= 5}
              onClick={() => set("qty", Math.min(5, form.qty + 1))}
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------- preview -- */}
      <div className="preview-panel panel">
        <h2>Your life, so far</h2>
        <div className="garment" style={{ background: shirt.previewHex }}>
          {/* The exact SVG the print file is rasterised from. */}
          <div
            className="print"
            aria-label="Preview of your life calendar print"
            role="img"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        </div>
        <div className="garment-label">{shirt.label} · Size {SIZE_LABELS[form.size as SizeId]} · front print</div>

        <div className="preview-stats">
          <div>
            Weeks lived<b>{stats.lived.toLocaleString("en-US")}</b>
          </div>
          <div>
            Now in<b>{stats.current > 0 ? `week ${stats.current.toLocaleString("en-US")}` : "—"}</b>
          </div>
          <div>
            Weeks to come<b>{Math.max(0, stats.remaining).toLocaleString("en-US")}</b>
          </div>
        </div>

        <div className="legend">
          <span className="key">weeks you have lived</span>
          <span className="key now">the week you are living</span>
          <span className="key future">weeks to come (to age 80)</span>
        </div>

        <div className="buy-box">
          <div className="price-line">
            <span>{form.qty} × Life-calendar tee</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div className="price-line">
            <span>Shipping (worldwide)</span>
            <span>${(SHIPPING_PRICE_CENTS / 100).toFixed(2)}</span>
          </div>
          <div className="price-line total">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
          <button
            type="button"
            className="buy-btn"
            disabled={!design || busy}
            onClick={buy}
          >
            {busy ? "Taking you to checkout…" : "Buy your life on a shirt"}
          </button>
          <div className="error-note" role="alert">
            {error || (design ? "" : nameError || bornError || "")}
          </div>
          <div className="trust-line">
            Secure checkout with Stripe · printed &amp; shipped after payment
          </div>
        </div>
      </div>
    </section>
  );
}
