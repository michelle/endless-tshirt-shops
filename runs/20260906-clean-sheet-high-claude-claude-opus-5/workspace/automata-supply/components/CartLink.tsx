"use client";

import { useCart } from "./CartContext";

export function CartLink() {
  const { count, ready } = useCart();
  return (
    <a href="/cart" className="cart-link">
      Cart
      {ready && count > 0 ? <span className="cart-count">{count}</span> : null}
    </a>
  );
}
