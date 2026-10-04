'use client';

import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { buildDesignSvg } from '@/lib/design-svg';
import { previewTextRenderer } from '@/lib/preview-text';
import { DESIGN_BOX, shirtSvgString } from '@/lib/shirt';
import {
  BASE_PRICE_CENTS,
  getPalette,
  getShirt,
  getSize,
  PALETTES,
  SHIRTS,
  SIZES,
  STYLES,
} from '@/lib/theme';

const NAME_IDEAS = ['Ava Chen', 'Leo Marchetti', 'Nova', 'The Okafor Family', 'Mara & Sol'];
const WORD_IDEAS = ['Become', 'Unbound', 'Steady', 'Rooted', 'Always', 'Rise'];

function stripProlog(svg: string): string {
  return svg.replace(/^<\?xml[^>]*\?>\s*/, '');
}

const VB_W = 600;
const VB_H = 700;
const DESIGN_LAYER_STYLE: React.CSSProperties = {
  left: `${(DESIGN_BOX.x / VB_W) * 100}%`,
  top: `${(DESIGN_BOX.y / VB_H) * 100}%`,
  width: `${(DESIGN_BOX.width / VB_W) * 100}%`,
  height: `${(DESIGN_BOX.height / VB_H) * 100}%`,
};

export default function Configurator() {
  const [name, setName] = useState('Ava Chen');
  const [word, setWord] = useState('Become');
  const [palette, setPalette] = useState('aurora');
  const [style, setStyle] = useState('topo');
  const [shirt, setShirt] = useState('black');
  const [size, setSize] = useState('l');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [canceled, setCanceled] = useState(false);

  const deferredName = useDeferredValue(name);
  const deferredWord = useDeferredValue(word);

  useEffect(() => {
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('canceled')) {
      setCanceled(true);
    }
  }, []);

  const designSvg = useMemo(
    () => stripProlog(buildDesignSvg({ name: deferredName, word: deferredWord, palette, style, shirt }, previewTextRenderer)),
    [deferredName, deferredWord, palette, style, shirt],
  );

  const paletteInfo = getPalette(palette);
  const shirtInfo = getShirt(shirt);
  const sizeInfo = getSize(size);
  const priceCents = BASE_PRICE_CENTS + sizeInfo.surcharge;

  function surprise() {
    const r = Math.random;
    setName(NAME_IDEAS[Math.floor(r() * NAME_IDEAS.length)]);
    setWord(WORD_IDEAS[Math.floor(r() * WORD_IDEAS.length)]);
    setPalette(PALETTES[Math.floor(r() * PALETTES.length)].id);
    setStyle(STYLES[Math.floor(r() * STYLES.length)].id);
    setShirt(SHIRTS[Math.floor(r() * SHIRTS.length)].id);
  }

  async function buy() {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, word, palette, style, shirt, size }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || 'Could not start checkout.');
      // Warm the full-resolution render while the customer pays, so Prodigi's
      // download is served from cache. keepalive lets it survive the redirect.
      if (data.token) {
        try {
          fetch(`/api/design?t=${encodeURIComponent(data.token)}`, { keepalive: true }).catch(() => {});
        } catch {
          /* ignore */
        }
      }
      window.location.href = data.url as string;
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <div className="config" id="create">
      {/* Stage */}
      <div className="stage">
        <div className="panel" style={{ padding: 14 }}>
          <div className="mockup">
            <div className="shirt-wrap" dangerouslySetInnerHTML={{ __html: shirtSvgString(shirtInfo.hex) }} />
            <div
              className="design-layer"
              style={DESIGN_LAYER_STYLE}
              dangerouslySetInnerHTML={{ __html: designSvg }}
            />
          </div>
        </div>
        <div className="stage-meta">
          <span>
            <strong>{shirtInfo.name}</strong> · Size {sizeInfo.name}
          </span>
          <span>
            {paletteInfo.name} · {STYLES.find((s) => s.id === style)?.name}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="panel">
        <div className="field">
          <label htmlFor="name">
            <span>The name in the artwork</span>
            <span className="hint">max 26 characters</span>
          </label>
          <input
            id="name"
            type="text"
            value={name}
            maxLength={26}
            placeholder="e.g. Ava Chen"
            onChange={(e) => setName(e.target.value)}
          />
          <div className="chips">
            {NAME_IDEAS.slice(0, 3).map((n) => (
              <button key={n} type="button" className="chip" onClick={() => setName(n)}>
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label htmlFor="word">
            <span>Your word</span>
            <span className="hint">optional</span>
          </label>
          <input
            id="word"
            type="text"
            value={word}
            maxLength={22}
            placeholder="e.g. Become"
            onChange={(e) => setWord(e.target.value)}
          />
        </div>

        <div className="field">
          <label>
            <span>Palette</span>
            <span className="hint">{paletteInfo.blurb}</span>
          </label>
          <div className="option-grid palettes">
            {PALETTES.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`opt ${palette === p.id ? 'active' : ''}`}
                onClick={() => setPalette(p.id)}
              >
                <span className="swatches">
                  {p.colors.map((c) => (
                    <i key={c} style={{ background: c }} />
                  ))}
                </span>
                <span className="name">{p.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>
            <span>Art style</span>
            <span className="hint">{STYLES.find((s) => s.id === style)?.blurb}</span>
          </label>
          <div className="option-grid styles">
            {STYLES.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`opt style-opt ${style === s.id ? 'active' : ''}`}
                onClick={() => setStyle(s.id)}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>
            <span>Shirt</span>
            <span className="hint">Bella+Canvas 3001 · unisex</span>
          </label>
          <div className="option-grid shirts">
            {SHIRTS.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`opt shirt-opt ${shirt === s.id ? 'active' : ''}`}
                onClick={() => setShirt(s.id)}
              >
                <span className="shirt-dot" style={{ background: s.hex }} />
                {s.name}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>
            <span>Size</span>
            <span className="hint">+$2 from 2XL</span>
          </label>
          <div className="option-grid sizes">
            {SIZES.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`opt size-opt ${size === s.id ? 'active' : ''}`}
                onClick={() => setSize(s.id)}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>

        <div className="buy-row">
          <div className="price">
            ${(priceCents / 100).toFixed(0)}
            <small>Free shipping</small>
          </div>
          <button className="btn" onClick={buy} disabled={loading || !name.trim()}>
            {loading ? 'Starting checkout…' : 'Create & buy →'}
          </button>
        </div>

        {error && <div className="error">{error}</div>}
        {canceled && !error && (
          <div className="error" style={{ color: '#ffd79a', background: 'rgba(255,190,90,0.08)', borderColor: 'rgba(255,190,90,0.25)' }}>
            Checkout canceled — your design is still here.
          </div>
        )}
        <div className="secure">
          Secure payment by Stripe · Printed &amp; shipped by Prodigi · One of one
        </div>
        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <button type="button" className="chip" onClick={surprise}>
            ✦ Surprise me
          </button>
        </div>
      </div>
    </div>
  );
}
