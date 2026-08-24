"use client";

import { useState } from "react";
import { ShirtPreview } from "@/components/ShirtPreview";
import {
  COLOR_LABELS,
  COMPARE_AT_USD_CENTS,
  PRICE_USD_CENTS,
  SIZES,
  STYLE_LABELS,
  type ShirtColor,
  type ShirtSize,
  type ShirtStyle,
} from "@/lib/product";

const STYLES: ShirtStyle[] = ["fitted", "unisex"];
const COLORS: ShirtColor[] = ["black", "white"];

function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function ProductConfigurator() {
  const [style, setStyle] = useState<ShirtStyle>("fitted");
  const [size, setSize] = useState<ShirtSize>("M");
  const [color, setColor] = useState<ShirtColor>("black");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBuy = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ style, size, color }),
      });
      const payload = await res.json();
      if (!res.ok || !payload.url) {
        throw new Error(payload.error ?? "Something went wrong starting checkout.");
      }
      window.location.href = payload.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-10 sm:grid-cols-2 items-start">
      <div className="flex items-center justify-center rounded-3xl bg-gradient-to-b from-neutral-900 to-neutral-950 border border-neutral-800 p-8 sm:p-10">
        <ShirtPreview style={style} color={color} disabled={loading} />
      </div>

      <div className="flex flex-col gap-6">
        <div>
          <h2 className="font-mono text-sm tracking-widest text-orange-400 mb-1">
            THE DATETIME TEE
          </h2>
          <p className="text-neutral-400 text-sm leading-relaxed">
            Every shirt is printed the moment you order — the exact date, time, and
            millisecond, right on the chest. No two shirts are ever the same.
          </p>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="font-mono text-xs tracking-widest text-neutral-500 mb-1">
            STYLE
          </legend>
          <div className="flex gap-2">
            {STYLES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStyle(s)}
                className={`px-4 py-2 rounded-full text-sm font-medium border transition ${
                  style === s
                    ? "bg-orange-500 text-neutral-950 border-orange-500"
                    : "border-neutral-700 text-neutral-300 hover:border-neutral-500"
                }`}
              >
                {STYLE_LABELS[s]}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="font-mono text-xs tracking-widest text-neutral-500 mb-1">
            SIZE
          </legend>
          <div className="flex gap-2">
            {SIZES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSize(s)}
                className={`w-12 h-10 rounded-lg text-sm font-medium border transition font-mono ${
                  size === s
                    ? "bg-orange-500 text-neutral-950 border-orange-500"
                    : "border-neutral-700 text-neutral-300 hover:border-neutral-500"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="font-mono text-xs tracking-widest text-neutral-500 mb-1">
            COLOR
          </legend>
          <div className="flex gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition ${
                  color === c
                    ? "bg-orange-500 text-neutral-950 border-orange-500"
                    : "border-neutral-700 text-neutral-300 hover:border-neutral-500"
                }`}
              >
                <span
                  className="w-3 h-3 rounded-full border border-neutral-500"
                  style={{ background: c === "white" ? "#f5f4f0" : "#171716" }}
                />
                {COLOR_LABELS[c]}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="flex items-baseline gap-2 mt-2">
          <span className="text-3xl font-bold font-mono">
            {formatMoney(PRICE_USD_CENTS)}
          </span>
          <span className="text-lg text-neutral-500 line-through font-mono">
            {formatMoney(COMPARE_AT_USD_CENTS)}
          </span>
        </div>

        <button
          type="button"
          onClick={handleBuy}
          disabled={loading}
          className="w-full rounded-full bg-orange-500 hover:bg-orange-400 disabled:opacity-60 disabled:cursor-not-allowed text-neutral-950 font-semibold py-3.5 transition font-mono tracking-wide"
        >
          {loading ? "PREPARING CHECKOUT…" : "BUY NOW — SHIPS WORLDWIDE"}
        </button>

        {error ? (
          <p className="text-sm text-red-400 font-mono">{error}</p>
        ) : (
          <p className="text-xs text-neutral-500">
            Secure checkout powered by Stripe. Test mode — use card 4242 4242 4242 4242.
          </p>
        )}
      </div>
    </div>
  );
}
