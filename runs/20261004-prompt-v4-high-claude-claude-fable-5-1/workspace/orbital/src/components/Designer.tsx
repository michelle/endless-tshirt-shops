"use client";

import { useMemo, useState } from "react";
import { buildDesignSvg, CAPTION_MAX, DATE_FORMATS, DATE_MAX, DATE_MIN, PALETTES, resolvePalette, type Design } from "@/lib/design";
import { SHIRT_COLORS, SHIRT_PRICE_CENTS, SHIRT_SIZES, SHIPPING_OPTIONS } from "@/lib/catalog";
import { ShirtMockup } from "./ShirtMockup";

const SUGGESTIONS = ["the day you were born", "the day we met", "our wedding day", "the day everything changed", "first day on earth"];

export function Designer({ initial }: { initial: Design }) {
  const [design, setDesign] = useState<Design>(initial);
  const [size, setSize] = useState("l");
  const [qty, setQty] = useState(1);
  const [view, setView] = useState<"shirt" | "art">("shirt");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const svg = useMemo(() => buildDesignSvg(design, { webFonts: false }), [design]);
  const shirt = SHIRT_COLORS.find((c) => c.id === design.shirt) ?? SHIRT_COLORS[0];
  const palette = resolvePalette(design).id;
  const set = (patch: Partial<Design>) => setDesign((d) => ({ ...d, ...patch }));

  async function checkout() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ design, size, qty }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error ?? "Checkout failed");
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setBusy(false);
    }
  }

  return (
    <section id="design" className="mt-16 grid gap-10 lg:grid-cols-[1fr_1fr]">
      {/* Preview */}
      <div className="lg:sticky lg:top-6 lg:self-start">
        <div className="rounded-2xl border border-line bg-panel p-4 sm:p-6">
          <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-widest text-dim">
            <span>Live preview</span>
            <div className="flex gap-1 rounded-md border border-line p-0.5">
              {(["shirt", "art"] as const).map((v) => (
                <button key={v} onClick={() => setView(v)} className={`rounded px-2 py-1 ${view === v ? "bg-paper text-night" : "hover:text-paper"}`}>
                  {v === "shirt" ? "On shirt" : "Print file"}
                </button>
              ))}
            </div>
          </div>
          {view === "shirt" ? (
            <ShirtMockup svg={svg} shirtId={design.shirt} />
          ) : (
            <div className="overflow-hidden rounded-lg" style={{ background: shirt.hex }} dangerouslySetInnerHTML={{ __html: svg.replace("<svg ", '<svg style="width:100%;height:auto;display:block" ') }} />
          )}
          <p className="mt-3 text-xs text-dim">
            Print area 15.6 × 19.3 in at 300 dpi · {palette} ink on {shirt.label.toLowerCase()} · exact artwork that goes to the printer.
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="space-y-8">
        <Field label="Your date" hint="Any day from 1800 to 2050.">
          <input
            type="date"
            value={design.date}
            min={DATE_MIN}
            max={DATE_MAX}
            onChange={(e) => e.target.value && set({ date: e.target.value })}
            className="w-full rounded-md border border-line bg-night px-3 py-2 text-paper"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {DATE_FORMATS.map((f) => (
              <Chip key={f.id} active={design.df === f.id} onClick={() => set({ df: f.id })}>{f.example}</Chip>
            ))}
          </div>
        </Field>

        <Field label="Caption" hint={`Up to ${CAPTION_MAX} characters, or leave it blank.`}>
          <input
            type="text"
            value={design.cap}
            maxLength={CAPTION_MAX}
            placeholder="the day you were born"
            onChange={(e) => set({ cap: e.target.value })}
            className="w-full rounded-md border border-line bg-night px-3 py-2 text-paper serif text-xl italic"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <Chip key={s} active={design.cap === s} onClick={() => set({ cap: s })}>{s}</Chip>
            ))}
            <Chip active={design.cap === ""} onClick={() => set({ cap: "" })}>no caption</Chip>
          </div>
        </Field>

        <Field label="Shirt colour" hint="Auto ink picks chalk on dark shirts and ink on light ones.">
          <div className="flex flex-wrap gap-2">
            {SHIRT_COLORS.map((c) => (
              <button
                key={c.id}
                title={c.label}
                onClick={() => set({ shirt: c.id })}
                className={`h-9 w-9 rounded-full border-2 ${design.shirt === c.id ? "border-gold" : "border-line"}`}
                style={{ background: c.hex }}
                aria-label={c.label}
              />
            ))}
          </div>
          <div className="mt-1 text-sm">{shirt.label}</div>
        </Field>

        <Field label="Ink" hint={PALETTES.find((p) => p.id === design.pal)?.hint}>
          <div className="flex flex-wrap gap-2">
            {PALETTES.map((p) => (
              <Chip key={p.id} active={design.pal === p.id} onClick={() => set({ pal: p.id })}>{p.label}</Chip>
            ))}
          </div>
        </Field>

        <Field label="Pluto">
          <div className="flex gap-2">
            <Chip active={design.pluto} onClick={() => set({ pluto: true })}>Pluto is a planet to me</Chip>
            <Chip active={!design.pluto} onClick={() => set({ pluto: false })}>Eight is enough</Chip>
          </div>
        </Field>

        <Field label="Size" hint="Unisex Gildan Softstyle. Between sizes? Go up.">
          <div className="flex flex-wrap gap-2">
            {SHIRT_SIZES.map((s) => (
              <Chip key={s.id} active={size === s.id} onClick={() => setSize(s.id)}>{s.label}</Chip>
            ))}
          </div>
        </Field>

        <div className="rounded-2xl border border-line bg-panel p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl">${((SHIRT_PRICE_CENTS * qty) / 100).toFixed(2)}</div>
              <div className="text-xs text-dim">
                + {SHIPPING_OPTIONS.map((o) => `$${(o.cents / 100).toFixed(2)} ${o.label.toLowerCase()}`).join(" or ")}
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-dim">
              Qty
              <select value={qty} onChange={(e) => setQty(Number(e.target.value))} className="rounded-md border border-line bg-night px-2 py-1 text-paper">
                {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
          </div>
          <button
            onClick={checkout}
            disabled={busy}
            className="mt-4 w-full rounded-lg bg-paper py-3 text-base font-medium text-night transition hover:bg-gold disabled:opacity-60"
          >
            {busy ? "Opening secure checkout…" : "Buy this tee"}
          </button>
          {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
          <p className="mt-3 text-xs text-dim">Secure payment by Stripe. Your shirt is sent to the print lab the moment payment clears.</p>
        </div>
      </div>
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <label className="text-xs uppercase tracking-widest text-dim">{label}</label>
      </div>
      {children}
      {hint && <p className="mt-2 text-xs text-dim">{hint}</p>}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-sm transition ${active ? "border-gold bg-gold/10 text-paper" : "border-line text-dim hover:border-paper hover:text-paper"}`}
    >
      {children}
    </button>
  );
}
