"use client";

import Link from "next/link";
import { useCart } from "./CartProvider";

export function Header() {
  const { count, hydrated } = useCart();
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0b0b0f]/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-lg font-black tracking-tight text-white">
            NIGHT SHIFT
          </span>
          <span className="rounded bg-lime-300 px-1.5 py-0.5 text-xs font-black tracking-wide text-black">
            CRYPTIDS
          </span>
        </Link>
        <nav className="flex items-center gap-6 text-sm font-medium text-zinc-300">
          <Link href="/shop" className="hover:text-white">
            Shop
          </Link>
          <Link href="/#story" className="hidden sm:inline hover:text-white">
            Our Story
          </Link>
          <Link
            href="/cart"
            className="flex items-center gap-2 rounded-full border border-white/15 px-3 py-1.5 hover:border-white/40 hover:text-white"
          >
            Cart
            <span className="min-w-5 rounded-full bg-lime-300 px-1.5 text-center text-xs font-bold text-black">
              {hydrated ? count : 0}
            </span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
