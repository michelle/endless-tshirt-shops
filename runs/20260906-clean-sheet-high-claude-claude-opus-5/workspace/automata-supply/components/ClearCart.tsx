"use client";

import { useEffect } from "react";
import { useCart } from "./CartContext";

/** Empties the cart once an order has been confirmed as paid. */
export function ClearCart() {
  const { clear, ready, lines } = useCart();
  useEffect(() => {
    if (ready && lines.length > 0) clear();
  }, [ready, lines.length, clear]);
  return null;
}
