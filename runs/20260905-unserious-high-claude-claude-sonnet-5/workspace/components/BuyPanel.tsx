"use client";

import { useState } from "react";
import {
  COLORS,
  LIST_PRICE_USD,
  PRICE_USD,
  SIZES,
  type ColorId,
  type Size,
} from "@/lib/product";

interface BuyPanelProps {
  color: ColorId;
  onColorChange: (c: ColorId) => void;
}

export default function BuyPanel({ color, onColorChange }: BuyPanelProps) {
  const [size, setSize] = useState<Size>("m");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleBuy() {
    setLoading(true);
    setError(null);
    // Freeze the moment client-side, right as the button is pressed — this
    // exact number is what ends up on the shirt.
    const stampMs = Date.now();
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ color, size, stampMs }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Something broke in spacetime.");
      }
      window.location.href = data.url;
    } catch (e: any) {
      setError(e.message || "Checkout failed. The moment got away.");
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">
          Color
        </p>
        <div className="flex gap-3">
          {COLORS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onColorChange(c.id)}
              aria-label={c.label}
              aria-pressed={color === c.id}
              className={`h-9 w-9 rounded-full border-2 transition ${
                color === c.id
                  ? "border-stamp scale-110"
                  : "border-transparent"
              }`}
              style={{ backgroundColor: c.hex, boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.15)" }}
            />
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">
          Size
        </p>
        <div className="flex flex-wrap gap-2">
          {SIZES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSize(s)}
              aria-pressed={size === s}
              className={`rounded-md border px-3 py-1.5 text-sm font-medium uppercase transition ${
                size === s
                  ? "border-ink bg-ink text-paper"
                  : "border-ink/20 text-ink/70 hover:border-ink/50"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-baseline gap-3">
        <span className="text-lg text-ink/40 line-through">
          ${LIST_PRICE_USD.toFixed(2)}
        </span>
        <span className="text-3xl font-bold text-ink">
          ${PRICE_USD.toFixed(2)}
        </span>
        <span className="text-xs text-ink/50">
          (time-based discount, expires constantly)
        </span>
      </div>

      <button
        type="button"
        onClick={handleBuy}
        disabled={loading}
        className="group relative w-full overflow-hidden rounded-lg bg-stamp px-6 py-4 text-base font-bold uppercase tracking-wide text-paper transition hover:brightness-110 disabled:opacity-60"
      >
        {loading ? "Freezing this instant…" : "Freeze this exact millisecond"}
      </button>

      {error ? (
        <p className="text-sm font-medium text-red-600">{error}</p>
      ) : (
        <p className="text-xs text-ink/50">
          Free shipping. No returns — you cannot return a moment.
          Fulfilled by Prodigi, paid through Stripe. Apple Pay / Google Pay
          available at checkout.
        </p>
      )}
    </div>
  );
}
