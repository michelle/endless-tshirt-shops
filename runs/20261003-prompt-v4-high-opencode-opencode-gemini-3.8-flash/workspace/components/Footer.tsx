'use client';

import React from 'react';
import { Compass, Sparkles, ShieldCheck, Heart } from 'lucide-react';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="w-full border-t border-white/10 bg-[#05070a] text-slate-400 text-xs font-mono py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand info */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full border border-amber-400/40 bg-amber-500/10 flex items-center justify-center">
                <Compass className="w-4 h-4 text-amber-400" />
              </div>
              <span className="font-serif-luxury font-bold text-white text-base tracking-[0.2em]">
                AETHEL CELESTIAL
              </span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed max-w-sm">
              Archival celestial chrono-cartography. Each shirt is custom-engineered using real astronomical algorithms, calculated for your exact coordinates and moment in time, and fulfilled on-demand via direct-to-garment technology.
            </p>
          </div>

          {/* Garment Care */}
          <div className="space-y-2">
            <span className="text-white font-bold uppercase tracking-wider block text-xs">
              DTG Care Guide
            </span>
            <ul className="space-y-1.5 text-[11px] text-slate-400">
              <li>• Machine wash cold, inside-out</li>
              <li>• Gentle cycle with mild detergent</li>
              <li>• Tumble dry low or hang dry</li>
              <li>• Do not iron directly on print</li>
              <li>• 100% Airlume combed cotton</li>
            </ul>
          </div>

          {/* Architecture */}
          <div className="space-y-2">
            <span className="text-white font-bold uppercase tracking-wider block text-xs">
              Platform Architecture
            </span>
            <ul className="space-y-1.5 text-[11px] text-slate-400">
              <li>• Print API: Prodigi v4.0</li>
              <li>• Payments: Stripe Checkout</li>
              <li>• Asset Rendering: WebAssembly SVG/PNG</li>
              <li>• Canvas Size: 4,677 × 5,881 px</li>
              <li>• Garment Blank: Bella + Canvas 3001</li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <div className="flex items-center gap-2">
            <span>© {new Date().getFullYear()} Aethel Celestial Studio. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Stripe 256-bit Encrypted
            </span>
            <span className="flex items-center gap-1 text-slate-400">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Prodigi DTG Print Ready
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
