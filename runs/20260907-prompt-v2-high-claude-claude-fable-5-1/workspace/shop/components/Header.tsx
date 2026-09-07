"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart";

export function Header() {
  const { count, hydrated } = useCart();
  return (
    <header className="sticky top-0 z-30 border-b border-ink/15 bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="font-display text-xl tracking-wide sm:text-2xl">The Obsolete Guild</span>
          <span className="hidden font-mono text-[11px] uppercase tracking-[0.2em] text-ink/60 sm:inline">est. this week</span>
        </Link>
        <nav className="flex items-center gap-5 text-sm">
          <Link href="/#shirts" className="hover:underline">Shirts</Link>
          <Link href="/about" className="hover:underline">About</Link>
          <Link href="/orders" className="hidden hover:underline sm:inline">Track order</Link>
          <Link href="/cart" className="rounded-full border border-ink px-3 py-1 font-medium hover:bg-ink hover:text-paper">
            Cart{hydrated && count > 0 ? ` (${count})` : ""}
          </Link>
        </nav>
      </div>
    </header>
  );
}
