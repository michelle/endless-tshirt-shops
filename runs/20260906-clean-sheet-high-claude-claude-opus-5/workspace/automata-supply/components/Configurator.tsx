"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ShirtMockup } from "./ShirtMockup";
import { useCart } from "./CartContext";
import { artUrl } from "@/lib/art";
import { formatUsd, priceFor } from "@/lib/catalog";
import {
  GARMENTS,
  INKS,
  SIZES,
  designSubtitle,
  designTitle,
  inkFitsGarment,
  inksForGarment,
  type Design,
  type InkId,
  type SizeId,
} from "@/lib/design";

export function Configurator({
  design: initialDesign,
  garmentId: initialGarment,
  title,
}: {
  design: Design;
  garmentId: string;
  title: string;
}) {
  const router = useRouter();
  const cart = useCart();

  const [garmentId, setGarmentId] = useState(initialGarment);
  const [ink, setInk] = useState<InkId>(initialDesign.ink);
  const [size, setSize] = useState<SizeId>("m");
  const [added, setAdded] = useState(false);

  const design: Design = useMemo(() => ({ ...initialDesign, ink }), [initialDesign, ink]);
  const availableInks = useMemo(() => inksForGarment(garmentId), [garmentId]);
  const price = priceFor(design, size);

  function pickGarment(nextGarment: string) {
    setGarmentId(nextGarment);
    setAdded(false);
    // Swapping to a light garment would leave a white-on-white print, so move
    // to the closest ink that still reads on the new fabric.
    if (!inkFitsGarment(ink, nextGarment)) {
      setInk(inksForGarment(nextGarment)[0].id);
    }
  }

  function addToCart() {
    cart.add({ design, size, garmentId, qty: 1, name: title });
    setAdded(true);
  }

  return (
    <div className="product">
      <div className="product-stage">
        <ShirtMockup
          artUrl={artUrl(design, 900)}
          garmentId={garmentId}
          alt={`${title} printed on a ${garmentId} t-shirt`}
        />
      </div>

      <div>
        <h1 className="product-title">{designTitle(design)}</h1>
        <p className="product-tag">{designSubtitle(design)}</p>
        <p className="price-line mono">{formatUsd(price)}</p>

        <div className="field">
          <div className="field-label">
            <span>Garment</span>
            <b>{GARMENTS.find((g) => g.id === garmentId)?.name}</b>
          </div>
          <div className="swatches">
            {GARMENTS.map((g) => (
              <button
                key={g.id}
                type="button"
                className="swatch"
                style={{ background: g.hex }}
                aria-pressed={g.id === garmentId}
                aria-label={g.name}
                title={g.name}
                onClick={() => pickGarment(g.id)}
              />
            ))}
          </div>
        </div>

        <div className="field">
          <div className="field-label">
            <span>Ink</span>
            <b>{INKS[ink].name}</b>
          </div>
          <div className="chips">
            {availableInks.map((i) => (
              <button
                key={i.id}
                type="button"
                className="chip"
                aria-pressed={i.id === ink}
                onClick={() => {
                  setInk(i.id);
                  setAdded(false);
                }}
              >
                {i.name}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <div className="field-label">
            <span>Size</span>
            <b>{SIZES.find((s) => s.id === size)?.label}</b>
          </div>
          <div className="chips">
            {SIZES.map((s) => (
              <button
                key={s.id}
                type="button"
                className="chip"
                aria-pressed={s.id === size}
                onClick={() => {
                  setSize(s.id);
                  setAdded(false);
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="row" style={{ marginTop: 28 }}>
          <button type="button" className="btn btn-primary" onClick={addToCart}>
            {added ? "Added ✓" : "Add to cart"}
          </button>
          {added ? (
            <button type="button" className="btn" onClick={() => router.push("/cart")}>
              Checkout
            </button>
          ) : null}
        </div>

        <div className="spec">
          <div>
            <span>Rule</span>
            <span>
              {design.rule} &middot; {design.rule.toString(2).padStart(8, "0")}
            </span>
          </div>
          <div>
            <span>Initial row</span>
            <span>{design.seeding === "single" ? "Single live cell" : `Seed ${design.seed}`}</span>
          </div>
          <div>
            <span>Lattice</span>
            <span>
              {design.cells} &times; {design.cells} cells, periodic
            </span>
          </div>
          <div>
            <span>Garment</span>
            <span>Gildan 64000, 100% ring-spun cotton</span>
          </div>
          <div>
            <span>Print</span>
            <span>DTG front, ~250 dpi, transparent ground</span>
          </div>
          <div>
            <span>Made</span>
            <span>On demand, printed after you order</span>
          </div>
        </div>
      </div>
    </div>
  );
}
