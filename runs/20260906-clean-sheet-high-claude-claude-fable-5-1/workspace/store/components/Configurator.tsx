"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TeePreview } from "./TeePreview";
import {
  DESIGN_STYLES, SHIRT_COLORS, SIZES, SHIPPING_CENTS, formatMoney, priceCents,
  type DesignStyle, type Size, type StatusCode,
} from "@/lib/catalog";

export function Configurator({
  status,
  initial,
}: {
  status: StatusCode;
  initial: { style: DesignStyle; color: string; size: Size };
}) {
  const router = useRouter();
  const [style, setStyle] = useState<DesignStyle>(initial.style);
  const [color, setColor] = useState(initial.color);
  const [size, setSize] = useState<Size>(initial.size);
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unit = priceCents(size);

  async function buy() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: status.code, style, color, size, quantity }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error ?? "checkout failed");
      router.push(data.url);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr]">
      <div className="rounded-2xl bg-white/[0.07] border border-white/10 p-4 sm:p-8">
        <TeePreview status={status} style={style} colorId={color} className="w-full h-auto" />
      </div>

      <div className="flex flex-col gap-7">
        <fieldset>
          <legend className="font-mono text-xs uppercase tracking-widest text-muted mb-3">Design</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {DESIGN_STYLES.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setStyle(d.id)}
                aria-pressed={style === d.id}
                className={`text-left rounded-lg border px-3 py-2.5 transition ${
                  style === d.id ? "border-accent bg-accent/10" : "border-white/15 hover:border-white/40"
                }`}
              >
                <div className="font-mono font-extrabold text-sm">{d.label}</div>
                <div className="text-xs text-muted mt-0.5">{d.description}</div>
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="font-mono text-xs uppercase tracking-widest text-muted mb-3">
            Shirt colour · <span className="text-paper normal-case tracking-normal">{SHIRT_COLORS.find((c) => c.id === color)?.label}</span>
          </legend>
          <div className="flex flex-wrap gap-2.5">
            {SHIRT_COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                title={c.label}
                aria-label={c.label}
                aria-pressed={color === c.id}
                onClick={() => setColor(c.id)}
                className={`h-9 w-9 rounded-full border-2 transition ${color === c.id ? "border-accent scale-110" : "border-white/20 hover:border-white/60"}`}
                style={{ background: c.hex }}
              />
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="font-mono text-xs uppercase tracking-widest text-muted mb-3">Size · unisex</legend>
          <div className="flex flex-wrap gap-2">
            {SIZES.map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={size === s}
                onClick={() => setSize(s)}
                className={`font-mono uppercase text-sm min-w-12 rounded-md border px-3 py-2 transition ${
                  size === s ? "border-accent bg-accent/10" : "border-white/15 hover:border-white/40"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted mt-2">2XL and up add {formatMoney(300)}.</p>
        </fieldset>

        <div className="flex items-center gap-4">
          <label className="font-mono text-xs uppercase tracking-widest text-muted">Qty</label>
          <div className="inline-flex rounded-md border border-white/15">
            <button type="button" className="px-3 py-1.5 hover:bg-white/10" onClick={() => setQuantity((q) => Math.max(1, q - 1))} aria-label="decrease">−</button>
            <span className="px-3 py-1.5 font-mono min-w-10 text-center">{quantity}</span>
            <button type="button" className="px-3 py-1.5 hover:bg-white/10" onClick={() => setQuantity((q) => Math.min(10, q + 1))} aria-label="increase">+</button>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 p-5 flex flex-col gap-3">
          <div className="flex justify-between font-mono text-sm">
            <span>{quantity} × {status.code} tee ({size.toUpperCase()})</span>
            <span>{formatMoney(unit * quantity)}</span>
          </div>
          <div className="flex justify-between font-mono text-sm text-muted">
            <span>Standard shipping</span>
            <span>{formatMoney(SHIPPING_CENTS)}</span>
          </div>
          <button
            type="button"
            onClick={buy}
            disabled={busy}
            className="mt-2 w-full rounded-lg bg-accent text-ink font-mono font-extrabold py-3.5 hover:brightness-110 disabled:opacity-60"
          >
            {busy ? "Redirecting to Stripe…" : `Buy for ${formatMoney(unit * quantity + SHIPPING_CENTS)}`}
          </button>
          {error && <p className="text-sm text-red-400 font-mono">{error}</p>}
          <p className="text-xs text-muted">
            Secure checkout by Stripe. Printed to order on a Gildan Softstyle 64000, 100% ring-spun cotton, ships in 5–12 business days.
          </p>
        </div>
      </div>
    </div>
  );
}
