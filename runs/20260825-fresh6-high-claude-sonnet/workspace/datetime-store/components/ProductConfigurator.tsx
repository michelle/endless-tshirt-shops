"use client";

import { useState } from "react";
import {
  PRICE_USD_CENTS,
  COMPARE_AT_USD_CENTS,
  STYLES,
  type StyleKey,
} from "@/lib/products";

function formatUsd(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

interface ProductConfiguratorProps {
  style: StyleKey;
  size: string;
  onStyleChange: (style: StyleKey) => void;
  onSizeChange: (size: string) => void;
}

export default function ProductConfigurator({
  style,
  size,
  onStyleChange,
  onSizeChange,
}: ProductConfiguratorProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleBuy() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ style, size }),
      });
      const data = await res.json();
      if (!res.ok || !data?.url) {
        throw new Error(data?.error ?? "Something went wrong. Please try again.");
      }
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm mx-auto flex flex-col gap-6">
      <div className="flex items-baseline gap-3">
        <span className="text-3xl font-black">{formatUsd(PRICE_USD_CENTS)}</span>
        <span className="text-lg text-white/40 line-through">
          {formatUsd(COMPARE_AT_USD_CENTS)}
        </span>
      </div>

      <div>
        <div className="text-xs uppercase tracking-[0.2em] text-white/50 mb-2">
          Fit
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(STYLES) as StyleKey[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => onStyleChange(key)}
              className={`border px-4 py-3 text-left transition ${
                style === key
                  ? "border-white bg-white text-black"
                  : "border-white/20 text-white hover:border-white/50"
              }`}
            >
              <div className="font-bold text-sm">{STYLES[key].label}</div>
              <div
                className={`text-[11px] mt-0.5 ${
                  style === key ? "text-black/60" : "text-white/40"
                }`}
              >
                {STYLES[key].description}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="text-xs uppercase tracking-[0.2em] text-white/50 mb-2">
          Size
        </div>
        <div className="flex flex-wrap gap-2">
          {STYLES[style].sizes.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onSizeChange(s)}
              className={`min-w-11 border px-3 py-2 text-xs font-bold uppercase transition ${
                size === s
                  ? "border-white bg-white text-black"
                  : "border-white/20 text-white hover:border-white/50"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={handleBuy}
        disabled={loading}
        className="w-full bg-white text-black font-black text-sm uppercase tracking-[0.15em] py-4 transition hover:bg-white/85 disabled:opacity-50"
      >
        {loading ? "Redirecting to checkout…" : "Buy now"}
      </button>

      {error && <p className="text-red-400 text-sm text-center">{error}</p>}

      <p className="text-center text-[11px] text-white/40">
        Printed and shipped by Prodigi. Checkout secured by Stripe.
      </p>
    </div>
  );
}
