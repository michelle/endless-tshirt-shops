"use client";

import { useEffect, useRef, useState } from "react";
import ShirtPreview from "./ShirtPreview";
import {
  COMPARE_AT_CENTS,
  PRICE_CENTS,
  SIZES,
  STYLES,
  formatUsd,
  type SizeId,
  type StyleId,
} from "@/lib/products";

const STYLE_IDS = Object.keys(STYLES) as StyleId[];
const SIZE_IDS = Object.keys(SIZES) as SizeId[];

export default function Store() {
  const [style, setStyle] = useState<StyleId>("unisex");
  const [size, setSize] = useState<SizeId>("M");
  // Start at a fixed value so server-rendered HTML and the client's first
  // render match exactly; the real, ticking timestamp takes over in the
  // effect below, after hydration.
  const [now, setNow] = useState<number>(0);
  const [frozen, setFrozen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const tick = () => {
      setNow(Date.now());
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  async function handleBuy() {
    const ts = Date.now();
    setFrozen(true);
    setNow(ts);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ style, size, ts }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Something went wrong starting checkout.");
      }
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setFrozen(false);
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-12 md:grid-cols-2 md:gap-16">
      <ShirtPreview style={style} timestampMs={now} frozen={frozen} />

      <div className="flex flex-col justify-center">
        <div className="mb-6 flex items-baseline gap-3">
          <span className="text-3xl font-bold text-white">
            {formatUsd(PRICE_CENTS)}
          </span>
          <span className="text-lg text-white/40 line-through">
            {formatUsd(COMPARE_AT_CENTS)}
          </span>
        </div>

        <fieldset className="mb-6" disabled={frozen}>
          <legend className="mb-2 text-xs font-medium uppercase tracking-widest text-white/50">
            Style
          </legend>
          <div className="flex gap-2">
            {STYLE_IDS.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setStyle(id)}
                aria-pressed={style === id}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                  style === id
                    ? "border-white bg-white text-black"
                    : "border-white/20 text-white/70 hover:border-white/40 hover:text-white"
                }`}
              >
                {STYLES[id].label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-white/40">{STYLES[style].description}</p>
        </fieldset>

        <fieldset className="mb-8" disabled={frozen}>
          <legend className="mb-2 text-xs font-medium uppercase tracking-widest text-white/50">
            Size
          </legend>
          <div className="flex gap-2">
            {SIZE_IDS.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setSize(id)}
                aria-pressed={size === id}
                className={`h-10 w-12 rounded-lg border text-sm font-medium transition-colors ${
                  size === id
                    ? "border-white bg-white text-black"
                    : "border-white/20 text-white/70 hover:border-white/40 hover:text-white"
                }`}
              >
                {SIZES[id].label}
              </button>
            ))}
          </div>
        </fieldset>

        <button
          type="button"
          onClick={handleBuy}
          disabled={loading}
          className="flex h-14 w-full items-center justify-center rounded-xl bg-white text-base font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Preparing checkout…" : `Buy now — ${formatUsd(PRICE_CENTS)}`}
        </button>

        {error && (
          <p className="mt-3 text-sm text-red-400" role="alert">
            {error}
          </p>
        )}

        <p className="mt-4 text-center text-xs text-white/40">
          Secure checkout by Stripe · Printed &amp; shipped by Prodigi
        </p>
      </div>
    </div>
  );
}
