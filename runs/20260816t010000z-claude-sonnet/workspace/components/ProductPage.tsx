"use client";

import { useState } from "react";
import ShirtPreview from "./ShirtPreview";
import {
  LIST_PRICE_CENTS,
  PRICE_CENTS,
  SIZES,
  STYLES,
  STYLE_LABELS,
  type ShirtSize,
  type ShirtStyle,
} from "@/lib/products";

export default function ProductPage() {
  const [style, setStyle] = useState<ShirtStyle>("fitted");
  const [size, setSize] = useState<ShirtSize>("M");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBuy = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ style, size, timestamp: Date.now() }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Could not start checkout.");
      }
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl">
      <header className="mb-10 border-b border-neutral-200 pb-6">
        <h1 className="font-display text-3xl font-medium tracking-tight">datetime.store</h1>
        <p className="mt-2 text-[#337ab7] text-lg">
          we sell a t-shirt with the current datetime. ⏱
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <div>
          <ShirtPreview style={style} />
          <div className="mt-6 text-center">
            <span className="line-through text-neutral-400 mr-2">
              ${(LIST_PRICE_CENTS / 100).toFixed(2)}
            </span>
            <span className="text-xl font-semibold text-[#337ab7]">
              ${(PRICE_CENTS / 100).toFixed(2)}
            </span>
          </div>
        </div>

        <div>
          <fieldset className="mb-6">
            <legend className="text-sm text-neutral-500 mb-2">Style</legend>
            <div className="grid grid-cols-2 gap-0 overflow-hidden rounded">
              {STYLES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStyle(s)}
                  className={`py-2 text-sm transition-colors ${
                    style === s ? "bg-black text-white" : "bg-[#a4d5ff] text-black hover:opacity-80"
                  }`}
                >
                  {STYLE_LABELS[s]}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="mb-8">
            <legend className="text-sm text-neutral-500 mb-2">Size</legend>
            <div className="grid grid-cols-4 gap-0 overflow-hidden rounded">
              {SIZES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSize(s)}
                  className={`py-2 text-sm transition-colors ${
                    size === s ? "bg-black text-white" : "bg-[#a4d5ff] text-black hover:opacity-80"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </fieldset>

          <p className="text-sm text-neutral-600 mb-4">
            Every shirt is printed on demand with the exact millisecond you hit buy. No two are
            ever the same. Shipping and payment are handled by Stripe Checkout; printing and
            fulfillment run through Scalable Press.
          </p>

          {error && (
            <p className="mb-4 text-sm text-red-600 border border-red-200 bg-red-50 rounded px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={handleBuy}
            disabled={loading}
            className="w-full h-12 bg-black text-white text-lg disabled:opacity-50 hover:opacity-90 transition-opacity"
          >
            {loading ? "Redirecting to checkout…" : "Buy now"}
          </button>

          <p className="mt-3 text-xs text-neutral-400">
            Test mode — use card 4242 4242 4242 4242, any future expiry, any CVC.
          </p>
        </div>
      </div>
    </div>
  );
}
