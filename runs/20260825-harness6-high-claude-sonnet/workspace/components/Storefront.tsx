"use client";

import { useState } from "react";
import ShirtPreview from "@/components/ShirtPreview";
import { formatNow } from "@/lib/time";
import {
  COMPARE_AT_USD_CENTS,
  PRICE_USD_CENTS,
  SHIRT_STYLES,
  SIZES,
  type ShirtSize,
  type ShirtStyle,
} from "@/lib/products";

const usd = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export default function Storefront() {
  const [style, setStyle] = useState<ShirtStyle>("fitted");
  const [size, setSize] = useState<ShirtSize>("M");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleBuy = async () => {
    setStatus("loading");
    setErrorMsg(null);
    try {
      const frozen = formatNow(new Date());
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ style, size, ...frozen }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Something went wrong");
      }
      window.location.href = data.url;
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Checkout failed");
    }
  };

  return (
    <div className="grid gap-14 sm:grid-cols-2 sm:items-center">
      <ShirtPreview style={style} />

      <div className="flex flex-col gap-8">
        <div>
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-3xl font-bold line-through opacity-40">
              {usd(COMPARE_AT_USD_CENTS)}
            </span>
            <span className="font-mono text-4xl font-bold">
              {usd(PRICE_USD_CENTS)}
            </span>
          </div>
          <p className="mt-2 text-sm text-neutral-400">
            One shirt. One moment. Printed and shipped worldwide.
          </p>
        </div>

        <Field label="Style">
          <div className="flex gap-2">
            {(Object.keys(SHIRT_STYLES) as ShirtStyle[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setStyle(key)}
                className={`rounded-full border px-4 py-2 font-mono text-sm transition ${
                  style === key
                    ? "border-white bg-white text-black"
                    : "border-white/20 text-white hover:border-white/50"
                }`}
              >
                {SHIRT_STYLES[key].label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-neutral-500">
            {SHIRT_STYLES[style].description}
          </p>
        </Field>

        <Field label="Size">
          <div className="flex gap-2">
            {SIZES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSize(s)}
                className={`h-10 w-10 rounded-full border font-mono text-sm transition ${
                  size === s
                    ? "border-white bg-white text-black"
                    : "border-white/20 text-white hover:border-white/50"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </Field>

        <button
          type="button"
          onClick={handleBuy}
          disabled={status === "loading"}
          className="mt-2 rounded-full bg-white px-8 py-4 font-mono text-base font-semibold text-black transition hover:bg-neutral-200 disabled:opacity-60"
        >
          {status === "loading" ? "Freezing the moment…" : "Buy now →"}
        </button>
        {errorMsg ? (
          <p className="-mt-4 text-sm text-red-400">{errorMsg}</p>
        ) : null}

        <p className="text-xs text-neutral-500">
          Secure checkout via Stripe · Free worldwide shipping · Printed
          on‑demand and fulfilled by Prodigi
        </p>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 font-mono text-xs uppercase tracking-widest text-neutral-500">
        {label}
      </div>
      {children}
    </div>
  );
}
