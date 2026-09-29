"use client";

import { useEffect } from "react";
import { cart } from "@/lib/cart";

/** Empties the bag once we land on a paid order. */
export function ClearBag() {
  useEffect(() => {
    cart.clear();
  }, []);
  return null;
}
