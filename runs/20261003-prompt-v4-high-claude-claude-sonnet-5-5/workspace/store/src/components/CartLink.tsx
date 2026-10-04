"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { readCart, CART_EVENT } from "@/lib/cart";

export function CartLink() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const update = () => setCount(readCart().reduce((n, i) => n + i.qty, 0));
    update();
    window.addEventListener(CART_EVENT, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(CART_EVENT, update);
      window.removeEventListener("storage", update);
    };
  }, []);
  return (
    <Link href="/cart" className="cartlink" aria-label={`Cart, ${count} items`}>
      Cart{count > 0 && <span className="badge">{count}</span>}
    </Link>
  );
}
