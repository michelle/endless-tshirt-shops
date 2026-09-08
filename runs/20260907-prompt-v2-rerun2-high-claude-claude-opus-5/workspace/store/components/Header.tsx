"use client";
import Link from "next/link";
import { useCart } from "./CartProvider";

export function Header({ sandbox }: { sandbox: boolean }) {
  const { count, ready } = useCart();
  return (
    <>
      {sandbox && (
        <div className="banner caps">
          Demonstration store · orders route to the Prodigi sandbox · no card is charged
        </div>
      )}
      <header className="site-head">
        <div className="bar">
          <Link className="brand" href="/">
            <span className="mark" aria-hidden>✝</span>
            <span>
              <b>The Order of Small Disasters</b>
              <span>Devotional apparel · est. 2026</span>
            </span>
          </Link>
          <nav className="nav caps">
            <Link href="/">The Saints</Link>
            <Link href="/about">The Order</Link>
            <Link className="cart-pill caps" href="/cart">
              Cart{ready && count > 0 ? ` (${count})` : ""}
            </Link>
          </nav>
        </div>
      </header>
    </>
  );
}
