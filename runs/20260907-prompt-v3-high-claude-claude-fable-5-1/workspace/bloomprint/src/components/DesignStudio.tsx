"use client";

import { useMemo, useState } from "react";
import { generatePlantSvg } from "@/lib/botanical/generator";
import { CLIMATES, CLIMATE_KEYS } from "@/lib/botanical/palette";
import { DEDICATION_MAX, Design, NAME_MAX, parseDesign, toPlantInput } from "@/lib/design";
import { GARMENT_COLORS, MAX_QUANTITY, SIZES, SizeKey, UNIT_PRICE_CENTS, garmentByKey } from "@/lib/catalog";
import { ShirtMockup } from "./ShirtMockup";
import { PlantSvg } from "./PlantSvg";

export function DesignStudio({
  initial,
  initialSize,
  paymentsEnabled,
}: {
  initial: Design;
  initialSize: SizeKey;
  paymentsEnabled: boolean;
}) {
  const [design, setDesign] = useState<Design>(initial);
  const [size, setSize] = useState<SizeKey>(initialSize);
  const [quantity, setQuantity] = useState(1);
  const [view, setView] = useState<"shirt" | "plate">("shirt");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewDesign: Design = { ...design, name: design.name.trim() || "Your name" };
  const previewKey = JSON.stringify(previewDesign);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const { svg, label } = useMemo(() => generatePlantSvg(toPlantInput(previewDesign)), [previewKey]);

  const garment = garmentByKey(design.garment)!;
  const validation = parseDesign(design);
  const set = <K extends keyof Design>(k: K, v: Design[K]) => setDesign((d) => ({ ...d, [k]: v }));

  async function checkout() {
    setError(null);
    if (!validation.design) {
      setError(validation.error);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ design: validation.design, size, quantity }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Checkout failed");
      window.location.href = data.url;
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-10 py-6 lg:grid-cols-[1fr_420px]">
      {/* preview */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-moss">Your specimen</p>
            <h1 className="font-display text-3xl font-semibold italic">
              {label.genus} {label.species}
              {label.variety ? <span className="ml-2 text-lg not-italic text-ink-soft">{label.variety}</span> : null}
            </h1>
          </div>
          <div className="flex rounded-full border border-ink/15 p-0.5 text-xs">
            {(["shirt", "plate"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`rounded-full px-3 py-1.5 capitalize transition ${view === v ? "bg-ink text-paper" : "text-ink-soft hover:text-ink"}`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-2xl bg-white/60 p-4 shadow-[0_20px_60px_-30px_rgba(43,39,34,0.45)] sm:p-8">
          {view === "shirt" ? (
            <ShirtMockup svg={svg} hex={garment.hex} className="mx-auto w-full max-w-lg" />
          ) : (
            <div className="mx-auto max-w-md rounded-lg p-2" style={{ background: garment.hex }}>
              <PlantSvg svg={svg} />
            </div>
          )}
        </div>
        <p className="mt-3 text-center text-xs text-ink-soft">
          Specimen No. {label.specimenNo} · {label.collected} · {CLIMATES[design.climate].habitat}
        </p>
      </div>

      {/* controls */}
      <div className="space-y-6">
        <div>
          <label className="label" htmlFor="name">
            Name
          </label>
          <input
            id="name"
            className="field font-display text-lg"
            placeholder="Whose plant is this?"
            maxLength={NAME_MAX}
            value={design.name}
            onChange={(e) => set("name", e.target.value)}
            autoFocus
          />
          <p className="mt-1 text-xs text-ink-soft">Becomes the genus: {label.genus}</p>
        </div>

        <div>
          <label className="label" htmlFor="date">
            A date that matters <span className="normal-case tracking-normal text-ink/40">(optional)</span>
          </label>
          <input id="date" type="date" className="field" value={design.date} min="1000-01-01" max="2999-12-31" onChange={(e) => set("date", e.target.value)} />
          <p className="mt-1 text-xs text-ink-soft">A birthday, an anniversary, the day you met. It changes the plant and is printed on the label.</p>
        </div>

        <div>
          <span className="label">Climate</span>
          <div className="grid grid-cols-5 gap-2">
            {CLIMATE_KEYS.map((k) => {
              const c = CLIMATES[k];
              const active = design.climate === k;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => set("climate", k)}
                  className={`rounded-lg border p-2 text-left transition ${active ? "border-ink bg-white" : "border-ink/15 bg-white/40 hover:border-ink/40"}`}
                  title={c.tagline}
                >
                  <div className="flex gap-0.5">
                    {[c.palette.leaves[0], c.palette.petals[0], c.palette.petals[1]].map((col) => (
                      <span key={col} className="h-3 w-3 rounded-full" style={{ background: col }} />
                    ))}
                  </div>
                  <p className="mt-1.5 text-xs font-medium">{c.label}</p>
                </button>
              );
            })}
          </div>
          <p className="mt-1 text-xs text-ink-soft">{CLIMATES[design.climate].tagline}</p>
        </div>

        <div>
          <label className="label" htmlFor="dedication">
            Dedication <span className="normal-case tracking-normal text-ink/40">(optional)</span>
          </label>
          <input
            id="dedication"
            className="field"
            placeholder="For Mum, with love · Est. 2019 · Happy 40th"
            maxLength={DEDICATION_MAX}
            value={design.dedication}
            onChange={(e) => set("dedication", e.target.value)}
          />
        </div>

        <div>
          <button type="button" className="btn-secondary" onClick={() => set("variant", design.variant + 1)}>
            ↻ Grow another from the same seeds
          </button>
          <p className="mt-1 text-xs text-ink-soft">Not this one? Regrow to get a different plant from the same name and date.</p>
        </div>

        <div>
          <span className="label">Shirt colour · {garment.label}</span>
          <div className="flex flex-wrap gap-2">
            {GARMENT_COLORS.map((g) => (
              <button
                key={g.key}
                type="button"
                title={g.label}
                aria-label={g.label}
                onClick={() => set("garment", g.key)}
                className={`h-9 w-9 rounded-full border-2 transition ${design.garment === g.key ? "border-ink scale-110" : "border-ink/15 hover:border-ink/50"}`}
                style={{ background: g.hex }}
              />
            ))}
          </div>
          <p className="mt-1 text-xs text-ink-soft">Dark shirts are drawn with pale ink so the plate stays legible.</p>
        </div>

        <div className="grid grid-cols-[1fr_110px] gap-4">
          <div>
            <span className="label">Size</span>
            <div className="flex flex-wrap gap-1.5">
              {SIZES.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setSize(s.key)}
                  className={`min-w-11 rounded-md border px-2 py-1.5 text-sm transition ${size === s.key ? "border-ink bg-ink text-paper" : "border-ink/20 hover:border-ink"}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label" htmlFor="qty">
              Qty
            </label>
            <select id="qty" className="field" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))}>
              {Array.from({ length: MAX_QUANTITY }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="rounded-xl border border-ink/10 bg-white/60 p-4">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-ink-soft">Total</span>
            <span className="font-display text-3xl font-semibold">${((UNIT_PRICE_CENTS * quantity) / 100).toFixed(2)}</span>
          </div>
          <p className="mt-1 text-xs text-ink-soft">Bella+Canvas 3001 unisex tee · DTG print · standard shipping included</p>
          <button className="btn-primary mt-4 w-full" disabled={busy || !paymentsEnabled} onClick={checkout}>
            {busy ? "Opening secure checkout…" : "Checkout"}
          </button>
          {!paymentsEnabled && (
            <p className="mt-2 text-xs text-blush">Checkout is disabled: this deployment has no Stripe keys configured yet.</p>
          )}
          {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
          <p className="mt-3 text-[11px] leading-relaxed text-ink-soft">
            Payment is handled by Stripe. Your shirt is only sent to print after payment succeeds. Sizes run unisex; when in doubt, size down.
          </p>
        </div>
      </div>
    </div>
  );
}
