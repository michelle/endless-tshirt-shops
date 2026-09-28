"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Design } from "@/lib/design";
import { MAX_CART_LINES, MAX_QTY } from "@/lib/catalog";

export type CartLine = { id: string; design: Design; qty: number };

type CartApi = {
  lines: CartLine[];
  ready: boolean;
  count: number;
  add: (design: Design) => boolean;
  setQty: (id: string, qty: number) => void;
  remove: (id: string) => void;
  clear: () => void;
};

const KEY = "specimen.cart.v1";
const CartContext = createContext<CartApi | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || "[]");
      if (Array.isArray(saved)) setLines(saved);
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) localStorage.setItem(KEY, JSON.stringify(lines));
  }, [lines, ready]);

  const add = useCallback(
    (design: Design) => {
      if (lines.length >= MAX_CART_LINES) return false;
      setLines((ls) => [...ls, { id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`, design, qty: 1 }]);
      return true;
    },
    [lines.length],
  );
  const setQty = useCallback((id: string, qty: number) => {
    setLines((ls) => ls.map((l) => (l.id === id ? { ...l, qty: Math.max(1, Math.min(MAX_QTY, qty)) } : l)));
  }, []);
  const remove = useCallback((id: string) => setLines((ls) => ls.filter((l) => l.id !== id)), []);
  const clear = useCallback(() => setLines([]), []);

  const api = useMemo(
    () => ({ lines, ready, count: lines.reduce((n, l) => n + l.qty, 0), add, setQty, remove, clear }),
    [lines, ready, add, setQty, remove, clear],
  );
  return <CartContext.Provider value={api}>{children}</CartContext.Provider>;
}

export function useCart(): CartApi {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}

export function BagLink() {
  const { count, ready } = useCart();
  return (
    <a href="/cart">
      Bag<span className="bag-count">{ready ? count : 0}</span>
    </a>
  );
}
