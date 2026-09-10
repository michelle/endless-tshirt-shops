"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { MAX_ITEMS_PER_ORDER } from "./products";

const STORAGE_KEY = "constella_cart_v1";
const CartCtx = createContext(null);

function readStorage() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Deliberately deferred to an effect (not a lazy useState initializer):
    // localStorage isn't available during SSR, and reading it eagerly would
    // make the client's first render disagree with the server-rendered HTML.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(readStorage());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, ready]);

  const api = useMemo(
    () => ({
      items,
      ready,
      addItem(item) {
        setItems((prev) => {
          if (prev.length >= MAX_ITEMS_PER_ORDER) return prev;
          return [...prev, { ...item, id: crypto.randomUUID() }];
        });
      },
      removeItem(id) {
        setItems((prev) => prev.filter((i) => i.id !== id));
      },
      updateQty(id, qty) {
        setItems((prev) => prev.map((i) => (i.id === id ? { ...i, qty } : i)));
      },
      clear() {
        setItems([]);
      },
    }),
    [items, ready]
  );

  return <CartCtx.Provider value={api}>{children}</CartCtx.Provider>;
}

export function useCart() {
  const ctx = useContext(CartCtx);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
