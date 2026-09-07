"use client";

import { useState } from "react";
import ShirtPreview from "./ShirtPreview";
import CheckoutPanel from "./CheckoutPanel";
import {
  COMPARE_AT_USD_CENTS,
  PRICE_USD_CENTS,
  SIZES,
  STYLES,
  type ShirtSize,
  type ShirtStyle,
} from "@/lib/products";

const usd = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export default function Store() {
  const [style, setStyle] = useState<ShirtStyle>("fitted");
  const [size, setSize] = useState<ShirtSize>("M");
  const [checkout, setCheckout] = useState<{
    clientSecret: string;
    paymentIntentId: string;
    timestamp: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBuy = async () => {
    setLoading(true);
    setError(null);
    const timestamp = Date.now();
    try {
      const res = await fetch("/api/checkout/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ style, size, timestamp }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Couldn't start checkout.");
      }
      const { clientSecret, paymentIntentId } = await res.json();
      setCheckout({ clientSecret, paymentIntentId, timestamp });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid w-full max-w-5xl grid-cols-1 gap-10 md:grid-cols-2 md:gap-8">
      <ShirtPreview
        style={style}
        frozenAt={checkout ? checkout.timestamp : null}
      />

      <div className="flex flex-col justify-center gap-6">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">
              {usd(PRICE_USD_CENTS)}
            </span>
            <span className="text-base text-zinc-500 line-through">
              {usd(COMPARE_AT_USD_CENTS)}
            </span>
          </div>
          <p className="mt-1 text-sm text-zinc-500">
            Free shipping. Printed on demand, one at a time.
          </p>
        </div>

        {checkout ? (
          <CheckoutPanel
            clientSecret={checkout.clientSecret}
            paymentIntentId={checkout.paymentIntentId}
            style={style}
            size={size}
            onCancel={() => setCheckout(null)}
          />
        ) : (
          <>
            <fieldset>
              <legend className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                Fit
              </legend>
              <div className="grid grid-cols-2 gap-2">
                {STYLES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setStyle(s.id)}
                    className={`rounded-xl border px-4 py-3 text-left transition ${
                      style === s.id
                        ? "border-emerald-400 bg-emerald-400/10 text-white"
                        : "border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700"
                    }`}
                  >
                    <div className="font-semibold">{s.label}</div>
                    <div className="text-xs text-zinc-500">{s.description}</div>
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                Size
              </legend>
              <div className="grid grid-cols-4 gap-2">
                {SIZES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSize(s)}
                    className={`rounded-xl border py-3 font-mono transition ${
                      size === s
                        ? "border-emerald-400 bg-emerald-400/10 text-white"
                        : "border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </fieldset>

            {error ? (
              <p className="rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-300">
                {error}
              </p>
            ) : null}

            <button
              type="button"
              onClick={handleBuy}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-400 px-6 py-3.5 font-semibold text-zinc-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "One sec…" : `Buy now — ${usd(PRICE_USD_CENTS)}`}
            </button>
            <p className="text-center text-xs text-zinc-600">
              Whatever millisecond you click, that&rsquo;s what gets printed.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
