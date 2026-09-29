"use client";

import { useSyncExternalStore } from "react";
import { MAX_CART_LINES, MAX_QTY_PER_LINE, Size } from "./catalog";
import { Design, parseDesign } from "./design";

export type CartItem = { id: string; design: Design; size: Size; qty: number };

const KEY = "overhead-bag-v1";
const listeners = new Set<() => void>();
let cache: CartItem[] | null = null;
const EMPTY: CartItem[] = [];

function read(): CartItem[] {
  if (cache) return cache;
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "[]");
    cache = (Array.isArray(raw) ? raw : []).flatMap((i: CartItem) => {
      try {
        return [{ ...i, design: parseDesign(i.design) }];
      } catch {
        return [];
      }
    });
  } catch {
    cache = [];
  }
  return cache!;
}

function write(items: CartItem[]) {
  cache = items;
  localStorage.setItem(KEY, JSON.stringify(items));
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

export function useCart(): CartItem[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export const cart = {
  get: read,
  add(design: Design, size: Size, qty: number): boolean {
    const items = read();
    if (items.length >= MAX_CART_LINES) return false;
    write([...items, { id: crypto.randomUUID(), design, size, qty: Math.min(qty, MAX_QTY_PER_LINE) }]);
    return true;
  },
  update(id: string, patch: Partial<Omit<CartItem, "id">>) {
    write(read().map((i) => (i.id === id ? { ...i, ...patch } : i)));
  },
  remove(id: string) {
    write(read().filter((i) => i.id !== id));
  },
  clear() {
    write([]);
  },
};
