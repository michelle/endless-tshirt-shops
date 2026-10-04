'use client';

import React from 'react';
import Link from 'next/link';
import { Sparkles, Compass, Truck, Search, ShieldCheck } from 'lucide-react';

interface NavbarProps {
  onOpenTracker?: () => void;
}

export function Navbar({ onOpenTracker }: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-[#080a0f]/85 border-b border-white/10">
      {/* Top micro announcement banner */}
      <div className="bg-gradient-to-r from-amber-500/10 via-purple-500/15 to-blue-500/10 text-amber-200/90 py-1.5 px-4 text-xs font-mono tracking-wider text-center border-b border-amber-500/10 flex items-center justify-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
        <span>1-OF-1 BESPOKE DTG PRINTING • PRODIGI PRINT API GLOBAL FULFILLMENT • SECURE STRIPE CHECKOUT</span>
        <Sparkles className="w-3.5 h-3.5 text-amber-400 hidden sm:inline" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-full border border-amber-400/40 bg-amber-500/10 flex items-center justify-center group-hover:border-amber-400 transition-colors shadow-[0_0_15px_rgba(212,175,55,0.15)]">
            <Compass className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif-luxury font-bold text-lg sm:text-xl tracking-[0.25em] text-white">
                AETHEL
              </span>
              <span className="text-[10px] tracking-widest uppercase px-1.5 py-0.5 rounded bg-amber-400/15 border border-amber-400/30 text-amber-300 font-mono">
                DTG STUDIO
              </span>
            </div>
            <p className="text-[10px] tracking-wider text-slate-400 uppercase font-mono hidden sm:block">
              Bespoke Celestial Chrono-Apparel
            </p>
          </div>
        </Link>

        {/* Value props & actions */}
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="hidden md:flex items-center gap-6 text-xs text-slate-300 font-mono">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              100% Ringspun Cotton (BC 3001)
            </span>
            <span className="flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-sky-400" />
              Direct Global Shipping
            </span>
          </div>

          {onOpenTracker && (
            <button
              onClick={onOpenTracker}
              className="flex items-center gap-2 text-xs font-mono px-3.5 py-2 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 text-slate-200 transition-all hover:border-amber-400/50"
            >
              <Search className="w-3.5 h-3.5 text-amber-400" />
              <span>Track Order</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
