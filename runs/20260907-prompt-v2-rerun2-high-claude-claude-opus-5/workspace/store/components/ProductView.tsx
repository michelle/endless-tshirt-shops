"use client";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useCart } from "./CartProvider";
import {
  GARMENTS, SIZES, SIZE_LABEL, PRICE_CENTS, money, mockupSrc, artSrc,
  type Saint,
} from "@/lib/catalog";

export function ProductView({ saint }: { saint: Saint }) {
  const [color, setColor] = useState(GARMENTS[0].id);
  const [size, setSize] = useState<string>("");
  const [view, setView] = useState<"mock" | "art">("mock");
  const [added, setAdded] = useState(false);
  const cart = useCart();

  const g = useMemo(() => GARMENTS.find((x) => x.id === color)!, [color]);

  function add() {
    if (!size) return;
    cart.add({ slug: saint.slug, color, size, qty: 1 });
    setAdded(true);
    setTimeout(() => setAdded(false), 2600);
  }

  return (
    <div className="wrap product">
      <div>
        <div className="stage">
          {view === "mock" ? (
            <Image
              key={color}
              src={mockupSrc(saint.slug, color)}
              alt={`${saint.name} tee in ${g.label}`}
              width={1200} height={1200} priority
            />
          ) : (
            <div style={{ background: g.hex, padding: "6% 12%" }}>
              <Image
                src={artSrc(saint.slug, g.tone)}
                alt={`${saint.name} artwork`}
                width={900} height={1170}
              />
            </div>
          )}
        </div>
        <div className="thumbs">
          <button aria-pressed={view === "mock"} onClick={() => setView("mock")} title="On the shirt">
            <Image src={mockupSrc(saint.slug, color)} alt="" width={132} height={132} />
          </button>
          <button aria-pressed={view === "art"} onClick={() => setView("art")} title="The plate"
            style={{ background: g.hex, display: "grid", placeItems: "center" }}>
            <Image src={artSrc(saint.slug, g.tone)} alt="" width={90} height={117}
              style={{ width: "78%", height: "auto" }} />
          </button>
        </div>
      </div>

      <div>
        <div className="caps muted">Plate no. {String(saint.order).padStart(2, "0")} of 08</div>
        <h1 className="title">{saint.name}</h1>
        <p className="sub">&ldquo;{saint.invocation.join(" ")}&rdquo;</p>
        <div style={{ fontSize: "1.24rem", marginBottom: 4 }}>{money(PRICE_CENTS)}</div>
        <div className="muted" style={{ fontSize: ".9rem" }}>Shipping calculated at checkout.</div>

        <div className="field-label">
          <span className="caps">Colour</span>
          <span className="muted" style={{ fontSize: ".88rem" }}>{g.label}</span>
        </div>
        <div className="swatches">
          {GARMENTS.map((x) => (
            <button key={x.id} className="swatch" title={x.label} aria-label={x.label}
              aria-pressed={x.id === color} style={{ background: x.hex }}
              onClick={() => setColor(x.id)} />
          ))}
        </div>

        <div className="field-label">
          <span className="caps">Size</span>
          <span className="muted" style={{ fontSize: ".88rem" }}>Unisex fit</span>
        </div>
        <div className="sizes">
          {SIZES.map((s) => (
            <button key={s} className="size" aria-pressed={s === size} onClick={() => setSize(s)}>
              {SIZE_LABEL[s]}
            </button>
          ))}
        </div>

        <div style={{ marginTop: 26 }}>
          <button className="btn wide" onClick={add} disabled={!size}>
            {size ? "Add to cart" : "Choose a size"}
          </button>
        </div>
        {added && (
          <p className="notice good" style={{ marginTop: 14 }}>
            Added. <Link href="/cart">Go to the cart →</Link>
          </p>
        )}

        <p style={{ marginTop: 28 }}>{saint.blurb}</p>

        <div className="spec">
          <dl>
            <dt>Garment</dt><dd>Gildan 64000 softstyle, 100% ring-spun cotton, 150gsm</dd>
            <dt>Print</dt><dd>Direct-to-garment, front chest, 300&nbsp;dpi</dd>
            <dt>Fit</dt><dd>Unisex, true to size. Size up for a relaxed drape.</dd>
            <dt>Care</dt><dd>Wash cold inside out, tumble low, no bleach</dd>
            <dt>Made</dt><dd>Printed to order at the press nearest you</dd>
            <dt>Feast</dt><dd>{saint.feastDay.replace(/^Feast day: /, "")}</dd>
          </dl>
        </div>
      </div>
    </div>
  );
}
