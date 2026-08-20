'use client';

import { useState } from 'react';
import {
  LIST_PRICE_CENTS,
  PRICE_CENTS,
  ShirtSize,
  ShirtStyle,
  SIZES,
  STYLES,
  STYLE_LABELS,
  STYLE_DESCRIPTIONS,
} from '@/lib/products';

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function CheckoutPanel({
  style,
  size,
  onStyleChange,
  onSizeChange,
  onCheckingOut,
}: {
  style: ShirtStyle;
  size: ShirtSize;
  onStyleChange: (style: ShirtStyle) => void;
  onSizeChange: (size: ShirtSize) => void;
  onCheckingOut: (checkingOut: boolean) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBuy = async () => {
    setLoading(true);
    setError(null);
    onCheckingOut(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ style, size, timestampMs: Date.now() }),
      });
      const payload = await res.json();
      if (!res.ok || !payload.url) {
        throw new Error(payload.error || 'Could not start checkout.');
      }
      window.location.href = payload.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setLoading(false);
      onCheckingOut(false);
    }
  };

  return (
    <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 p-6">
      <div className="mb-6 flex items-baseline gap-2">
        <span className="text-white/40 line-through text-lg">{formatPrice(LIST_PRICE_CENTS)}</span>
        <span className="text-3xl font-bold text-white">{formatPrice(PRICE_CENTS)}</span>
      </div>

      <div className="mb-5">
        <div className="mb-2 text-sm font-medium text-white/70">Style</div>
        <div className="flex gap-2">
          {STYLES.map((s) => (
            <button
              key={s}
              type="button"
              disabled={loading}
              onClick={() => onStyleChange(s)}
              title={STYLE_DESCRIPTIONS[s]}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm transition ${
                style === s
                  ? 'border-white bg-white text-black font-semibold'
                  : 'border-white/20 text-white/80 hover:border-white/40'
              }`}
            >
              {STYLE_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <div className="mb-2 text-sm font-medium text-white/70">Size</div>
        <div className="flex gap-2">
          {SIZES.map((s) => (
            <button
              key={s}
              type="button"
              disabled={loading}
              onClick={() => onSizeChange(s)}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm transition ${
                size === s
                  ? 'border-white bg-white text-black font-semibold'
                  : 'border-white/20 text-white/80 hover:border-white/40'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={handleBuy}
        disabled={loading}
        className="w-full rounded-lg bg-white py-3 text-center font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? 'Preparing your shirt…' : 'Buy now'}
      </button>
      <p className="mt-3 text-center text-xs text-white/40">
        Printed with the exact moment you check out. Test mode — no real charge.
      </p>
    </div>
  );
}
