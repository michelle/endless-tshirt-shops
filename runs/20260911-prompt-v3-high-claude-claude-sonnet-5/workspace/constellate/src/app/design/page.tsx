"use client";

import { useMemo, useState } from "react";
import {
  buildConstellationData,
  renderConstellationSVG,
  PALETTES,
  PaletteId,
} from "@/lib/constellation";
import {
  COLORS,
  COLOR_SWATCH,
  MAX_QUANTITY,
  SIZES,
  SIZE_LABELS,
  ShirtColor,
  Size,
  UNIT_PRICE_CENTS,
} from "@/lib/product";

const PALETTE_IDS = Object.keys(PALETTES) as PaletteId[];

export default function DesignPage() {
  const [title, setTitle] = useState("Maya & Jonah");
  const [dateLabel, setDateLabel] = useState("June 14, 2019");
  const [subtitle, setSubtitle] = useState("New York, NY");
  const [palette, setPalette] = useState<PaletteId>("midnight");
  const [color, setColor] = useState<ShirtColor>("black");
  const [size, setSize] = useState<Size>("m");
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const svg = useMemo(() => {
    const input = { title, dateLabel, subtitle, palette };
    const data = buildConstellationData(input);
    return renderConstellationSVG(input, data);
  }, [title, dateLabel, subtitle, palette]);

  const titleError = title.trim().length === 0 ? "Required" : title.length > 40 ? "Max 40 characters" : null;
  const dateError = dateLabel.trim().length === 0 ? "Required" : dateLabel.length > 40 ? "Max 40 characters" : null;
  const subtitleError = subtitle.length > 40 ? "Max 40 characters" : null;
  const formValid = !titleError && !dateError && !subtitleError;

  const price = (UNIT_PRICE_CENTS / 100).toFixed(2);
  const total = ((UNIT_PRICE_CENTS * quantity) / 100).toFixed(2);

  async function handleCheckout() {
    if (!formValid) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, dateLabel, subtitle, palette, color, size, quantity }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong starting checkout.");
        setLoading(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Network error — please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 grid lg:grid-cols-2 gap-10">
      <div>
        <div className="sticky top-6 rounded-2xl overflow-hidden border border-white/10 bg-black/40 max-w-sm mx-auto lg:mx-0 aspect-[4/5]" dangerouslySetInnerHTML={{ __html: svg }} />
        <p className="text-center lg:text-left text-white/40 text-xs mt-3">
          Live preview &mdash; updates instantly as you type.
        </p>
      </div>

      <div className="space-y-8">
        <div>
          <h1 className="font-serif text-2xl mb-1">Design your constellation</h1>
          <p className="text-white/60 text-sm">Your design is generated fresh from these three fields.</p>
        </div>

        <div className="space-y-4">
          <Field label="Names or word" error={titleError}>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={40}
              placeholder="e.g. Maya & Jonah"
              className="w-full rounded-lg bg-white/5 border border-white/15 px-3 py-2 outline-none focus:border-white/50"
            />
          </Field>

          <Field label="Date or milestone" error={dateError}>
            <input
              value={dateLabel}
              onChange={(e) => setDateLabel(e.target.value)}
              maxLength={40}
              placeholder="e.g. June 14, 2019"
              className="w-full rounded-lg bg-white/5 border border-white/15 px-3 py-2 outline-none focus:border-white/50"
            />
          </Field>

          <Field label="Subtitle (optional)" error={subtitleError}>
            <input
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              maxLength={40}
              placeholder="e.g. New York, NY"
              className="w-full rounded-lg bg-white/5 border border-white/15 px-3 py-2 outline-none focus:border-white/50"
            />
          </Field>
        </div>

        <div>
          <div className="text-sm text-white/70 mb-2">Palette</div>
          <div className="flex gap-3">
            {PALETTE_IDS.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setPalette(id)}
                title={PALETTES[id].name}
                className={`h-10 w-10 rounded-full border-2 transition ${
                  palette === id ? "border-white scale-110" : "border-transparent"
                }`}
                style={{ background: `linear-gradient(160deg, ${PALETTES[id].bgTop}, ${PALETTES[id].bgBottom})` }}
              />
            ))}
          </div>
        </div>

        <div>
          <div className="text-sm text-white/70 mb-2">Shirt color</div>
          <div className="flex gap-3">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                title={c}
                className={`h-10 w-10 rounded-full border-2 transition ${
                  color === c ? "border-white scale-110" : "border-white/20"
                }`}
                style={{ background: COLOR_SWATCH[c] }}
              />
            ))}
          </div>
        </div>

        <div>
          <div className="text-sm text-white/70 mb-2">Size</div>
          <div className="flex gap-2">
            {SIZES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSize(s)}
                className={`h-10 w-12 rounded-lg border text-sm transition ${
                  size === s ? "bg-white text-black border-white" : "border-white/20 text-white/80 hover:border-white/50"
                }`}
              >
                {SIZE_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="text-sm text-white/70 mb-2">Quantity</div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="h-9 w-9 rounded-lg border border-white/20 hover:border-white/50"
            >
              −
            </button>
            <span className="w-6 text-center">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.min(MAX_QUANTITY, q + 1))}
              className="h-9 w-9 rounded-lg border border-white/20 hover:border-white/50"
            >
              +
            </button>
          </div>
        </div>

        <div className="border-t border-white/10 pt-6">
          <div className="flex items-baseline justify-between mb-4 text-sm text-white/70">
            <span>
              ${price} × {quantity}
            </span>
            <span className="text-lg text-white font-medium">${total}</span>
          </div>
          {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
          <button
            type="button"
            onClick={handleCheckout}
            disabled={!formValid || loading}
            className="w-full rounded-full bg-white text-black px-6 py-3 font-medium hover:bg-white/85 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? "Redirecting to payment…" : "Continue to payment"}
          </button>
          <p className="text-white/40 text-xs mt-3">
            Ships within the US. Your shirt is printed to order after payment is confirmed &mdash; made-to-order
            items are final sale.
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error: string | null; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="flex items-center justify-between text-sm text-white/70 mb-1">
        <span>{label}</span>
        {error && <span className="text-red-400 text-xs">{error}</span>}
      </div>
      {children}
    </label>
  );
}
