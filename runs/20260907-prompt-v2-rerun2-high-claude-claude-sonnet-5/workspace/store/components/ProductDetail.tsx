"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Product } from "@/lib/products";
import { COLORS, SIZES, formatPrice } from "@/lib/products";
import { useCart } from "@/lib/cart-context";

export function ProductDetail({ product }: { product: Product }) {
  const [size, setSize] = useState("m");
  const [color, setColor] = useState(COLORS[0].value);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const { addItem } = useCart();
  const router = useRouter();

  const colorSwatch = COLORS.find((c) => c.value === color) ?? COLORS[0];

  function handleAdd() {
    addItem({ slug: product.slug, size, color, qty });
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  }

  function handleBuyNow() {
    addItem({ slug: product.slug, size, color, qty });
    router.push("/cart");
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <div className="grid gap-10 lg:grid-cols-2">
        <div
          className="flex items-center justify-center rounded-lg border-2 border-ink"
          style={{ background: product.bgColor }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/art/${product.slug}?w=900`}
            alt={`${product.name} employee badge`}
            className="h-[420px] w-full object-contain p-6 sm:h-[520px]"
          />
        </div>

        <div>
          <div className="font-type text-xs uppercase tracking-wide text-ink/50">
            {product.dept} · {product.fileNo}
          </div>
          <h1 className="mt-1 font-display text-4xl">{product.name}</h1>
          <div className="mt-1 font-display text-sm uppercase tracking-wide text-stamp">
            {product.role}
          </div>
          <p className="font-type mt-4 leading-relaxed text-ink/80">
            {product.description}
          </p>
          <div className="mt-5 font-display text-2xl">
            {formatPrice(product.price)}
          </div>

          <div className="mt-8">
            <div className="font-display text-xs uppercase tracking-wide text-ink/60">
              Shirt Color — {colorSwatch.name}
            </div>
            <div className="mt-2 flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setColor(c.value)}
                  className={`h-9 w-9 rounded-full border-2 ${
                    color === c.value ? "border-stamp ring-2 ring-stamp/40" : "border-ink/30"
                  }`}
                  style={{ background: c.swatch }}
                  aria-label={c.name}
                  title={c.name}
                />
              ))}
            </div>
          </div>

          <div className="mt-6">
            <div className="font-display text-xs uppercase tracking-wide text-ink/60">
              Size
            </div>
            <div className="mt-2 flex gap-2">
              {SIZES.map((s) => (
                <button
                  key={s}
                  onClick={() => setSize(s)}
                  className={`rounded-md border-2 px-3 py-1.5 font-display text-sm uppercase ${
                    size === s
                      ? "border-ink bg-ink text-paper"
                      : "border-ink/30 hover:border-ink"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <div className="font-display text-xs uppercase tracking-wide text-ink/60">
              Qty
            </div>
            <div className="flex items-center rounded-md border-2 border-ink/30">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="px-3 py-1 font-display text-lg"
              >
                −
              </button>
              <span className="w-8 text-center font-display">{qty}</span>
              <button
                onClick={() => setQty((q) => Math.min(10, q + 1))}
                className="px-3 py-1 font-display text-lg"
              >
                +
              </button>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              onClick={handleAdd}
              className="stamped rounded-md bg-paper px-6 py-3 font-display text-sm uppercase tracking-wide"
            >
              {added ? "Added to Cart ✓" : "Add to Cart"}
            </button>
            <button
              onClick={handleBuyNow}
              className="rounded-md bg-stamp px-6 py-3 font-display text-sm uppercase tracking-wide text-paper hover:opacity-90"
            >
              Buy Now
            </button>
          </div>

          <p className="mt-6 text-xs text-ink/50">
            Unisex Gildan 64000 softstyle tee, 100% cotton. Printed to order
            and shipped directly — please allow standard production time.
          </p>
        </div>
      </div>
    </div>
  );
}
