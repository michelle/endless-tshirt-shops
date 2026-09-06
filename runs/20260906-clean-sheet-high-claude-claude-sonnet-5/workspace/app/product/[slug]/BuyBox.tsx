"use client";

import { useState } from "react";
import { SIZES } from "@/lib/shirts";

export default function BuyBox({ slug }: { slug: string }) {
  const [size, setSize] = useState<string>("M");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleBuy() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, size }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Checkout failed");
      }
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-xs text-neutral-500 mb-2 tracking-widest">SIZE</p>
        <div className="flex gap-2">
          {SIZES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSize(s)}
              className={`font-mono text-sm px-3 py-2 rounded-lg border transition-colors ${
                size === s
                  ? "border-emerald-400 bg-emerald-400/10 text-emerald-300"
                  : "border-white/15 text-neutral-300 hover:border-white/30"
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
        className="w-full font-mono font-semibold rounded-xl bg-emerald-400 text-black py-3.5 hover:bg-emerald-300 transition-colors disabled:opacity-60"
      >
        {loading ? "Redirecting to checkout…" : "Buy now"}
      </button>

      {error && <p className="text-sm text-red-400 font-mono">{error}</p>}

      <p className="text-xs text-neutral-600 font-mono">
        Checkout is powered by Stripe (test mode) — use card{" "}
        <span className="text-neutral-400">4242 4242 4242 4242</span>, any future date, any
        CVC.
      </p>
    </div>
  );
}
