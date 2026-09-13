"use client";

import Link from "next/link";
import { useCart } from "@/components/CartStore";

export default function SiteHeader() {
  const { count } = useCart();
  return (
    <header className="site-header">
      <div className="container site-header-inner">
        <Link href="/" className="logo">
          CIPHER<span className="logo-accent">/</span>TEES
        </Link>
        <nav>
          <Link href="/design">Build a tee</Link>
          <Link href="/order/status">Order status</Link>
          <Link href="/cart" className="cart-link">
            Cart{count > 0 ? ` (${count})` : ""}
          </Link>
        </nav>
      </div>
    </header>
  );
}
