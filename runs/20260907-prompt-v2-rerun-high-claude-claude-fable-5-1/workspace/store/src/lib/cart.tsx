"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { CartLine, Size, cartSubtotalCents, lineKey, sizes, getColor, getDesign } from "./catalog";

const KEY = "deprecated-parks-cart-v1";

type Cart = {
  lines: CartLine[];
  ready: boolean;
  add: (line: CartLine) => void;
  setQty: (line: CartLine, qty: number) => void;
  remove: (line: CartLine) => void;
  clear: () => void;
  count: number;
  subtotalCents: number;
};

const CartContext = createContext<Cart | null>(null);

function load(): CartLine[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartLine[];
    return parsed.filter((l) => getDesign(l.slug) && getColor(l.color) && sizes.includes(l.size as Size) && l.qty > 0);
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setLines(load());
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready) localStorage.setItem(KEY, JSON.stringify(lines));
  }, [lines, ready]);

  const add = useCallback((line: CartLine) => {
    setLines((prev) => {
      const k = lineKey(line);
      const i = prev.findIndex((l) => lineKey(l) === k);
      if (i === -1) return [...prev, { ...line }];
      const next = [...prev];
      next[i] = { ...next[i], qty: Math.min(10, next[i].qty + line.qty) };
      return next;
    });
  }, []);
  const setQty = useCallback((line: CartLine, qty: number) => {
    setLines((prev) => prev.map((l) => (lineKey(l) === lineKey(line) ? { ...l, qty: Math.max(1, Math.min(10, qty)) } : l)));
  }, []);
  const remove = useCallback((line: CartLine) => {
    setLines((prev) => prev.filter((l) => lineKey(l) !== lineKey(line)));
  }, []);
  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<Cart>(
    () => ({
      lines,
      ready,
      add,
      setQty,
      remove,
      clear,
      count: lines.reduce((n, l) => n + l.qty, 0),
      subtotalCents: cartSubtotalCents(lines),
    }),
    [lines, ready, add, setQty, remove, clear],
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const c = useContext(CartContext);
  if (!c) throw new Error("useCart must be used inside CartProvider");
  return c;
}
