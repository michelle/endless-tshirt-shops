"use client";
import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { formatPrice, getColor, getProduct, getSize, PRICE_CENTS } from "@/lib/catalog";
import { MAX_QTY } from "@/lib/cart-items";
import { useCart } from "@/lib/cart";
import { ShirtMockup } from "./ShirtMockup";

export function CartView() {
  const { items, ready, setQty, remove, subtotal } = useCart();
  const params = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function checkout() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Checkout failed");
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed");
      setBusy(false);
    }
  }

  if (!ready) return <p className="text-ink-2">Loading your cart…</p>;

  if (items.length === 0) {
    return (
      <div className="dashed p-10 text-center">
        <p className="font-slab text-2xl">Your cart is empty.</p>
        <p className="mt-2 text-ink-2">No bureau has been assigned to you yet.</p>
        <Link href="/#collection" className="btn mt-6">
          Browse the bureaus
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        {params.get("cancelled") ? (
          <p className="dashed p-3 text-sm">Checkout was cancelled. Your cart is still here whenever you’re ready.</p>
        ) : null}
        {items.map((i) => {
          const p = getProduct(i.slug);
          const c = getColor(i.color);
          const s = getSize(i.size);
          if (!p || !c || !s) return null;
          const key = `${i.slug}-${i.color}-${i.size}`;
          return (
            <div key={key} className="card p-4 flex gap-4 items-center">
              <ShirtMockup product={p} colorId={c.id} idPrefix={`cart-${key}`} className="w-24 shrink-0" />
              <div className="flex-1 min-w-0">
                <Link href={`/shirts/${p.slug}`} className="font-slab text-lg leading-tight hover:underline">
                  {p.bureau}
                </Link>
                <p className="text-sm text-ink-2">
                  {c.label} · {s.label}
                </p>
                <div className="mt-2 flex items-center gap-3 text-sm">
                  <label className="flex items-center gap-2">
                    Qty
                    <select
                      className="border-2 border-ink bg-paper px-2 py-1"
                      value={i.qty}
                      onChange={(e) => setQty(i, Number(e.target.value))}
                    >
                      {Array.from({ length: MAX_QTY }, (_, n) => n + 1).map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button className="underline text-stamp" onClick={() => remove(i)}>
                    Remove
                  </button>
                </div>
              </div>
              <p className="font-bold whitespace-nowrap">{formatPrice(i.qty * PRICE_CENTS)}</p>
            </div>
          );
        })}
      </div>

      <aside className="card p-6 h-fit lg:sticky lg:top-24">
        <h2 className="font-slab text-2xl">Summary</h2>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt>Subtotal</dt>
            <dd className="font-bold">{formatPrice(subtotal)}</dd>
          </div>
          <div className="flex justify-between text-ink-2">
            <dt>Shipping</dt>
            <dd>from $5.95 · chosen at checkout</dd>
          </div>
          <div className="flex justify-between text-ink-2">
            <dt>Tax</dt>
            <dd>calculated at checkout</dd>
          </div>
        </dl>
        <button className="btn w-full mt-6" onClick={checkout} disabled={busy}>
          {busy ? "Opening checkout…" : "Checkout with Stripe"}
        </button>
        {error ? <p className="mt-3 text-sm text-stamp font-bold">{error}</p> : null}
        <p className="mt-4 text-xs text-ink-2">
          You’ll enter your shipping address and card on Stripe’s secure checkout page.
        </p>
      </aside>
    </div>
  );
}
