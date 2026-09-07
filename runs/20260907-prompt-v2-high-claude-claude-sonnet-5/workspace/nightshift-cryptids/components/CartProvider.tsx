"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { cartItemKey, cartCount, cartTotal, type CartItem } from "@/lib/cart";

const STORAGE_KEY = "nsc_cart_v1";

type CartContextValue = {
  items: CartItem[];
  add: (item: CartItem) => void;
  remove: (key: string) => void;
  setQty: (key: string, qty: number) => void;
  clear: () => void;
  count: number;
  total: number;
  hydrated: boolean;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Cart lives in localStorage, which doesn't exist during SSR. We start
    // with an empty cart on the server (and on first client render, to keep
    // hydration consistent) and load the real cart right after mount.
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from a client-only store, not derived state
      if (raw) setItems(JSON.parse(raw));
    } catch {
      // ignore corrupt storage
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      add: (item) =>
        setItems((prev) => {
          const key = cartItemKey(item);
          const existing = prev.find((p) => cartItemKey(p) === key);
          if (existing) {
            return prev.map((p) =>
              cartItemKey(p) === key ? { ...p, qty: p.qty + item.qty } : p
            );
          }
          return [...prev, item];
        }),
      remove: (key) =>
        setItems((prev) => prev.filter((p) => cartItemKey(p) !== key)),
      setQty: (key, qty) =>
        setItems((prev) =>
          qty <= 0
            ? prev.filter((p) => cartItemKey(p) !== key)
            : prev.map((p) => (cartItemKey(p) === key ? { ...p, qty } : p))
        ),
      clear: () => setItems([]),
      count: cartCount(items),
      total: cartTotal(items),
      hydrated,
    }),
    [items, hydrated]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
