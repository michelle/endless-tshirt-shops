"use client";

import { useRef, useState } from "react";
import ShirtCanvas, { ShirtCanvasHandle } from "@/components/ShirtCanvas";
import CheckoutPanel from "@/components/CheckoutPanel";
import {
  ORIGINAL_PRICE_CENTS,
  PRICE_CENTS,
  SHIRT_STYLE_LABELS,
  ShirtSize,
  ShirtStyle,
} from "@/lib/constants";

const STYLES: ShirtStyle[] = ["fitted", "unisex"];
const SIZES: ShirtSize[] = ["S", "M", "L", "XL"];

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function ShopClient() {
  const [style, setStyle] = useState<ShirtStyle>("fitted");
  const [size, setSize] = useState<ShirtSize>("M");
  const [frozen, setFrozen] = useState(false);
  const shirtRef = useRef<ShirtCanvasHandle>(null);

  return (
    <div className="grid gap-10 md:grid-cols-2 md:gap-12">
      <div className="flex flex-col items-center gap-6">
        <ShirtCanvas ref={shirtRef} style={style} frozen={frozen} />
        <div className="flex items-baseline gap-2">
          <span className="text-lg text-neutral-400 line-through">
            {formatPrice(ORIGINAL_PRICE_CENTS)}
          </span>
          <span className="text-2xl font-semibold">{formatPrice(PRICE_CENTS)}</span>
        </div>
        <p className="max-w-xs text-center text-sm text-neutral-500">
          That number is the current time, in milliseconds since the Unix
          epoch. It never stops moving &mdash; until you buy, and we print the
          exact millisecond you did.
        </p>
      </div>

      <div className="flex flex-col gap-6">
        <div>
          <p className="mb-2 text-xs font-medium tracking-wide text-neutral-500 uppercase">
            Fit
          </p>
          <div className="grid grid-cols-2 gap-2">
            {STYLES.map((s) => (
              <button
                key={s}
                type="button"
                disabled={frozen}
                onClick={() => setStyle(s)}
                className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
                  style === s
                    ? "border-neutral-900 bg-neutral-900 text-white"
                    : "border-neutral-300 bg-white text-neutral-700 hover:border-neutral-400"
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                {SHIRT_STYLE_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium tracking-wide text-neutral-500 uppercase">
            Size
          </p>
          <div className="grid grid-cols-4 gap-2">
            {SIZES.map((s) => (
              <button
                key={s}
                type="button"
                disabled={frozen}
                onClick={() => setSize(s)}
                className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                  size === s
                    ? "border-neutral-900 bg-neutral-900 text-white"
                    : "border-neutral-300 bg-white text-neutral-700 hover:border-neutral-400"
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <hr className="border-neutral-200" />

        <CheckoutPanel
          style={style}
          size={size}
          frozen={frozen}
          onFreeze={() => setFrozen(true)}
          onUnfreeze={() => setFrozen(false)}
          captureArtwork={() => shirtRef.current!.captureArtwork()}
        />
      </div>
    </div>
  );
}
