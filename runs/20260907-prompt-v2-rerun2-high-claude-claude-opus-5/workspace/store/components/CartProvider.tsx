"use client";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { LineInput } from "@/lib/cart";

const KEY = "osd.cart.v1";
const MAX = 10;

type Ctx = {
  items: LineInput[];
  count: number;
  ready: boolean;
  add: (i: LineInput) => void;
  setQty: (i: Omit<LineInput, "qty">, qty: number) => void;
  remove: (i: Omit<LineInput, "qty">) => void;
  clear: () => void;
};

const CartCtx = createContext<Ctx | null>(null);
const same = (a: LineInput, b: Omit<LineInput, "qty">) =>
  a.slug === b.slug && a.color === b.color && a.size === b.size;

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<LineInput[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setItems(parsed.filter((x) => x?.slug && x?.color && x?.size));
      }
    } catch { /* corrupt storage — start empty */ }
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) localStorage.setItem(KEY, JSON.stringify(items));
  }, [items, ready]);

  const value = useMemo<Ctx>(() => ({
    items,
    ready,
    count: items.reduce((a, i) => a + i.qty, 0),
    add: (i) => setItems((cur) => {
      const at = cur.findIndex((c) => same(c, i));
      if (at < 0) return [...cur, { ...i, qty: Math.min(MAX, i.qty) }];
      const next = [...cur];
      next[at] = { ...next[at], qty: Math.min(MAX, next[at].qty + i.qty) };
      return next;
    }),
    setQty: (i, qty) => setItems((cur) =>
      qty <= 0 ? cur.filter((c) => !same(c, i))
               : cur.map((c) => (same(c, i) ? { ...c, qty: Math.min(MAX, qty) } : c))),
    remove: (i) => setItems((cur) => cur.filter((c) => !same(c, i))),
    clear: () => setItems([]),
  }), [items, ready]);

  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}

export function useCart() {
  const c = useContext(CartCtx);
  if (!c) throw new Error("useCart must be used inside CartProvider");
  return c;
}
