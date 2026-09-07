"use client";

import Link from "next/link";
import { useCart } from "@/components/CartProvider";
import { cartItemKey } from "@/lib/cart";
import { SHIRT_COLORS } from "@/lib/designs";

export default function CartPage() {
  const { items, remove, setQty, total, hydrated } = useCart();

  if (hydrated && items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-24 text-center">
        <h1 className="text-2xl font-black text-white">Your cart is empty</h1>
        <p className="mt-2 text-zinc-400">
          Somewhere a cryptid is disappointed.
        </p>
        <Link
          href="/shop"
          className="mt-6 inline-block rounded-full bg-lime-300 px-6 py-3 font-bold text-black hover:bg-lime-200"
        >
          Browse the collection
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-14">
      <h1 className="text-3xl font-black tracking-tight text-white">
        Your Cart
      </h1>

      <div className="mt-8 flex flex-col gap-4">
        {items.map((item) => {
          const key = cartItemKey(item);
          const color = SHIRT_COLORS.find((c) => c.key === item.color);
          return (
            <div
              key={key}
              className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-4"
            >
              <img
                src={`/art/${item.slug}-preview.png`}
                alt={item.name}
                className="h-16 w-16 rounded-lg object-contain"
                style={{ backgroundColor: "#000" }}
              />
              <div className="flex-1">
                <p className="font-bold text-white">{item.name}</p>
                <p className="text-sm text-zinc-400">
                  {item.jobTitle} &middot; {color?.label} &middot; Size{" "}
                  {item.size.toUpperCase()}
                </p>
                <button
                  onClick={() => remove(key)}
                  className="mt-1 text-xs font-medium text-red-400 hover:underline"
                >
                  Remove
                </button>
              </div>
              <div className="flex items-center rounded-lg border border-white/15">
                <button
                  onClick={() => setQty(key, item.qty - 1)}
                  className="px-3 py-1.5 text-zinc-300 hover:text-white"
                >
                  −
                </button>
                <span className="w-8 text-center text-white">{item.qty}</span>
                <button
                  onClick={() => setQty(key, item.qty + 1)}
                  className="px-3 py-1.5 text-zinc-300 hover:text-white"
                >
                  +
                </button>
              </div>
              <p className="w-16 text-right font-semibold text-white">
                ${(item.price * item.qty).toFixed(2)}
              </p>
            </div>
          );
        })}
      </div>

      {items.length > 0 && (
        <div className="mt-8 flex flex-col items-end gap-4 border-t border-white/10 pt-6">
          <p className="text-lg font-semibold text-white">
            Subtotal: ${total.toFixed(2)}
          </p>
          <p className="text-xs text-zinc-500">
            Shipping &amp; any taxes calculated at checkout.
          </p>
          <Link
            href="/checkout"
            className="rounded-full bg-lime-300 px-6 py-3 font-bold text-black hover:bg-lime-200"
          >
            Checkout
          </Link>
        </div>
      )}
    </div>
  );
}
