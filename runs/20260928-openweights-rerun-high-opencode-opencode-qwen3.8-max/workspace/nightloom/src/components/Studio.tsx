'use client';

// The Nightloom studio: every control feeds the same deterministic design
// renderer that produces the print file, so the preview is the product.

import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { buildDesignSvg } from '@/lib/design';
import { PALETTES, type PaletteId } from '@/lib/palettes';
import {
  MAX_QTY,
  SHIRT_COLORS,
  SHIRT_SIZES,
  SHIRT_PRICE_CENTS,
  SHIPPING_PRICE_CENTS,
} from '@/lib/product';
import { formatUSD } from '@/lib/format';
import { CAPTION_PRESETS, type DesignParams, type ProductChoice } from '@/lib/types';
import ShirtMock from './ShirtMock';
import CityPicker from './CityPicker';

export const DRAFT_KEY = 'nightloom-draft-v1';

const DEFAULT_DESIGN: DesignParams = {
  name: '',
  caption: 'the night you were born',
  date: '1994-05-14',
  time: '22:00',
  lat: 48.8566,
  lng: 2.3522,
  placeLabel: 'Paris, FR',
  palette: 'midnight',
  showLines: true,
  showLabels: true,
};

const DEFAULT_PRODUCT: ProductChoice = { color: 'black', size: 'm', qty: 1 };

export default function Studio() {
  const router = useRouter();
  const [design, setDesign] = useState<DesignParams>(DEFAULT_DESIGN);
  const [product, setProduct] = useState<ProductChoice>(DEFAULT_PRODUCT);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [inspect, setInspect] = useState(false);

  useEffect(() => {
    if (!inspect) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setInspect(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [inspect]);

  const deferred = useDeferredValue(design);
  const previewDesign = useMemo<DesignParams>(
    () => ({ ...deferred, name: deferred.name.trim() || 'your name' }),
    [deferred]
  );
  const svg = useMemo(() => {
    try {
      return buildDesignSvg(previewDesign);
    } catch {
      return null;
    }
  }, [previewDesign]);

  const garment = SHIRT_COLORS.find((c) => c.id === product.color) ?? SHIRT_COLORS[0];
  const paletteChoices = garment.palettes;
  const total = product.qty * SHIRT_PRICE_CENTS + SHIPPING_PRICE_CENTS;

  function patchDesign(p: Partial<DesignParams>) {
    setDesign((d) => ({ ...d, ...p }));
  }

  function pickColor(id: string) {
    const color = SHIRT_COLORS.find((c) => c.id === id);
    setProduct((p) => ({ ...p, color: id }));
    if (color && !color.palettes.includes(design.palette)) {
      patchDesign({ palette: color.palettes[0] });
    }
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!design.name.trim()) e.name = 'Every Nightloom needs a name.';
    else if (design.name.trim().length > 24) e.name = 'Up to 24 characters.';
    if (design.caption.length > 48) e.caption = 'Up to 48 characters.';
    if (!design.date) e.date = 'Pick the night.';
    if (!design.time) e.time = 'Pick a time.';
    if (!design.placeLabel) e.place = 'Choose where the sky is from.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function continueToCheckout() {
    if (!validate()) return;
    sessionStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({ design: { ...design, name: design.name.trim() }, product })
    );
    router.push('/checkout');
  }

  return (
    <section id="studio" className="scroll-mt-20">
      <div className="grid lg:grid-cols-[1fr_540px] gap-10 items-start">
        {/* ---------- controls ---------- */}
        <div className="space-y-8">
          {/* the night */}
          <div className="panel p-6 md:p-8 space-y-6">
            <div className="divider-star text-[11px] tracked">01 · your night</div>
            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <label className="nl-label" htmlFor="nl-name">Name on the shirt</label>
                <input
                  id="nl-name"
                  className="nl-input"
                  placeholder="e.g. ADA"
                  maxLength={24}
                  value={design.name}
                  aria-invalid={errors.name ? 'true' : undefined}
                  onChange={(e) => patchDesign({ name: e.target.value })}
                />
                {errors.name && <div className="nl-error">{errors.name}</div>}
              </div>
              <div>
                <label className="nl-label" htmlFor="nl-caption">Caption (optional)</label>
                <input
                  id="nl-caption"
                  className="nl-input"
                  placeholder="the night you were born"
                  maxLength={48}
                  value={design.caption}
                  onChange={(e) => patchDesign({ caption: e.target.value })}
                />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {CAPTION_PRESETS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`chip ${design.caption === c ? 'chip-active' : ''}`}
                      onClick={() => patchDesign({ caption: c })}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="nl-label" htmlFor="nl-date">Date</label>
                <input
                  id="nl-date"
                  type="date"
                  className="nl-input"
                  min="1900-01-01"
                  max={new Date().toISOString().slice(0, 10)}
                  value={design.date}
                  onChange={(e) => patchDesign({ date: e.target.value })}
                />
                {errors.date && <div className="nl-error">{errors.date}</div>}
              </div>
              <div>
                <label className="nl-label" htmlFor="nl-time">Time (local, at the place below)</label>
                <input
                  id="nl-time"
                  type="time"
                  className="nl-input"
                  value={design.time}
                  onChange={(e) => patchDesign({ time: e.target.value })}
                />
                {errors.time && <div className="nl-error">{errors.time}</div>}
              </div>
            </div>
          </div>

          {/* the place */}
          <div className="panel p-6 md:p-8 space-y-4">
            <div className="divider-star text-[11px] tracked">02 · the place</div>
            <CityPicker
              value={{ lat: design.lat, lng: design.lng, placeLabel: design.placeLabel }}
              error={errors.place}
              onChange={(v) => patchDesign(v)}
            />
            <p className="text-[12px] faint leading-relaxed">
              The sky is computed for local time at these coordinates — stars from the HYG
              catalog (~2,000 visible to the eye), positions precessed to your exact date.
            </p>
          </div>

          {/* the look */}
          <div className="panel p-6 md:p-8 space-y-5">
            <div className="divider-star text-[11px] tracked">03 · the look</div>
            <div>
              <div className="nl-label">Sky palette</div>
              <div className="flex flex-wrap gap-3">
                {paletteChoices.map((pid: PaletteId) => {
                  const p = PALETTES[pid];
                  return (
                    <button
                      key={pid}
                      type="button"
                      onClick={() => patchDesign({ palette: pid })}
                      className={`flex items-center gap-2.5 rounded-full border px-3 py-2 text-[12px] transition-all ${
                        design.palette === pid
                          ? 'border-[var(--gold)] text-[var(--gold)]'
                          : 'hairline muted hover:text-[var(--ink)]'
                      }`}
                    >
                      <span
                        className="h-5 w-5 rounded-full border border-white/20"
                        style={{ background: p.swatch }}
                      />
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex flex-wrap gap-x-8 gap-y-3">
              <label className="flex items-center gap-2.5 text-[13px] muted cursor-pointer">
                <input
                  type="checkbox"
                  className="accent-[var(--gold)] h-4 w-4"
                  checked={design.showLines}
                  onChange={(e) => patchDesign({ showLines: e.target.checked })}
                />
                Constellation lines
              </label>
              <label className="flex items-center gap-2.5 text-[13px] muted cursor-pointer">
                <input
                  type="checkbox"
                  className="accent-[var(--gold)] h-4 w-4"
                  checked={design.showLabels}
                  onChange={(e) => patchDesign({ showLabels: e.target.checked })}
                />
                Star &amp; constellation names
              </label>
            </div>
          </div>

          {/* the tee */}
          <div className="panel p-6 md:p-8 space-y-5">
            <div className="divider-star text-[11px] tracked">04 · the tee</div>
            <div>
              <div className="nl-label">Colour — {garment.label}</div>
              <div className="flex flex-wrap gap-2.5">
                {SHIRT_COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    title={c.label}
                    aria-label={c.label}
                    className={`swatch ${product.color === c.id ? 'swatch-active' : ''}`}
                    style={{ background: c.hex }}
                    onClick={() => pickColor(c.id)}
                  />
                ))}
              </div>
            </div>
            <div className="grid md:grid-cols-[1fr_auto] gap-5 items-end">
              <div>
                <div className="nl-label">Size — unisex</div>
                <div className="flex flex-wrap gap-2">
                  {SHIRT_SIZES.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className={`size-btn ${product.size === s.id ? 'size-btn-active' : ''}`}
                      onClick={() => setProduct((p) => ({ ...p, size: s.id }))}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="nl-label">Quantity</div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="size-btn !min-w-9"
                    onClick={() => setProduct((p) => ({ ...p, qty: Math.max(1, p.qty - 1) }))}
                  >
                    −
                  </button>
                  <span className="w-6 text-center">{product.qty}</span>
                  <button
                    type="button"
                    className="size-btn !min-w-9"
                    onClick={() => setProduct((p) => ({ ...p, qty: Math.min(MAX_QTY, p.qty + 1) }))}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ---------- preview ---------- */}
        <div className="lg:sticky lg:top-24">
          <div className="panel p-5 md:p-7">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] tracked muted">live preview</span>
              <span className="badge">1-of-1</span>
            </div>
            <div className="mx-auto max-w-[440px]">
              {svg ? (
                <ShirtMock garmentHex={garment.hex} designSvg={svg} uid="studio" />
              ) : (
                <div className="aspect-square flex items-center justify-center faint">rendering…</div>
              )}
            </div>
            <div className="mt-4 text-center">
              <div className="font-display text-[15px] tracking-[0.2em] uppercase">
                {design.name.trim() || 'your name'}
              </div>
              <div className="text-[11px] faint mt-1 tracked">
                {garment.label} · {SHIRT_SIZES.find((s) => s.id === product.size)?.label} ·{' '}
                {PALETTES[design.palette].label}
              </div>
              <button
                type="button"
                className="mt-3 text-[11px] tracked gold hover:underline"
                onClick={() => setInspect(true)}
              >
                ⊕ inspect the sky up close
              </button>
            </div>
            <div className="mt-5 border-t hairline pt-5 space-y-3">
              <div className="flex justify-between text-[13px] muted">
                <span>
                  Tee × {product.qty} <span className="faint">({formatUSD(SHIRT_PRICE_CENTS)} each)</span>
                </span>
                <span>{formatUSD(product.qty * SHIRT_PRICE_CENTS)}</span>
              </div>
              <div className="flex justify-between text-[13px] muted">
                <span>Standard shipping</span>
                <span>{formatUSD(SHIPPING_PRICE_CENTS)}</span>
              </div>
              <div className="flex justify-between text-[15px] text-[var(--ink)] pt-1">
                <span>Total</span>
                <span className="gold font-normal">{formatUSD(total)}</span>
              </div>
              <button type="button" className="nl-btn nl-btn-primary w-full" onClick={continueToCheckout}>
                Continue to checkout →
              </button>
              <p className="text-[11px] faint text-center leading-relaxed">
                Printed to order after payment · ships in 3–6 business days
              </p>
            </div>
          </div>
        </div>
      </div>

      {inspect && svg && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(2,3,10,0.86)] backdrop-blur-sm p-4"
          onClick={() => setInspect(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Design detail"
        >
          <div
            className="max-h-[92vh] w-auto max-w-[min(92vw,680px)] overflow-auto rounded-2xl border hairline bg-[rgba(4,6,18,0.6)] p-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-2 pb-2">
              <span className="text-[11px] tracked muted">
                exactly what will print · rendered as vector
              </span>
              <button
                type="button"
                className="text-[13px] gold px-2"
                onClick={() => setInspect(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="nl-svg" dangerouslySetInnerHTML={{ __html: svg }} />
          </div>
        </div>
      )}
    </section>
  );
}
