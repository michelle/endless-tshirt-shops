"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart";

export function BagLink() {
  const items = useCart();
  const count = items.reduce((n, i) => n + i.qty, 0);
  return (
    <Link href="/bag" className="bag-link">
      Bag {count > 0 && <span className="bag-count">{count}</span>}
    </Link>
  );
}
