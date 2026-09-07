"use client";
import { useState } from "react";
import Link from "next/link";
import { Design, Size, colors, formatMoney, sizes, unitPriceCents } from "@/lib/catalog";
import { useCart } from "@/lib/cart";
import { ShirtMockup } from "./ShirtMockup";

export function ProductConfigurator({ design }: { design: Design }) {
  const { add } = useCart();
  const [colorId, setColorId] = useState(colors[0].id);
  const [size, setSize] = useState<Size>("m");
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [view, setView] = useState<"shirt" | "poster">("shirt");
  const color = colors.find((c) => c.id === colorId)!;

  function addToCart() {
    add({ slug: design.slug, color: colorId, size, qty });
    setAdded(true);
    setTimeout(() => setAdded(false), 2500);
  }

  return (
    <div className="product">
      <div className="product-gallery">
        <div className="product-stage" style={{ background: design.paper }}>
          {view === "shirt" ? (
            <ShirtMockup slug={design.slug} color={color} className="product-shirt" priority />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/art/${design.slug}.png`} alt={`${design.name} poster artwork`} className="product-poster" />
          )}
        </div>
        <div className="product-thumbs" role="tablist" aria-label="View">
          <button role="tab" aria-selected={view === "shirt"} className={view === "shirt" ? "thumb active" : "thumb"} onClick={() => setView("shirt")}>
            On the shirt
          </button>
          <button role="tab" aria-selected={view === "poster"} className={view === "poster" ? "thumb active" : "thumb"} onClick={() => setView("poster")}>
            Poster artwork
          </button>
        </div>
      </div>

      <div className="product-panel">
        <div className="eyebrow">Deprecated Parks Service · Est. {design.est}</div>
        <h1 className="product-title">{design.name}</h1>
        <p className="product-tagline">{design.tagline}</p>
        <div className="product-price">
          {formatMoney(unitPriceCents(size))}
          <span className="muted"> · free of any stock, ever</span>
        </div>

        <fieldset className="field">
          <legend>
            Shirt colour: <strong>{color.name}</strong>
          </legend>
          <div className="swatches">
            {colors.map((c) => (
              <button
                key={c.id}
                type="button"
                className={c.id === colorId ? "swatch active" : "swatch"}
                style={{ background: c.hex }}
                aria-label={c.name}
                aria-pressed={c.id === colorId}
                title={c.name}
                onClick={() => setColorId(c.id)}
              />
            ))}
          </div>
        </fieldset>

        <fieldset className="field">
          <legend>
            Size: <strong>{size.toUpperCase()}</strong>{" "}
            <Link href="/about#sizing" className="muted small">
              (size guide)
            </Link>
          </legend>
          <div className="sizes">
            {sizes.map((s) => (
              <button key={s} type="button" className={s === size ? "size active" : "size"} aria-pressed={s === size} onClick={() => setSize(s)}>
                {s.toUpperCase()}
              </button>
            ))}
          </div>
          <div className="small muted">2XL and 3XL add {formatMoney(300)}.</div>
        </fieldset>

        <div className="buy-row">
          <div className="qty" aria-label="Quantity">
            <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease quantity">
              −
            </button>
            <span>{qty}</span>
            <button type="button" onClick={() => setQty((q) => Math.min(10, q + 1))} aria-label="Increase quantity">
              +
            </button>
          </div>
          <button type="button" className="btn primary" onClick={addToCart}>
            {added ? "Added to cart ✓" : "Add to cart"}
          </button>
        </div>
        {added && (
          <div className="added-note">
            <Link href="/cart">View cart →</Link>
          </div>
        )}

        <div className="product-story">
          <h2>From the park brochure</h2>
          <p>{design.story}</p>
        </div>
        <div className="product-details">
          <h2>The shirt</h2>
          <ul>
            <li>Gildan 64000 Softstyle, unisex fit, 100% ring-spun cotton (sport grey is a cotton blend).</li>
            <li>Direct-to-garment print, about 11 inches wide on the chest.</li>
            <li>Printed to order by Prodigi in the lab closest to you and shipped in 2–5 business days plus transit.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
