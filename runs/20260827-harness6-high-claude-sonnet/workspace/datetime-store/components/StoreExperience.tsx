"use client";

import { useState } from "react";
import ShirtPreview from "./ShirtPreview";
import {
  PRICE_CENTS,
  SHIRT_SIZES,
  SHIRT_STYLES,
  ShirtSize,
  ShirtStyle,
} from "@/lib/shirt";

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function StoreExperience() {
  const [style, setStyle] = useState<ShirtStyle>("unisex");
  const [size, setSize] = useState<ShirtSize>("M");
  const [frozenMs, setFrozenMs] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleBuy() {
    const timestampMs = Date.now();
    setFrozenMs(timestampMs); // freeze the shirt the instant they click buy
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ style, size, timestampMs }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Something went wrong. Try again.");
      }
      window.location.href = data.url;
    } catch (err) {
      setFrozenMs(null);
      setLoading(false);
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  return (
    <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
      <div className="bg-[#f0efe9] rounded-3xl p-8 md:p-12">
        <ShirtPreview style={style} frozenMs={frozenMs} />
      </div>

      <div className="flex flex-col gap-8">
        <div>
          <p className="font-mono text-xs tracking-[0.25em] uppercase text-black/40 mb-2">
            Style
          </p>
          <div className="flex gap-2">
            {SHIRT_STYLES.map((s) => (
              <button
                key={s.value}
                type="button"
                disabled={loading}
                onClick={() => setStyle(s.value)}
                className={`px-4 py-2 rounded-full border text-sm font-medium transition-colors ${
                  style === s.value
                    ? "bg-black text-white border-black"
                    : "border-black/15 text-black/70 hover:border-black/40"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="font-mono text-xs tracking-[0.25em] uppercase text-black/40 mb-2">
            Size
          </p>
          <div className="flex gap-2">
            {SHIRT_SIZES.map((s) => (
              <button
                key={s}
                type="button"
                disabled={loading}
                onClick={() => setSize(s)}
                className={`w-11 h-11 rounded-full border text-sm font-medium transition-colors ${
                  size === s
                    ? "bg-black text-white border-black"
                    : "border-black/15 text-black/70 hover:border-black/40"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-black/10 pt-6">
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-2xl font-bold">{money(PRICE_CENTS)}</span>
            <span className="text-sm text-emerald-700 font-medium">
              📦 Free US shipping
            </span>
          </div>
          <p className="text-sm text-black/50 mb-5">
            Printed to order the instant you buy it. One-of-one, forever —
            nobody else will ever get this exact millisecond.
          </p>

          <button
            type="button"
            onClick={handleBuy}
            disabled={loading}
            className="w-full rounded-full bg-black text-white font-semibold py-4 text-base hover:bg-black/85 transition-colors disabled:opacity-60"
          >
            {loading ? "Capturing this moment…" : "Buy this exact moment"}
          </button>

          {error && (
            <p className="mt-3 text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          <p className="mt-4 text-xs text-black/40">
            Test mode — use card{" "}
            <span className="font-mono">4242 4242 4242 4242</span>, any
            future date, any CVC.
          </p>
        </div>
      </div>
    </div>
  );
}
