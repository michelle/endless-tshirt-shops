"use client";

import { useState } from "react";
import Link from "next/link";
import { COLORS, PRICE_CENTS, SIZES, formatMoney, type Design } from "@/lib/catalog";
import { ShirtMockup } from "./ShirtMockup";
import { useCart } from "@/lib/cart";

export function ProductConfigurator({ design }: { design: Design }) {
  const [color, setColor] = useState(COLORS[0]);
  const [size, setSize] = useState<string>("m");
  const [added, setAdded] = useState(false);
  const { add } = useCart();

  function addToCart() {
    add({ slug: design.slug, color: color.id, size, quantity: 1 });
    setAdded(true);
    setTimeout(() => setAdded(false), 2500);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
      <div className="rounded-lg border border-ink/10 bg-paper-2/60 p-4 sm:p-8">
        <ShirtMockup slug={design.slug} color={color} priority />
      </div>
      <div>
        <div className="font-mono text-xs uppercase tracking-[0.25em] text-rust">{design.local} · {design.est} · retired {design.obsoletedBy.split(",").pop()?.trim().toLowerCase()}</div>
        <h1 className="mt-2 font-display text-3xl sm:text-4xl">{design.name}</h1>
        <p className="mt-2 text-lg italic text-ink/75">“{design.tagline}”</p>
        <div className="mt-4 text-2xl font-medium">{formatMoney(PRICE_CENTS)}</div>

        <div className="mt-8">
          <div className="flex items-baseline justify-between">
            <label>Colour</label>
            <span className="text-sm text-ink/70">{color.label}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                aria-label={c.label}
                aria-pressed={c.id === color.id}
                onClick={() => setColor(c)}
                className={`h-9 w-9 rounded-full border-2 transition ${c.id === color.id ? "border-rust scale-110" : "border-ink/20 hover:border-ink/60"}`}
                style={{ backgroundColor: c.hex }}
              />
            ))}
          </div>
        </div>

        <div className="mt-6">
          <div className="flex items-baseline justify-between">
            <label>Size</label>
            <Link href="/about#shipping" className="text-xs text-ink/60 underline">Fit notes</Link>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {SIZES.map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={s === size}
                onClick={() => setSize(s)}
                className={`min-w-12 rounded border px-3 py-2 text-sm uppercase transition ${s === size ? "border-ink bg-ink text-paper" : "border-ink/30 hover:border-ink"}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button type="button" onClick={addToCart} className="btn">
            {added ? "Added to cart ✓" : "Add to cart"}
          </button>
          {added && (
            <Link href="/cart" className="btn-outline">View cart</Link>
          )}
        </div>
        <p className="mt-4 text-sm text-ink/60">Shipping is quoted for your country at checkout. Printed to order; please allow 2–4 working days before dispatch.</p>
      </div>
    </div>
  );
}
