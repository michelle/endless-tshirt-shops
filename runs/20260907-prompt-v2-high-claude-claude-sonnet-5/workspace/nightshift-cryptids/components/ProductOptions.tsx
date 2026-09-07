"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SHIRT_COLORS, SHIRT_SIZES, type Design } from "@/lib/designs";
import { useCart } from "./CartProvider";
import { ShirtMockup } from "./ShirtMockup";

export function ProductOptions({ design }: { design: Design }) {
  const [color, setColor] = useState(SHIRT_COLORS[0]);
  const [size, setSize] = useState(SHIRT_SIZES[1].key);
  const [qty, setQty] = useState(1);
  const [justAdded, setJustAdded] = useState(false);
  const { add } = useCart();
  const router = useRouter();

  const artSrc = useMemo(
    () => `/art/${design.slug}-preview.png`,
    [design.slug]
  );

  function handleAdd() {
    add({
      slug: design.slug,
      name: design.name,
      jobTitle: design.jobTitle,
      price: design.price,
      color: color.key,
      size,
      qty,
    });
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1800);
  }

  return (
    <div className="grid gap-10 sm:grid-cols-2">
      <ShirtMockup
        colorHex={color.hex}
        colorKey={color.key}
        artSrc={artSrc}
        alt={`${design.name} tee, ${color.label}`}
      />

      <div>
        <h1 className="text-3xl font-black tracking-tight text-white">
          {design.name}
        </h1>
        <p className="text-lime-300">{design.jobTitle}</p>
        <p className="mt-4 text-xl font-semibold text-white">
          ${design.price}
        </p>
        <p className="mt-4 text-zinc-400">{design.blurb}</p>

        <div className="mt-8">
          <p className="mb-2 text-sm font-semibold text-zinc-300">
            Color: <span className="text-white">{color.label}</span>
          </p>
          <div className="flex gap-2">
            {SHIRT_COLORS.map((c) => (
              <button
                key={c.key}
                onClick={() => setColor(c)}
                aria-label={c.label}
                className={`h-9 w-9 rounded-full border-2 transition ${
                  color.key === c.key
                    ? "border-lime-300 scale-110"
                    : "border-white/20"
                }`}
                style={{ backgroundColor: c.hex }}
              />
            ))}
          </div>
        </div>

        <div className="mt-6">
          <p className="mb-2 text-sm font-semibold text-zinc-300">Size</p>
          <div className="flex flex-wrap gap-2">
            {SHIRT_SIZES.map((s) => (
              <button
                key={s.key}
                onClick={() => setSize(s.key)}
                className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition ${
                  size === s.key
                    ? "border-lime-300 bg-lime-300/10 text-lime-300"
                    : "border-white/15 text-zinc-300 hover:border-white/40"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <p className="text-sm font-semibold text-zinc-300">Qty</p>
          <div className="flex items-center rounded-lg border border-white/15">
            <button
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="px-3 py-1.5 text-zinc-300 hover:text-white"
            >
              −
            </button>
            <span className="w-8 text-center text-white">{qty}</span>
            <button
              onClick={() => setQty((q) => Math.min(10, q + 1))}
              className="px-3 py-1.5 text-zinc-300 hover:text-white"
            >
              +
            </button>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button
            onClick={handleAdd}
            className="rounded-full bg-lime-300 px-6 py-3 font-bold text-black transition hover:bg-lime-200"
          >
            {justAdded ? "Added ✓" : "Add to cart"}
          </button>
          <button
            onClick={() => {
              handleAdd();
              router.push("/cart");
            }}
            className="rounded-full border border-white/20 px-6 py-3 font-bold text-white transition hover:border-white/40"
          >
            Buy now
          </button>
        </div>

        <p className="mt-6 text-xs text-zinc-500">
          Printed on demand on a Gildan 64000 unisex softstyle tee &middot;
          ships worldwide via Prodigi &middot; sandbox storefront, no real
          charge is made at checkout.
        </p>
      </div>
    </div>
  );
}
