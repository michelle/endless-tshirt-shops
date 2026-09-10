"use client";

import { useMemo, useState } from "react";
import { Design, GRAINS, GrainKey, LIMITS, PALETTES, PaletteKey, parseDesign, renderRings, todayISO, encodeDesignParam } from "@/lib/rings";
import { SHIRT_COLORS, SIZES, Size, PRICE_CENTS, SHIPPING_CENTS, MAX_QTY, formatMoney, findColor } from "@/lib/catalog";
import { ShirtMockup } from "./ShirtMockup";
import { RingArt } from "./RingArt";

type MomentRow = { year: string; label: string };

export type DesignerInitial = {
  design?: Design | null;
  color?: string;
  size?: string;
};

export function Designer({ initial }: { initial: DesignerInitial }) {
  const d0 = initial.design;
  const [name, setName] = useState(d0?.name ?? "");
  const [born, setBorn] = useState(d0?.born ?? "");
  const [moments, setMoments] = useState<MomentRow[]>(
    d0?.milestones?.length
      ? d0.milestones.map((m) => ({ year: String(m.year), label: m.label }))
      : [{ year: "", label: "" }],
  );
  const [palette, setPalette] = useState<PaletteKey>(d0?.palette ?? "oak");
  const [grain, setGrain] = useState<GrainKey>(d0?.grain ?? "classic");
  const [caption, setCaption] = useState(d0?.caption ?? "");
  const [colorKey, setColorKey] = useState(findColor(initial.color ?? "") ? initial.color! : "black");
  const [size, setSize] = useState<Size>((SIZES as readonly string[]).includes(initial.size ?? "") ? (initial.size as Size) : "m");
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const color = findColor(colorKey)!;
  const thisYear = new Date().getUTCFullYear();
  const bornYear = /^\d{4}/.test(born) ? Number(born.slice(0, 4)) : null;

  const { design, art, rings, problem } = useMemo(() => {
    try {
      const design = parseDesign({
        name,
        born,
        milestones: moments.map((m) => ({ year: Number(m.year), label: m.label })),
        palette,
        grain,
        caption,
        asOf: todayISO(),
      });
      const r = renderRings(design, { onDark: color.dark, nested: { x: 165, y: 150, width: 270, height: 252 }, id: "mock" });
      const flat = renderRings(design, { onDark: color.dark, id: "flat" });
      return { design, art: r.svg, flat: flat.svg, rings: r.rings, problem: null as string | null };
    } catch (e) {
      return { design: null, art: "", flat: "", rings: 0, problem: (e as Error).message };
    }
  }, [name, born, moments, palette, grain, caption, color.dark]);

  const flatArt = useMemo(
    () => (design ? renderRings(design, { onDark: color.dark, id: "flat" }).svg : ""),
    [design, color.dark],
  );

  function updateMoment(i: number, patch: Partial<MomentRow>) {
    setMoments((ms) => ms.map((m, j) => (j === i ? { ...m, ...patch } : m)));
  }

  async function checkout() {
    if (!design) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ design, color: colorKey, size, quantity: qty }),
      });
      const json = await res.json();
      if (!res.ok || !json.url) throw new Error(json.error || "Could not start checkout.");
      window.location.href = json.url;
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  const shareHref = design ? `/design?d=${encodeDesignParam(design)}&c=${encodeURIComponent(colorKey)}&s=${size}` : null;
  const subtotal = PRICE_CENTS * qty;

  return (
    <div className="designer">
      <div className="stage">
        <div className="mock">
          {design ? (
            <ShirtMockup color={color} artSvg={art} />
          ) : (
            <ShirtMockup color={color} artSvg="" />
          )}
        </div>
        <div className="under">
          <span className="pill">{design ? `${rings} ${rings === 1 ? "ring" : "rings"} · ${PALETTES[palette].label} · ${color.label}` : "Enter your birthday to grow your rings"}</span>
          {shareHref && (
            <a className="pill" href={shareHref} style={{ textDecoration: "none" }}>
              Share link ↗
            </a>
          )}
        </div>
        {design && (
          <details className="flat">
            <summary>See the print at full size</summary>
            <RingArt svg={flatArt} className="art" style={{ background: color.hex }} />
            <p className="hint" style={{ marginTop: 10 }}>
              This is the exact artwork that gets printed, 11 inches wide, centred on the chest.
            </p>
          </details>
        )}
      </div>

      <div className="panel">
        <div>
          <h1>Grow your rings</h1>
          <p className="intro">
            One ring for every year you&apos;ve lived, wider in the fast-growing years, with the moments that shaped you marked in colour. It&apos;s generated from what you type, so it only exists once.
          </p>
        </div>

        <div className="row">
          <div className="field">
            <label htmlFor="name">
              Name on the shirt <small>optional</small>
            </label>
            <input id="name" type="text" maxLength={LIMITS.nameMax} placeholder="e.g. Michelle, or Mum, or The Riveras" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="born">Birthday</label>
            <input id="born" type="date" min="1900-01-01" max={todayISO()} value={born} onChange={(e) => setBorn(e.target.value)} required />
          </div>
        </div>

        <div className="field">
          <span className="lbl">
            Moments that shaped you <small>up to {LIMITS.milestoneMax}, each becomes a coloured ring</small>
          </span>
          <div className="moments">
            {moments.map((m, i) => (
              <div className="moment" key={i}>
                <input
                  type="number"
                  placeholder="Year"
                  min={bornYear ?? LIMITS.minYear}
                  max={thisYear}
                  value={m.year}
                  onChange={(e) => updateMoment(i, { year: e.target.value })}
                  aria-label={`Moment ${i + 1} year`}
                />
                <input
                  type="text"
                  placeholder={["Met Sam", "Moved to Lisbon", "Juniper was born", "First marathon", "Started the shop", "Got sober"][i % 6]}
                  maxLength={LIMITS.milestoneLabelMax}
                  value={m.label}
                  onChange={(e) => updateMoment(i, { label: e.target.value })}
                  aria-label={`Moment ${i + 1} label`}
                />
                <button type="button" className="x" aria-label="Remove moment" onClick={() => setMoments((ms) => (ms.length > 1 ? ms.filter((_, j) => j !== i) : [{ year: "", label: "" }]))}>
                  ×
                </button>
              </div>
            ))}
          </div>
          <button type="button" className="add" disabled={moments.length >= LIMITS.milestoneMax} onClick={() => setMoments((ms) => [...ms, { year: "", label: "" }])}>
            + Add a moment
          </button>
          {bornYear && moments.some((m) => m.year && (Number(m.year) < bornYear || Number(m.year) > thisYear)) && (
            <p className="hint">Moments outside {bornYear}–{thisYear} are skipped.</p>
          )}
        </div>

        <div className="field">
          <span className="lbl">Palette</span>
          <div className="swatches" role="radiogroup" aria-label="Palette">
            {(Object.keys(PALETTES) as PaletteKey[]).map((k) => {
              const p = PALETTES[k];
              return (
                <button key={k} type="button" role="radio" aria-checked={palette === k} className={`swatch ${palette === k ? "on" : ""}`} onClick={() => setPalette(k)} title={p.blurb}>
                  <span className="dots">
                    {p.swatch.map((c, i) => (
                      <i key={i} style={{ background: c }} />
                    ))}
                  </span>
                  {p.label}
                </button>
              );
            })}
          </div>
          <p className="hint">{PALETTES[palette].blurb}</p>
        </div>

        <div className="row">
          <div className="field">
            <span className="lbl">Grain</span>
            <div className="seg" role="radiogroup" aria-label="Grain">
              {(Object.keys(GRAINS) as GrainKey[]).map((k) => (
                <button key={k} type="button" role="radio" aria-checked={grain === k} className={grain === k ? "on" : ""} onClick={() => setGrain(k)} title={GRAINS[k].blurb}>
                  {GRAINS[k].label}
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <label htmlFor="caption">
              Caption <small>optional</small>
            </label>
            <input id="caption" type="text" maxLength={LIMITS.captionMax} placeholder={design ? `Est. ${design.born.slice(0, 4)} · ${rings} rings` : "Est. 1988 · 39 rings"} value={caption} onChange={(e) => setCaption(e.target.value)} />
          </div>
        </div>

        <div className="field">
          <span className="lbl">Shirt colour</span>
          <div className="swatches" role="radiogroup" aria-label="Shirt colour">
            {SHIRT_COLORS.map((c) => (
              <button key={c.key} type="button" role="radio" aria-checked={colorKey === c.key} className={`swatch ${colorKey === c.key ? "on" : ""}`} onClick={() => setColorKey(c.key)}>
                <span className="chip" style={{ background: c.hex }} />
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="row">
          <div className="field">
            <span className="lbl">
              Size <small>unisex, true to size</small>
            </span>
            <div className="sizes" role="radiogroup" aria-label="Size">
              {SIZES.map((s) => (
                <button key={s} type="button" role="radio" aria-checked={size === s} className={size === s ? "on" : ""} onClick={() => setSize(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <span className="lbl">Quantity</span>
            <div className="qty">
              <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Fewer">
                −
              </button>
              <span>{qty}</span>
              <button type="button" onClick={() => setQty((q) => Math.min(MAX_QTY, q + 1))} aria-label="More">
                +
              </button>
            </div>
          </div>
        </div>

        <div className="summary">
          <div className="line">
            <span>
              Heartwood Ring Tee × {qty}
            </span>
            <span>{formatMoney(subtotal)}</span>
          </div>
          <div className="line">
            <span>Shipping, worldwide</span>
            <span>{formatMoney(SHIPPING_CENTS)}</span>
          </div>
          <div className="line total">
            <span>Total</span>
            <span>{formatMoney(subtotal + SHIPPING_CENTS)}</span>
          </div>
          {err && <p className="error" style={{ marginTop: 12 }}>{err}</p>}
          {problem && born && <p className="error" style={{ marginTop: 12 }}>{problem}</p>}
          <button type="button" className="btn accent big" disabled={!design || busy} onClick={checkout}>
            {busy ? "Opening secure checkout…" : "Checkout"}
          </button>
          <p className="fine">
            Secure payment by Stripe. Printed to order in 2–5 business days, then shipped. Because every shirt is generated for one person, we can only accept returns for faults or damage.
          </p>
        </div>
      </div>
    </div>
  );
}
