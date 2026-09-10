"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import TshirtMockup from "@/components/TshirtMockup";
import DesignCanvas from "@/components/DesignCanvas";
import { PALETTES } from "@/lib/palettes";
import { SHIRT_COLORS, SIZES, PHRASE_MAX_LEN, SUBTITLE_MAX_LEN, priceForSize } from "@/lib/products";
import { useCart } from "@/lib/CartContext";

export default function DesignPage() {
  const [phrase, setPhrase] = useState("Your Name");
  const [subtitle, setSubtitle] = useState("");
  const [paletteKey, setPaletteKey] = useState(PALETTES[0].key);
  const [colorKey, setColorKey] = useState(SHIRT_COLORS[0].key);
  const [sizeKey, setSizeKey] = useState("m");
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const cart = useCart();
  const color = SHIRT_COLORS.find((c) => c.key === colorKey);
  const priceCents = useMemo(() => priceForSize(sizeKey), [sizeKey]);

  function handleAdd() {
    cart.addItem({
      phrase: phrase.trim() || "Your Name",
      subtitle: subtitle.trim(),
      paletteKey,
      colorKey,
      sizeKey,
      qty,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 3500);
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-12 grid md:grid-cols-2 gap-12">
      <div className="md:sticky md:top-24 self-start">
        <TshirtMockup colorHex={color.hex} className="max-w-md mx-auto">
          <DesignCanvas
            phrase={phrase}
            subtitle={subtitle}
            paletteKey={paletteKey}
            shirtIsDark={color.dark}
            resolution={700}
          />
        </TshirtMockup>
        <p className="text-center text-xs text-white/40 mt-4">
          Preview is stylized. Your exact artwork is generated fresh at full print resolution.
        </p>
      </div>

      <div>
        <h1 className="font-serif-display text-4xl mb-1">Design Your Constellation</h1>
        <p className="text-white/60 mb-8">
          Same words always generate the same sky — so you can always reorder it later.
        </p>

        <label className="block mb-6">
          <span className="text-sm text-white/70">Name, phrase, or word *</span>
          <input
            value={phrase}
            maxLength={PHRASE_MAX_LEN}
            onChange={(e) => setPhrase(e.target.value)}
            placeholder="e.g. Grace & Leo"
            className="mt-2 w-full rounded-lg bg-white/5 border border-white/15 px-4 py-3 outline-none focus:border-amber-300"
          />
          <span className="text-xs text-white/35">{phrase.length}/{PHRASE_MAX_LEN}</span>
        </label>

        <label className="block mb-8">
          <span className="text-sm text-white/70">Subtitle — a date, place, or label (optional)</span>
          <input
            value={subtitle}
            maxLength={SUBTITLE_MAX_LEN}
            onChange={(e) => setSubtitle(e.target.value)}
            placeholder="e.g. 06.14.2019 or Brooklyn, NY"
            className="mt-2 w-full rounded-lg bg-white/5 border border-white/15 px-4 py-3 outline-none focus:border-amber-300"
          />
          <span className="text-xs text-white/35">{subtitle.length}/{SUBTITLE_MAX_LEN}</span>
        </label>

        <div className="mb-8">
          <span className="text-sm text-white/70 block mb-3">Palette</span>
          <div className="flex flex-wrap gap-3">
            {PALETTES.map((p) => (
              <button
                key={p.key}
                onClick={() => setPaletteKey(p.key)}
                className={`h-11 w-11 rounded-full border-2 transition ${
                  paletteKey === p.key ? "border-amber-300 scale-110" : "border-white/20"
                }`}
                style={{ background: p.swatch }}
                title={p.name}
                aria-label={p.name}
              />
            ))}
          </div>
        </div>

        <div className="mb-8">
          <span className="text-sm text-white/70 block mb-3">Shirt Color</span>
          <div className="flex flex-wrap gap-3">
            {SHIRT_COLORS.map((c) => (
              <button
                key={c.key}
                onClick={() => setColorKey(c.key)}
                className={`h-11 w-11 rounded-full border-2 transition ${
                  colorKey === c.key ? "border-amber-300 scale-110" : "border-white/20"
                }`}
                style={{ background: c.hex }}
                title={c.name}
                aria-label={c.name}
              />
            ))}
          </div>
        </div>

        <div className="mb-8">
          <span className="text-sm text-white/70 block mb-3">Size</span>
          <div className="flex flex-wrap gap-2">
            {SIZES.map((s) => (
              <button
                key={s.key}
                onClick={() => setSizeKey(s.key)}
                className={`rounded-lg border px-4 py-2 text-sm transition ${
                  sizeKey === s.key
                    ? "border-amber-300 bg-amber-300 text-black font-semibold"
                    : "border-white/20 hover:border-white/40"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-white/35 mt-2">2XL–5XL add $4 for extra fabric.</p>
        </div>

        <div className="mb-8 flex items-center gap-4">
          <span className="text-sm text-white/70">Quantity</span>
          <div className="flex items-center border border-white/20 rounded-lg">
            <button
              className="px-3 py-2 hover:bg-white/10"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
            >
              −
            </button>
            <span className="px-4">{qty}</span>
            <button
              className="px-3 py-2 hover:bg-white/10"
              onClick={() => setQty((q) => Math.min(10, q + 1))}
            >
              +
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 px-5 py-4 mb-6">
          <span className="text-white/70">Price</span>
          <span className="text-2xl font-semibold">
            ${((priceCents * qty) / 100).toFixed(2)}
          </span>
        </div>

        <button
          onClick={handleAdd}
          className="w-full rounded-full bg-amber-300 text-black font-semibold py-3.5 hover:bg-amber-200 transition"
        >
          Add to Cart
        </button>

        {added && (
          <div className="mt-4 rounded-lg border border-emerald-400/40 bg-emerald-400/10 px-4 py-3 text-sm flex items-center justify-between">
            <span>Added to cart.</span>
            <Link href="/cart" className="underline font-medium">
              View Cart →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
