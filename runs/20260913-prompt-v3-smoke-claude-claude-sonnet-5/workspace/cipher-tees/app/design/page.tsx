"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import DesignArt from "@/components/DesignArt";
import ShirtMockup from "@/components/ShirtMockup";
import { useCart } from "@/components/CartStore";
import {
  MAX_PHRASE_LENGTH,
  PALETTES,
  PALETTE_IDS,
  SHIRT_COLORS,
  SHIRT_COLOR_IDS,
  SIZES,
  priceForSize,
  sanitizePhrase,
  type PaletteId,
  type ShirtColorId,
  type SizeId,
} from "@/lib/types";

export default function DesignPage() {
  const router = useRouter();
  const { addItem } = useCart();
  const [phrase, setPhrase] = useState("");
  const [paletteId, setPaletteId] = useState<PaletteId>("signal");
  const [shirtColorId, setShirtColorId] = useState<ShirtColorId>("black");
  const [size, setSize] = useState<SizeId>("m");
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const shirt = SHIRT_COLORS[shirtColorId];
  const priceCents = priceForSize(size);
  const cleanPhrase = sanitizePhrase(phrase);

  function handleAdd() {
    addItem({
      id: crypto.randomUUID(),
      spec: { phrase: cleanPhrase || "CIPHER TEES", paletteId, shirtColorId },
      size,
      qty,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  }

  return (
    <div className="container design-page">
      <div className="design-preview">
        <ShirtMockup color={shirt.hex}>
          <DesignArt spec={{ phrase: cleanPhrase, paletteId, shirtColorId }} width={210} height={260} />
        </ShirtMockup>
        <p className="hint">Live preview — the exact pattern that gets printed.</p>
      </div>

      <div className="design-form">
        <h1>Build your tee</h1>
        <p className="muted">
          Type anything — a name, a date, a lyric, an inside joke. We turn it into a
          one-of-one radial pattern, mathematically unique to those exact words.
        </p>

        <label className="field">
          <span>Your phrase</span>
          <input
            value={phrase}
            maxLength={MAX_PHRASE_LENGTH}
            onChange={(e) => setPhrase(e.target.value)}
            placeholder="e.g. BORN 04.12.1996"
          />
          <span className="char-count">
            {cleanPhrase.length}/{MAX_PHRASE_LENGTH}
          </span>
        </label>

        <fieldset className="field">
          <legend>Palette</legend>
          <div className="swatch-row">
            {PALETTE_IDS.map((id) => (
              <button
                key={id}
                type="button"
                className={`swatch ${paletteId === id ? "active" : ""}`}
                onClick={() => setPaletteId(id)}
              >
                <span className="swatch-preview">
                  {PALETTES[id].colors.map((c) => (
                    <span key={c} style={{ background: c }} />
                  ))}
                </span>
                {PALETTES[id].name}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="field">
          <legend>Shirt color</legend>
          <div className="swatch-row">
            {SHIRT_COLOR_IDS.map((id) => (
              <button
                key={id}
                type="button"
                className={`swatch ${shirtColorId === id ? "active" : ""}`}
                onClick={() => setShirtColorId(id)}
              >
                <span className="color-dot" style={{ background: SHIRT_COLORS[id].hex }} />
                {SHIRT_COLORS[id].name}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="field">
          <legend>Size</legend>
          <div className="size-row">
            {SIZES.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`size-btn ${size === s.id ? "active" : ""}`}
                onClick={() => setSize(s.id)}
              >
                {s.label}
                {s.upchargeCents > 0 ? "+" : ""}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="field qty-field">
          <span>Quantity</span>
          <input
            type="number"
            min={1}
            max={10}
            value={qty}
            onChange={(e) => setQty(Math.max(1, Math.min(10, parseInt(e.target.value, 10) || 1)))}
          />
        </label>

        <div className="price-row">
          <span>${(priceCents / 100).toFixed(2)} each</span>
        </div>

        <div className="design-actions">
          <button type="button" className="btn btn-primary" onClick={handleAdd}>
            {added ? "Added ✓" : "Add to cart"}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => router.push("/cart")}>
            View cart
          </button>
        </div>
      </div>
    </div>
  );
}
