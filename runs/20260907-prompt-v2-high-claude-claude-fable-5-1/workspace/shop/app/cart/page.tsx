"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart";
import { PRICE_CENTS, formatMoney, getColor, getDesign } from "@/lib/catalog";
import { ShirtMockup } from "@/components/ShirtMockup";

export default function CartPage() {
  const { lines, remove, setQuantity, subtotal, hydrated } = useCart();

  if (!hydrated) return <div className="mx-auto max-w-4xl px-4 py-12">Loading…</div>;

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6">
        <h1 className="font-display text-3xl">Your cart is empty</h1>
        <p className="mt-3 text-ink/70">The pinsetters have nothing to reset.</p>
        <Link href="/#shirts" className="btn mt-6">Browse shirts</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-3xl">Cart</h1>
      <ul className="mt-6 divide-y divide-ink/15">
        {lines.map((l, i) => {
          const d = getDesign(l.slug)!;
          const c = getColor(l.color)!;
          return (
            <li key={`${l.slug}-${l.color}-${l.size}`} className="flex gap-4 py-5">
              <div className="w-24 shrink-0 rounded border border-ink/10 bg-paper-2/60 p-1">
                <ShirtMockup slug={l.slug} color={c} />
              </div>
              <div className="flex-1">
                <Link href={`/shirts/${l.slug}`} className="font-display text-lg hover:underline">{d.name}</Link>
                <div className="text-sm text-ink/70">{c.label} · size {l.size.toUpperCase()}</div>
                <div className="mt-2 flex items-center gap-3">
                  <label className="!inline text-xs">Qty</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={l.quantity}
                    onChange={(e) => setQuantity(i, Number(e.target.value))}
                    className="!w-20"
                  />
                  <button type="button" onClick={() => remove(i)} className="text-sm text-rust underline">Remove</button>
                </div>
              </div>
              <div className="text-right font-medium">{formatMoney(PRICE_CENTS * l.quantity)}</div>
            </li>
          );
        })}
      </ul>
      <div className="mt-6 flex flex-col items-end gap-2 border-t border-ink/20 pt-6">
        <div className="text-lg">Subtotal <span className="ml-3 font-medium">{formatMoney(subtotal)}</span></div>
        <div className="text-sm text-ink/60">Shipping calculated at checkout.</div>
        <Link href="/checkout" className="btn mt-3">Checkout</Link>
      </div>
    </div>
  );
}
