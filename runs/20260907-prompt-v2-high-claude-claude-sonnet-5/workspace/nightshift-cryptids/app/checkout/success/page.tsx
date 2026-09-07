"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { CartItem } from "@/lib/cart";

type LastOrder = {
  merchantReference: string;
  prodigiOrderId: string | null;
  status: string;
  items: CartItem[];
  total: number;
  email: string;
};

export default function SuccessPage() {
  const [order, setOrder] = useState<LastOrder | null | undefined>(undefined);

  useEffect(() => {
    // sessionStorage only exists client-side, so we read the just-placed
    // order after mount rather than during render.
    const raw = sessionStorage.getItem("nsc_last_order");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read from a client-only store, not derived state
    setOrder(raw ? JSON.parse(raw) : null);
  }, []);

  if (order === undefined) return null;

  if (order === null) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-24 text-center">
        <h1 className="text-2xl font-black text-white">No recent order found</h1>
        <Link
          href="/shop"
          className="mt-6 inline-block rounded-full bg-lime-300 px-6 py-3 font-bold text-black hover:bg-lime-200"
        >
          Back to shop
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-24 text-center">
      <span className="text-5xl">🌙</span>
      <h1 className="mt-4 text-3xl font-black tracking-tight text-white">
        Order placed
      </h1>
      <p className="mt-2 text-zinc-400">
        Confirmation sent to <span className="text-white">{order.email}</span>
        . A cryptid has been dispatched to print your shirt.
      </p>

      <div className="mt-8 rounded-xl border border-white/10 bg-white/[0.03] p-6 text-left">
        <div className="flex justify-between text-sm">
          <span className="text-zinc-400">Order reference</span>
          <span className="font-mono text-white">{order.merchantReference}</span>
        </div>
        <div className="mt-2 flex justify-between text-sm">
          <span className="text-zinc-400">Prodigi order ID</span>
          <span className="font-mono text-white">
            {order.prodigiOrderId ?? "—"}
          </span>
        </div>
        <div className="mt-2 flex justify-between text-sm">
          <span className="text-zinc-400">Fulfillment status</span>
          <span className="text-lime-300">{order.status}</span>
        </div>
        <div className="mt-4 flex flex-col gap-2 border-t border-white/10 pt-4">
          {order.items.map((item) => (
            <div
              key={`${item.slug}-${item.color}-${item.size}`}
              className="flex justify-between text-sm text-zinc-300"
            >
              <span>
                {item.name} ({item.size.toUpperCase()}) &times; {item.qty}
              </span>
              <span>${(item.price * item.qty).toFixed(2)}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-between border-t border-white/10 pt-4 font-bold text-white">
          <span>Total</span>
          <span>${order.total.toFixed(2)}</span>
        </div>
      </div>

      <p className="mt-6 text-xs text-zinc-500">
        This is a sandbox order created with Prodigi&apos;s test environment
        &mdash; nothing was actually printed, shipped, or charged.
      </p>

      <Link
        href="/shop"
        className="mt-8 inline-block rounded-full border border-white/20 px-6 py-3 font-bold text-white hover:border-white/40"
      >
        Keep shopping
      </Link>
    </div>
  );
}
