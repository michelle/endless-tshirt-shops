'use client';

import { useState } from 'react';
import Link from 'next/link';
import Tee from '@/components/Tee';
import { artPath } from '@/lib/catalog';
import { useCart } from '@/components/CartProvider';
import {
  COLORS, PLUS_SIZES, PLUS_SIZE_SURCHARGE_CENTS, SIZES, SIZE_CHART, SIZE_LABEL,
  type Design, money, unitPriceCents,
} from '@/lib/catalog';

export default function ProductView({ design }: { design: Design }) {
  const [color, setColor] = useState(COLORS[0].id);
  const [size, setSize] = useState<string>('');
  const [qty, setQty] = useState(1);
  const [view, setView] = useState<'front' | 'back' | 'art'>('front');
  const [added, setAdded] = useState(false);
  const cart = useCart();

  const price = unitPriceCents(size || 'm');
  const chart = size ? SIZE_CHART[size] : null;

  function add() {
    if (!size) return;
    cart.add({ slug: design.slug, color, size, qty });
    setAdded(true);
    setTimeout(() => setAdded(false), 2600);
  }

  return (
    <div className="pdp">
      <div>
        <div className="pdp-media">
          {view === 'art' ? (
            <div style={{ background: COLORS.find((c) => c.id === color)?.hex, padding: '9%' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={artPath(design.slug, color)} alt={`${design.trade} crest artwork`} />
            </div>
          ) : (
            <Tee slug={design.slug} colorId={color} back={view === 'back'} />
          )}
        </div>
        <div className="pdp-thumbs">
          <button className="pdp-thumb" aria-pressed={view === 'front'} onClick={() => setView('front')}>
            <Tee slug={design.slug} colorId={color} />
            <div className="eyebrow" style={{ textAlign: 'center', marginTop: 2 }}>Front</div>
          </button>
          <button className="pdp-thumb" aria-pressed={view === 'back'} onClick={() => setView('back')}>
            <Tee slug={design.slug} colorId={color} back />
            <div className="eyebrow" style={{ textAlign: 'center', marginTop: 2 }}>Back</div>
          </button>
          <button className="pdp-thumb" aria-pressed={view === 'art'} onClick={() => setView('art')}>
            <div style={{ background: COLORS.find((c) => c.id === color)?.hex, aspectRatio: '1', display: 'grid', placeItems: 'center', padding: '8%' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={artPath(design.slug, color)} alt="" />
            </div>
            <div className="eyebrow" style={{ textAlign: 'center', marginTop: 2 }}>Crest</div>
          </button>
        </div>
      </div>

      <div>
        <div className="eyebrow">{design.local} · {design.years}</div>
        <h1>{design.trade}</h1>
        <p className="motto">“{design.motto}”</p>
        <p className="blurb">{design.blurb}</p>
        <p className="fact">{design.fact}</p>

        <div className="price-row">
          <span className="price">{money(price)}</span>
          <span className="price-note">Free worldwide shipping · duties not included</span>
        </div>

        <div className="opt">
          <div className="opt-label">
            <span className="eyebrow">Colour</span>
            <span className="card-meta">{COLORS.find((c) => c.id === color)?.name}</span>
          </div>
          <div className="swatches">
            {COLORS.map((c) => (
              <button key={c.id} className="swatch" style={{ background: c.hex }}
                      aria-pressed={color === c.id} aria-label={c.name} title={c.name}
                      onClick={() => setColor(c.id)} />
            ))}
          </div>
        </div>

        <div className="opt">
          <div className="opt-label">
            <span className="eyebrow">Size</span>
            <span className="card-meta">
              {chart ? `${chart[0]}" chest · ${chart[1]}" length` : 'Unisex fit'}
            </span>
          </div>
          <div className="sizes">
            {SIZES.map((s) => (
              <button key={s} className="size" aria-pressed={size === s} onClick={() => setSize(s)}>
                {SIZE_LABEL[s]}
                {PLUS_SIZES.includes(s) && (
                  <span style={{ fontSize: 10, opacity: 0.7 }}> +{money(PLUS_SIZE_SURCHARGE_CENTS)}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="add-row">
          <div className="qty">
            <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease quantity">−</button>
            <span>{qty}</span>
            <button onClick={() => setQty((q) => Math.min(10, q + 1))} aria-label="Increase quantity">+</button>
          </div>
          <button className="btn btn-ink" onClick={add} disabled={!size}>
            {size ? `Add to cart — ${money(price * qty)}` : 'Choose a size'}
          </button>
        </div>

        {added && (
          <div className="notice good">
            Added. <Link href="/cart" style={{ textDecoration: 'underline' }}>Go to cart →</Link>
          </div>
        )}

        <div className="spec">
          <dl>
            <dt>Garment</dt><dd>Gildan 64000 Softstyle, unisex, 100% ringspun cotton</dd>
            <dt>Print</dt><dd>Direct to garment, 12&quot; front, two inks at 300 dpi</dd>
            <dt>Made</dt><dd>Printed to order at the print works nearest you</dd>
            <dt>Dispatch</dt><dd>Typically 2–4 working days</dd>
            <dt>Care</dt><dd>Wash cold inside out, tumble low, do not iron the print</dd>
          </dl>
        </div>
      </div>
    </div>
  );
}
