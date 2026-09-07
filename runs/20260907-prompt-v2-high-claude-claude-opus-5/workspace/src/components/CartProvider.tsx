'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { MAX_QTY, type CartLine } from '@/lib/cart';

const KEY = 'lastshift.cart.v1';

type Ctx = {
  lines: CartLine[];
  ready: boolean;
  count: number;
  add: (l: CartLine) => void;
  setQty: (i: number, qty: number) => void;
  remove: (i: number) => void;
  clear: () => void;
};

const CartContext = createContext<Ctx | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setLines(parsed);
      }
    } catch { /* corrupt or unavailable storage — start empty */ }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(KEY, JSON.stringify(lines)); } catch { /* quota / private mode */ }
  }, [lines, ready]);

  const add = useCallback((l: CartLine) => {
    setLines((prev) => {
      const i = prev.findIndex((p) => p.slug === l.slug && p.color === l.color && p.size === l.size);
      if (i === -1) return [...prev, { ...l, qty: Math.min(MAX_QTY, l.qty) }];
      const next = [...prev];
      next[i] = { ...next[i], qty: Math.min(MAX_QTY, next[i].qty + l.qty) };
      return next;
    });
  }, []);

  const setQty = useCallback((i: number, qty: number) => {
    setLines((prev) =>
      prev.flatMap((l, idx) => (idx !== i ? [l] : qty < 1 ? [] : [{ ...l, qty: Math.min(MAX_QTY, qty) }]))
    );
  }, []);

  const remove = useCallback((i: number) => setLines((prev) => prev.filter((_, idx) => idx !== i)), []);
  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<Ctx>(
    () => ({ lines, ready, count: lines.reduce((n, l) => n + l.qty, 0), add, setQty, remove, clear }),
    [lines, ready, add, setQty, remove, clear]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const c = useContext(CartContext);
  if (!c) throw new Error('useCart must be used inside CartProvider');
  return c;
}
