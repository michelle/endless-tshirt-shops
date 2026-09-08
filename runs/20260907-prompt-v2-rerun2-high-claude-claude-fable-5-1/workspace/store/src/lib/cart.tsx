"use client";
import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import type { CartItem } from "./cart-items";
import { MAX_QTY, subtotalCents } from "./cart-items";

const KEY = "dof-cart-v1";
const EMPTY: CartItem[] = [];

// Tiny localStorage-backed external store so SSR renders an empty cart and the
// client hydrates with the saved one without setState-in-effect.
let cache: CartItem[] | null = null;
const listeners = new Set<() => void>();

function read(): CartItem[] {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as CartItem[]) : EMPTY;
  } catch {
    cache = EMPTY;
  }
  return cache;
}
function write(next: CartItem[]) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
  listeners.forEach((l) => l());
}
function subscribe(l: () => void) {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      l();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
}
const isClient = () => true;
const isServer = () => false;

type Ctx = {
  items: CartItem[];
  ready: boolean;
  add: (item: CartItem) => void;
  remove: (item: Pick<CartItem, "slug" | "color" | "size">) => void;
  setQty: (item: Pick<CartItem, "slug" | "color" | "size">, qty: number) => void;
  clear: () => void;
  count: number;
  subtotal: number;
};

const CartContext = createContext<Ctx | null>(null);
const same = (a: Pick<CartItem, "slug" | "color" | "size">, b: Pick<CartItem, "slug" | "color" | "size">) =>
  a.slug === b.slug && a.color === b.color && a.size === b.size;

export function CartProvider({ children }: { children: React.ReactNode }) {
  const items = useSyncExternalStore(subscribe, read, () => EMPTY);
  const ready = useSyncExternalStore(subscribe, isClient, isServer);

  const add = useCallback((item: CartItem) => {
    const prev = read();
    const existing = prev.find((p) => same(p, item));
    write(existing ? prev.map((p) => (same(p, item) ? { ...p, qty: Math.min(MAX_QTY, p.qty + item.qty) } : p)) : [...prev, item]);
  }, []);
  const remove = useCallback((item: Pick<CartItem, "slug" | "color" | "size">) => {
    write(read().filter((p) => !same(p, item)));
  }, []);
  const setQty = useCallback((item: Pick<CartItem, "slug" | "color" | "size">, qty: number) => {
    const prev = read();
    write(qty < 1 ? prev.filter((p) => !same(p, item)) : prev.map((p) => (same(p, item) ? { ...p, qty: Math.min(MAX_QTY, qty) } : p)));
  }, []);
  const clear = useCallback(() => write(EMPTY), []);

  const value = useMemo<Ctx>(
    () => ({
      items,
      ready,
      add,
      remove,
      setQty,
      clear,
      count: items.reduce((n, i) => n + i.qty, 0),
      subtotal: subtotalCents(items),
    }),
    [items, ready, add, remove, setQty, clear],
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
