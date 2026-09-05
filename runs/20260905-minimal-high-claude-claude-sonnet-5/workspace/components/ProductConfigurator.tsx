"use client";

import { useState } from "react";
import ShirtPreview from "./ShirtPreview";
import { ShirtSize, ShirtStyle, STYLES } from "@/lib/shirt";

const SIZE_OPTIONS: ShirtSize[] = ["S", "M", "L", "XL"];
const STYLE_OPTIONS: ShirtStyle[] = ["unisex", "fitted"];

export default function ProductConfigurator() {
  const [style, setStyle] = useState<ShirtStyle>("unisex");
  const [size, setSize] = useState<ShirtSize>("M");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleBuy() {
    setLoading(true);
    setError(null);
    const ts = Date.now();
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ style, size, ts }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? "Something went wrong");
      }
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-10 sm:grid-cols-2 items-center">
      <ShirtPreview style={style} />

      <div className="flex flex-col gap-6">
        <div>
          <div className="text-sm uppercase tracking-widest text-neutral-500 mb-2">
            Fit
          </div>
          <div className="flex gap-2">
            {STYLE_OPTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStyle(s)}
                className={`rounded-full border px-4 py-2 text-sm transition ${
                  style === s
                    ? "border-white bg-white text-black"
                    : "border-neutral-700 text-neutral-300 hover:border-neutral-500"
                }`}
              >
                {STYLES[s].label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-neutral-500">{STYLES[style].description}</p>
        </div>

        <div>
          <div className="text-sm uppercase tracking-widest text-neutral-500 mb-2">
            Size
          </div>
          <div className="flex gap-2">
            {SIZE_OPTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSize(s)}
                className={`h-10 w-10 rounded-full border text-sm transition ${
                  size === s
                    ? "border-white bg-white text-black"
                    : "border-neutral-700 text-neutral-300 hover:border-neutral-500"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-baseline gap-3">
          <span className="text-3xl font-display font-bold">$22.50</span>
          <span className="text-lg text-neutral-500 line-through">$30.00</span>
        </div>

        <button
          type="button"
          onClick={handleBuy}
          disabled={loading}
          className="rounded-full bg-white px-6 py-4 text-center text-base font-semibold text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Freezing this moment…" : "Buy this exact moment"}
        </button>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <p className="text-xs text-neutral-500">
          Secure checkout by Stripe. The millisecond printed on your shirt is
          captured the instant you click, not when it ships. Printed and
          shipped by Prodigi.
        </p>
      </div>
    </div>
  );
}
