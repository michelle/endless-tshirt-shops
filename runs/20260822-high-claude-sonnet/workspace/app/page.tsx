"use client";

import { useState } from "react";
import Shirt from "./Shirt";
import Checkout from "./Checkout";
import type { ShirtSize, ShirtStyle } from "@/lib/products";
import { STYLE_LABELS } from "@/lib/products";

const SIZES: ShirtSize[] = ["S", "M", "L", "XL"];
const STYLES: ShirtStyle[] = ["fitted", "unisex"];

export default function Home() {
  const [style, setStyle] = useState<ShirtStyle>("fitted");
  const [size, setSize] = useState<ShirtSize>("M");

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col px-6 py-10 sm:py-16">
      <header className="mb-10">
        <h1 className="text-3xl font-light tracking-tight sm:text-4xl">
          datetime.store
        </h1>
        <h2 className="mt-2 text-lg text-accent">
          we sell a t-shirt with the current datetime. ⏱
        </h2>
      </header>

      <div className="grid grid-cols-1 gap-10 sm:grid-cols-2">
        <div className="flex items-center justify-center rounded-xl bg-neutral-50 p-8">
          <Shirt style={style} />
        </div>

        <div className="flex flex-col">
          <p className="mb-6 text-sm leading-relaxed text-neutral-600">
            Every shirt is printed on demand with the exact millisecond
            timestamp captured the moment you check out. No two shirts are
            ever the same. DTG printed, shipped free, arrives in about a
            week.
          </p>

          <fieldset className="mb-4">
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Style
            </legend>
            <div className="flex gap-2">
              {STYLES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStyle(s)}
                  className={`flex-1 rounded py-2 text-sm font-medium transition ${
                    style === s
                      ? "bg-black text-white"
                      : "bg-accentLight text-black hover:opacity-80"
                  }`}
                >
                  {STYLE_LABELS[s]}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="mb-6">
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Size
            </legend>
            <div className="flex gap-2">
              {SIZES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSize(s)}
                  className={`flex-1 rounded py-2 text-sm font-medium transition ${
                    size === s
                      ? "bg-black text-white"
                      : "bg-accentLight text-black hover:opacity-80"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="mb-6 flex items-baseline gap-2">
            <span className="text-2xl font-semibold">$22.50</span>
            <span className="text-neutral-400 line-through">$30.00</span>
            <span className="text-sm text-neutral-500">· free shipping</span>
          </div>

          <Checkout style={style} size={size} />
        </div>
      </div>

      <footer className="mt-16 text-center text-xs text-neutral-400">
        datetime.store — a shirt for right now. Test mode: no real charges.
      </footer>
    </main>
  );
}
