"use client";
import { useState } from "react";
import Link from "next/link";
import { COLORS, SIZES, formatPrice, PRICE_CENTS, type Product, type SizeId } from "@/lib/catalog";
import { useCart } from "@/lib/cart";
import { ShirtMockup, DesignPreview } from "./ShirtMockup";

export function Configurator({ product }: { product: Product }) {
  const { add } = useCart();
  const [colorId, setColorId] = useState(product.defaultColor);
  const [size, setSize] = useState<SizeId | null>(null);
  const [view, setView] = useState<"shirt" | "seal">("shirt");
  const [added, setAdded] = useState(false);
  const colors = COLORS.filter((c) => product.colors.includes(c.id));

  function addToCart() {
    if (!size) return;
    add({ slug: product.slug, color: colorId, size, qty: 1 });
    setAdded(true);
    setTimeout(() => setAdded(false), 2500);
  }

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <div>
        <div className="card p-4">
          {view === "shirt" ? (
            <ShirtMockup product={product} colorId={colorId} idPrefix={`cfg-${product.slug}`} className="w-full" />
          ) : (
            <DesignPreview product={product} colorId={colorId} idPrefix={`cfgseal-${product.slug}`} className="p-6" />
          )}
        </div>
        <div className="mt-4 flex gap-2 text-xs">
          <button className="chip" aria-pressed={view === "shirt"} onClick={() => setView("shirt")}>
            On shirt
          </button>
          <button className="chip" aria-pressed={view === "seal"} onClick={() => setView("seal")}>
            Seal detail
          </button>
        </div>
      </div>

      <div>
        <p className="stamp mb-4">Est. {product.established}</p>
        <h1 className="font-slab text-3xl sm:text-5xl leading-tight">{product.bureau}</h1>
        <p className="mt-2 text-accent font-bold uppercase tracking-widest text-sm">{product.tagline}</p>
        <p className="mt-4 text-ink-2">{product.blurb}</p>
        <p className="mt-6 font-slab text-3xl">{formatPrice(PRICE_CENTS)}</p>

        <div className="mt-8">
          <p className="text-xs font-bold uppercase tracking-widest mb-3">
            Colour: <span className="text-accent">{colors.find((c) => c.id === colorId)?.label}</span>
          </p>
          <div className="flex flex-wrap gap-3">
            {colors.map((c) => (
              <button
                key={c.id}
                className="swatch"
                style={{ background: c.hex }}
                aria-label={c.label}
                aria-pressed={c.id === colorId}
                title={c.label}
                onClick={() => setColorId(c.id)}
              />
            ))}
          </div>
        </div>

        <div className="mt-8">
          <p className="text-xs font-bold uppercase tracking-widest mb-3">
            Size {size ? <span className="text-accent">{SIZES.find((s) => s.id === size)?.label}</span> : <span className="text-ink-2">— choose one</span>}
          </p>
          <div className="flex flex-wrap gap-2">
            {SIZES.map((s) => (
              <button key={s.id} className="chip" aria-pressed={s.id === size} onClick={() => setSize(s.id)}>
                {s.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-ink-2">
            Unisex fit, true to size. <Link href="/about#sizing" className="underline">Size chart</Link>
          </p>
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-4">
          <button className="btn" onClick={addToCart} disabled={!size}>
            {added ? "Added ✓" : size ? "Add to cart" : "Select a size"}
          </button>
          {added ? (
            <Link href="/cart" className="underline font-bold">
              View cart →
            </Link>
          ) : null}
        </div>

        <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-3 text-sm dashed p-4">
          <dt className="font-bold">Garment</dt>
          <dd>Bella+Canvas 3001, 100% ring-spun cotton, 4.2 oz</dd>
          <dt className="font-bold">Print</dt>
          <dd>Direct-to-garment, front chest, 12in wide</dd>
          <dt className="font-bold">Made</dt>
          <dd>To order, at the print lab nearest you</dd>
          <dt className="font-bold">Dispatch</dt>
          <dd>2–5 business days, tracked</dd>
        </dl>
      </div>
    </div>
  );
}
