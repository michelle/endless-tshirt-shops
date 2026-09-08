"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart-context";

export function Header() {
  const { count, ready } = useCart();

  return (
    <header className="sticky top-0 z-40 border-b-4 border-ink bg-paper/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-ink bg-stamp text-paper font-display text-[10px] leading-none">
            B.O.M.
          </div>
          <div className="leading-tight">
            <div className="font-display text-sm tracking-wide sm:text-base">
              THE BUREAU OF ORDINARY MONSTERS
            </div>
            <div className="hidden text-[11px] uppercase tracking-[0.2em] text-ink/60 sm:block">
              Paperwork for the Unexplained
            </div>
          </div>
        </Link>
        <nav className="flex items-center gap-5 font-display text-xs uppercase tracking-wide sm:text-sm">
          <Link href="/#personnel" className="hover:text-stamp">
            Personnel Files
          </Link>
          <Link href="/about" className="hover:text-stamp">
            About the Bureau
          </Link>
          <Link href="/cart" className="relative hover:text-stamp">
            Cart
            {ready && count > 0 && (
              <span className="absolute -right-3 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-stamp text-[10px] text-paper">
                {count}
              </span>
            )}
          </Link>
        </nav>
      </div>
    </header>
  );
}
