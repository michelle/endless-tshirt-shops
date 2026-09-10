"use client";

import Link from "next/link";
import { useCart } from "@/lib/CartContext";

export default function Header() {
  const { items, ready } = useCart();
  const count = ready ? items.reduce((n, i) => n + i.qty, 0) : 0;

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0b0c10]/85 backdrop-blur">
      <div className="mx-auto max-w-6xl px-5 py-4 flex items-center justify-between">
        <Link href="/" className="font-serif-display text-2xl tracking-wide">
          ✦ CONSTELLA
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <Link href="/design" className="hover:text-white/70 transition">
            Design Yours
          </Link>
          <Link href="/about" className="hidden sm:inline hover:text-white/70 transition">
            How It Works
          </Link>
          <Link href="/cart" className="relative hover:text-white/70 transition">
            Cart
            {count > 0 && (
              <span className="absolute -top-2 -right-3 grid h-4 w-4 place-items-center rounded-full bg-amber-400 text-[10px] font-bold text-black">
                {count}
              </span>
            )}
          </Link>
        </nav>
      </div>
    </header>
  );
}
