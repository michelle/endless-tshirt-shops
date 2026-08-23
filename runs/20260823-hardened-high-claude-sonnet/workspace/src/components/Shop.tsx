"use client";

import { useState } from "react";
import ShirtPreview from "./ShirtPreview";
import CheckoutFlow from "./CheckoutFlow";
import {
  COMPARE_AT_CENTS,
  PRICE_CENTS,
  SIZES,
  STYLES,
  formatUsd,
  type ShirtSize,
  type ShirtStyle,
} from "@/lib/product";

export default function Shop() {
  const [style, setStyle] = useState<ShirtStyle>("unisex");
  const [size, setSize] = useState<ShirtSize>("M");
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  if (checkoutOpen) {
    return (
      <CheckoutFlow style={style} size={size} onClose={() => setCheckoutOpen(false)} />
    );
  }

  return (
    <div className="w-full max-w-xl flex flex-col items-center gap-8">
      <ShirtPreview style={style} />

      <div className="w-full flex flex-col gap-6">
        <div>
          <p className="text-xs tracking-[0.2em] text-zinc-500 mb-2">STYLE</p>
          <div className="flex gap-2">
            {(Object.keys(STYLES) as ShirtStyle[]).map((key) => (
              <button
                key={key}
                onClick={() => setStyle(key)}
                className={`flex-1 rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
                  style === key
                    ? "border-teal-400 bg-teal-400/10 text-teal-300"
                    : "border-white/10 text-zinc-400 hover:border-white/25"
                }`}
              >
                {STYLES[key].label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs tracking-[0.2em] text-zinc-500 mb-2">SIZE</p>
          <div className="flex gap-2">
            {SIZES.map((s) => (
              <button
                key={s}
                onClick={() => setSize(s)}
                className={`flex-1 rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
                  size === s
                    ? "border-teal-400 bg-teal-400/10 text-teal-300"
                    : "border-white/10 text-zinc-400 hover:border-white/25"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-baseline justify-between pt-2">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black">{formatUsd(PRICE_CENTS)}</span>
            <span className="text-sm text-zinc-500 line-through">
              {formatUsd(COMPARE_AT_CENTS)}
            </span>
          </div>
          <span className="text-xs text-zinc-500">Ships in 3–5 business days</span>
        </div>

        <button
          onClick={() => setCheckoutOpen(true)}
          className="w-full rounded-xl bg-teal-400 px-6 py-4 text-sm font-bold uppercase tracking-wide text-black transition-transform hover:scale-[1.01] active:scale-[0.99]"
        >
          Buy this exact moment
        </button>
        <p className="text-center text-xs text-zinc-500">
          The moment freezes the instant you complete checkout. Nobody else
          will ever own it.
        </p>
      </div>
    </div>
  );
}
