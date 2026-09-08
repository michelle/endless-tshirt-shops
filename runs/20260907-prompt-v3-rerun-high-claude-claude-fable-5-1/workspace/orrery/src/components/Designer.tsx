"use client";
import { useEffect, useMemo, useState } from "react";
import ShirtMockup from "./ShirtMockup";
import { CAPTION_MAX, DEFAULT_DESIGN, formatDate, type Design } from "@/lib/design";
import { ACCENTS, MAX_QTY, PRICE_CENTS, SIZES, TEE_COLORS, accent, teeColor, type Size } from "@/lib/catalog";
import { PLANET_NAMES, solarSystemOn } from "@/lib/astro";
import { parseDate } from "@/lib/design";

const PRESETS: Array<{ label: string; caption: string }> = [
  { label: "Birthday", caption: "The day I arrived" },
  { label: "Wedding", caption: "Since this day" },
  { label: "First met", caption: "The day we met" },
  { label: "In memory", caption: "Always with us" },
];

export default function Designer({ initial, initialSize = "m", initialQty = 1 }: { initial?: Partial<Design>; initialSize?: Size; initialQty?: number }) {
  const [design, setDesign] = useState<Design>({ ...DEFAULT_DESIGN, ...initial });
  const [size, setSize] = useState<Size>(initialSize);
  const [qty, setQty] = useState<number>(initialQty);
  const [flat, setFlat] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateInput, setDateInput] = useState(design.date);

  useEffect(() => {
    if (parseDate(dateInput)) setDesign((d) => ({ ...d, date: dateInput }));
  }, [dateInput]);

  const tc = teeColor(design.tee);
  const set = <K extends keyof Design>(k: K, v: Design[K]) => setDesign((d) => ({ ...d, [k]: v }));

  const facts = useMemo(() => {
    const p = parseDate(design.date);
    if (!p) return null;
    const ps = solarSystemOn(p.y, p.m, p.d);
    const earth = ps.find((x) => x.id === "earth")!;
    // nearest neighbour to Earth by angle: a small fun fact
    const others = ps.filter((x) => x.id !== "earth" && x.id !== "pluto");
    const closest = others.reduce((best, x) => {
      const diff = Math.abs((((x.longitude - earth.longitude) % 360) + 540) % 360 - 180);
      return diff > best.diff ? { id: x.id, diff } : best;
    }, { id: others[0].id, diff: -1 });
    return { earth: Math.round(earth.longitude), aligned: PLANET_NAMES[closest.id], mercury: Math.round(ps[0].longitude) };
  }, [design.date]);

  async function checkout() {
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...design, size, qty }) });
      const j = await res.json();
      if (!res.ok || !j.url) throw new Error(j.error ?? "Could not start checkout");
      window.location.href = j.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setBusy(false);
    }
  }

  const price = (PRICE_CENTS * qty) / 100;

  return (
    <section id="design" className="mx-auto grid max-w-6xl gap-10 px-5 py-10 lg:grid-cols-[1.05fr_1fr]">
      {/* Preview */}
      <div className="lg:sticky lg:top-6 lg:self-start">
        <div className="rounded-2xl border border-line bg-dusk/60 p-5 sm:p-8">
          <ShirtMockup design={design} flat={flat} />
          <div className="mt-4 flex items-center justify-between">
            <div className="mono text-[11px] uppercase tracking-[0.18em] text-mute">Live preview · exactly what we print</div>
            <div className="flex gap-1">
              <button className="chip" data-on={!flat} onClick={() => setFlat(false)}>On tee</button>
              <button className="chip" data-on={flat} onClick={() => setFlat(true)}>Print file</button>
            </div>
          </div>
        </div>
        {facts && (
          <p className="mt-4 text-sm text-mute">
            On <span className="text-bone">{formatDate(design.date)}</span>, Earth sat at {facts.earth}° of its orbit and {facts.aligned} was on the far side of the Sun. Mercury was at {facts.mercury}°. Every ring and dot above is computed from those positions.
          </p>
        )}
      </div>

      {/* Controls */}
      <div className="space-y-8">
        <div>
          <label className="lbl" htmlFor="date">1 · The date</label>
          <input id="date" type="date" className="field mono" value={dateInput} min="1000-01-01" max="2999-12-31" onChange={(e) => setDateInput(e.target.value)} />
          <p className="mt-2 text-xs text-mute">A birthday, a wedding, the day you met, the day you left. Any date from 1000 to 2999.</p>
        </div>

        <div>
          <label className="lbl" htmlFor="caption">2 · Your words <span className="text-mute/70">({design.caption.length}/{CAPTION_MAX})</span></label>
          <input id="caption" className="field" value={design.caption} maxLength={CAPTION_MAX} placeholder="Leave blank for just the date" onChange={(e) => set("caption", e.target.value)} />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button key={p.label} className="chip" data-on={design.caption === p.caption} onClick={() => set("caption", p.caption)}>{p.label}</button>
            ))}
          </div>
        </div>

        <div>
          <label className="lbl">3 · Tee colour <span className="text-mute/70">— {tc.label}, {tc.dark ? "printed in white ink" : "printed in black ink"}</span></label>
          <div className="flex flex-wrap gap-2">
            {TEE_COLORS.map((c) => (
              <button key={c.id} title={c.label} aria-label={c.label} onClick={() => set("tee", c.id)}
                className="h-9 w-9 rounded-full border-2 transition-transform hover:scale-110"
                style={{ background: c.hex, borderColor: design.tee === c.id ? "#f3efe6" : "rgba(255,255,255,0.15)" }} />
            ))}
          </div>
        </div>

        <div>
          <label className="lbl">4 · Earth, highlighted in</label>
          <div className="flex flex-wrap gap-2">
            {ACCENTS.map((a) => (
              <button key={a.id} className="chip flex items-center gap-2" data-on={design.accent === a.id} onClick={() => set("accent", a.id)}>
                <span className="inline-block h-3 w-3 rounded-full" style={{ background: tc.dark ? a.onDark : a.onLight }} />{a.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-mute">DTG prints full colour, so the Sun is always gold and Earth gets your pick.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="lbl">5 · Scope</label>
            <div className="flex gap-1.5">
              <button className="chip" data-on={design.layout === "full"} onClick={() => set("layout", "full")}>Whole system</button>
              <button className="chip" data-on={design.layout === "inner"} onClick={() => set("layout", "inner")}>Inner planets</button>
            </div>
          </div>
          <div>
            <label className="lbl">Details</label>
            <div className="flex flex-wrap gap-1.5">
              <button className="chip" data-on={design.labels} onClick={() => set("labels", !design.labels)}>Planet names</button>
              <button className="chip" data-on={design.pluto} disabled={design.layout === "inner"} onClick={() => set("pluto", !design.pluto)} title="We don't judge.">Include Pluto</button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
          <div>
            <label className="lbl">6 · Size <span className="text-mute/70">— unisex, Gildan Softstyle</span></label>
            <div className="flex flex-wrap gap-1.5">
              {SIZES.map((s) => (
                <button key={s} className="chip mono uppercase" data-on={size === s} onClick={() => setSize(s)}>{s}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="lbl" htmlFor="qty">Qty</label>
            <select id="qty" className="field mono" value={qty} onChange={(e) => setQty(Number(e.target.value))}>
              {Array.from({ length: MAX_QTY }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-dusk/60 p-5">
          <div className="flex items-baseline justify-between">
            <div>
              <div className="mono text-2xl">${price.toFixed(2)}</div>
              <div className="text-xs text-mute">USD · shipping included · 100% ring-spun cotton</div>
            </div>
            <div className="text-right text-xs text-mute">
              {formatDate(design.date)}<br />{tc.label} · {size.toUpperCase()} · {accent(design.accent).label}
            </div>
          </div>
          <button onClick={checkout} disabled={busy}
            className="mt-4 w-full rounded-lg bg-bone px-5 py-3 font-semibold text-night transition hover:bg-white disabled:opacity-60">
            {busy ? "Opening secure checkout…" : "Buy this shirt"}
          </button>
          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
          <p className="mt-3 text-xs text-mute">Secure card payment by Stripe. Printed to order and dispatched in 2–5 working days; delivery 3–10 days depending on country.</p>
        </div>
      </div>
    </section>
  );
}
