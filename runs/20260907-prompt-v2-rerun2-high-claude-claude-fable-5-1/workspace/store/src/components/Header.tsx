"use client";
import Link from "next/link";
import { useCart } from "@/lib/cart";

export function Header() {
  const { count, ready } = useCart();
  return (
    <header className="border-b-4 border-ink bg-paper/90 backdrop-blur sticky top-0 z-20">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3">
          <span className="inline-block h-9 w-9 rounded-full border-4 border-ink bg-accent" aria-hidden />
          <span className="font-slab text-lg sm:text-2xl leading-none">
            Dept. of <span className="text-accent">Obsolete</span> Futures
          </span>
        </Link>
        <nav className="flex items-center gap-4 sm:gap-6 text-sm font-bold uppercase tracking-widest">
          <Link href="/#collection" className="hover:underline hidden sm:inline">
            Shirts
          </Link>
          <Link href="/about" className="hover:underline hidden sm:inline">
            About
          </Link>
          <Link href="/cart" className="btn !py-2 !px-3 text-xs">
            Cart {ready && count > 0 ? <span className="bg-accent text-ink rounded-full px-2">{count}</span> : null}
          </Link>
        </nav>
      </div>
    </header>
  );
}
