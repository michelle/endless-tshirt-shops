"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart-context";
import { getProduct, formatPrice, COLORS } from "@/lib/products";

export default function CartPage() {
  const { items, removeItem, updateQty, subtotal, ready } = useCart();

  if (!ready) return null;

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6">
        <div className="font-type text-xs uppercase tracking-[0.3em] text-ink/50">
          Case File Empty
        </div>
        <h1 className="mt-2 font-display text-3xl">Your cart has no personnel yet.</h1>
        <Link
          href="/#personnel"
          className="stamped mt-8 inline-block rounded-md bg-ink px-6 py-3 font-display text-sm uppercase tracking-wide text-paper"
        >
          Browse Personnel Files
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-3xl">Your Cart</h1>
      <div className="mt-8 divide-y-2 divide-ink/10">
        {items.map((item, i) => {
          const product = getProduct(item.slug);
          if (!product) return null;
          const colorName = COLORS.find((c) => c.value === item.color)?.name ?? item.color;
          return (
            <div key={`${item.slug}-${item.size}-${item.color}`} className="flex gap-4 py-5">
              <div
                className="h-24 w-24 shrink-0 overflow-hidden rounded-md border-2 border-ink"
                style={{ background: product.bgColor }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/art/${product.slug}?w=200`}
                  alt={product.name}
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="flex-1">
                <div className="font-display text-lg">{product.name}</div>
                <div className="font-type text-xs uppercase tracking-wide text-ink/60">
                  {product.role}
                </div>
                <div className="mt-1 text-sm text-ink/70">
                  Size {item.size.toUpperCase()} · {colorName}
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <div className="flex items-center rounded-md border-2 border-ink/30">
                    <button
                      onClick={() => updateQty(i, item.qty - 1)}
                      className="px-2 py-0.5 font-display"
                    >
                      −
                    </button>
                    <span className="w-8 text-center font-display text-sm">{item.qty}</span>
                    <button
                      onClick={() => updateQty(i, item.qty + 1)}
                      className="px-2 py-0.5 font-display"
                    >
                      +
                    </button>
                  </div>
                  <button
                    onClick={() => removeItem(i)}
                    className="font-type text-xs uppercase text-stamp underline"
                  >
                    Remove
                  </button>
                </div>
              </div>
              <div className="font-display text-lg">
                {formatPrice(product.price * item.qty)}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 flex items-center justify-between border-t-4 border-ink pt-4">
        <div className="font-type text-sm text-ink/60">
          Shipping &amp; tax calculated at checkout
        </div>
        <div className="font-display text-2xl">Subtotal: {formatPrice(subtotal)}</div>
      </div>

      <div className="mt-6 flex justify-end">
        <Link
          href="/checkout"
          className="rounded-md bg-stamp px-8 py-3 font-display text-sm uppercase tracking-wide text-paper hover:opacity-90"
        >
          Proceed to Checkout
        </Link>
      </div>
    </div>
  );
}
