"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { PRICE_CENTS } from "./catalog";

export type CartLine = { slug: string; color: string; size: string; quantity: number };

type CartCtx = {
  lines: CartLine[];
  add: (line: CartLine) => void;
  remove: (index: number) => void;
  setQuantity: (index: number, quantity: number) => void;
  clear: () => void;
  count: number;
  subtotal: number;
  hydrated: boolean;
};

const Ctx = createContext<CartCtx | null>(null);
const KEY = "obsolete-guild-cart-v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setLines(JSON.parse(raw));
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(KEY, JSON.stringify(lines));
  }, [lines, hydrated]);

  const add = useCallback((line: CartLine) => {
    setLines((prev) => {
      const i = prev.findIndex((l) => l.slug === line.slug && l.color === line.color && l.size === line.size);
      if (i >= 0) {
        const next = [...prev];
        next[i] = { ...next[i], quantity: Math.min(20, next[i].quantity + line.quantity) };
        return next;
      }
      return [...prev, line];
    });
  }, []);

  const remove = useCallback((index: number) => setLines((prev) => prev.filter((_, i) => i !== index)), []);
  const setQuantity = useCallback(
    (index: number, quantity: number) =>
      setLines((prev) => prev.map((l, i) => (i === index ? { ...l, quantity: Math.max(1, Math.min(20, quantity)) } : l))),
    []
  );
  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<CartCtx>(() => {
    const count = lines.reduce((n, l) => n + l.quantity, 0);
    return { lines, add, remove, setQuantity, clear, count, subtotal: count * PRICE_CENTS, hydrated };
  }, [lines, add, remove, setQuantity, clear, hydrated]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
