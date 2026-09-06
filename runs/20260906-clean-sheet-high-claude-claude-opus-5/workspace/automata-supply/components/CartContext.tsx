"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Design, SizeId } from "@/lib/design";
import { priceFor } from "@/lib/catalog";

export type CartLine = {
  /** Stable key for a design+size+garment combination. */
  key: string;
  design: Design;
  size: SizeId;
  garmentId: string;
  qty: number;
  /** Display name at the time of adding, e.g. "Rule 030". */
  name: string;
};

type CartApi = {
  lines: CartLine[];
  ready: boolean;
  add: (line: Omit<CartLine, "key">) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  count: number;
  subtotal: number;
};

const STORAGE_KEY = "automata.cart.v1";
const MAX_LINES = 10;
const MAX_QTY = 10;

const CartContext = createContext<CartApi | null>(null);

function lineKey(l: Omit<CartLine, "key">): string {
  const d = l.design;
  return [d.rule, d.seed, d.seeding, d.ink, d.cells, l.size, l.garmentId].join("~");
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  // Cart lives in localStorage, so render an empty cart until hydration to
  // keep the server and client markup identical.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setLines(parsed.slice(0, MAX_LINES));
      }
    } catch {
      // Corrupt or unavailable storage just means an empty cart.
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      // Quota or private-mode failures are not worth interrupting checkout.
    }
  }, [lines, ready]);

  const add = useCallback((line: Omit<CartLine, "key">) => {
    setLines((prev) => {
      const key = lineKey(line);
      const existing = prev.find((l) => l.key === key);
      if (existing) {
        return prev.map((l) =>
          l.key === key ? { ...l, qty: Math.min(MAX_QTY, l.qty + line.qty) } : l,
        );
      }
      if (prev.length >= MAX_LINES) return prev;
      return [...prev, { ...line, key }];
    });
  }, []);

  const setQty = useCallback((key: string, qty: number) => {
    setLines((prev) =>
      qty <= 0
        ? prev.filter((l) => l.key !== key)
        : prev.map((l) => (l.key === key ? { ...l, qty: Math.min(MAX_QTY, qty) } : l)),
    );
  }, []);

  const remove = useCallback((key: string) => {
    setLines((prev) => prev.filter((l) => l.key !== key));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<CartApi>(
    () => ({
      lines,
      ready,
      add,
      setQty,
      remove,
      clear,
      count: lines.reduce((n, l) => n + l.qty, 0),
      subtotal: lines.reduce((n, l) => n + priceFor(l.design, l.size) * l.qty, 0),
    }),
    [lines, ready, add, setQty, remove, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartApi {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
