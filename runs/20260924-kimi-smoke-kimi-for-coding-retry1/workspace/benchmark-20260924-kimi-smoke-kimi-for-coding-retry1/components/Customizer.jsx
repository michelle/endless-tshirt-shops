'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { drawPreview } from '@/lib/renderCanvas';
import { SHIRT_COLORS, SHIRT_SIZES, designKey } from '@/lib/scene';
import { usd, SHIRT_PRICE_CENTS, SHIPPING_CENTS, FREE_SHIPPING_OVER_CENTS } from '@/lib/pricing';

const COMMON_TZ = [
  'UTC',
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Anchorage', 'America/Sao_Paulo', 'America/Mexico_City', 'America/Toronto',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Madrid', 'Europe/Rome',
  'Europe/Amsterdam', 'Europe/Stockholm', 'Europe/Athens', 'Europe/Moscow',
  'Africa/Cairo', 'Africa/Lagos', 'Africa/Johannesburg',
  'Asia/Dubai', 'Asia/Karachi', 'Asia/Kolkata', 'Asia/Bangkok', 'Asia/Shanghai',
  'Asia/Tokyo', 'Asia/Seoul', 'Australia/Sydney', 'Australia/Perth',
  'Pacific/Auckland', 'Pacific/Honolulu',
];

function deviceTz() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

function defaultDesign() {
  const now = new Date();
  const iso = now.toISOString().slice(0, 10);
  return {
    date: iso,
    time: '22:00',
    tz: deviceTz(),
    lat: 40.7128,
    lng: -74.006,
    place: 'NEW YORK, USA',
    msg: 'the night we met',
    color: 'black',
    size: 'm',
    qty: 1,
  };
}

export default function Customizer() {
  const [design, setDesign] = useState(defaultDesign);
  const [geoOpen, setGeoOpen] = useState(false);
  const [geoQuery, setGeoQuery] = useState('');
  const [geoResults, setGeoResults] = useState([]);
  const [added, setAdded] = useState(false);
  const canvasRef = useRef(null);
  const raf = useRef(0);

  const patch = (p) => setDesign((d) => ({ ...d, ...p }));

  // live preview
  useEffect(() => {
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      try {
        drawPreview(canvas, design);
      } catch (e) {
        console.error('preview error', e);
      }
    });
    return () => cancelAnimationFrame(raf.current);
  }, [design]);

  // "added" flash reset
  useEffect(() => {
    if (!added) return;
    const t = setTimeout(() => setAdded(false), 1600);
    return () => clearTimeout(t);
  }, [added]);

  const totals = useMemo(() => {
    const subtotal = design.qty * SHIRT_PRICE_CENTS;
    const shipping = subtotal >= FREE_SHIPPING_OVER_CENTS ? 0 : SHIPPING_CENTS;
    return { subtotal, shipping, total: subtotal + shipping };
  }, [design.qty]);

  async function runGeocode(q) {
    setGeoQuery(q);
    if (q.trim().length < 2) { setGeoResults([]); return; }
    try {
      const res = await fetch('/api/geocode?q=' + encodeURIComponent(q));
      const data = await res.json();
      setGeoResults(data.results || []);
    } catch {
      setGeoResults([]);
    }
  }

  function pickPlace(r) {
    const short = r.label.split(',').slice(0, 2).join(',').trim();
    patch({ lat: r.lat, lng: r.lng, place: short.toUpperCase() });
    setGeoOpen(false);
    setGeoResults([]);
  }

  function addToCart() {
    const cart = JSON.parse(localStorage.getItem('skywriter_cart') || '[]');
    cart.push({ id: designKey(design) + '-' + Date.now(), design: { ...design } });
    localStorage.setItem('skywriter_cart', JSON.stringify(cart));
    window.__swRefreshCart && window.__swRefreshCart();
    setAdded(true);
  }

  return (
    <div className="customize" id="customize">
      <div className="panel">
        <h2>Chart your sky</h2>
        <p className="hint">Any moment, anywhere on Earth — we compute the real stars that were overhead.</p>

        <div className="row">
          <div className="field">
            <label>Date</label>
            <input type="date" value={design.date} onChange={(e) => patch({ date: e.target.value })} />
          </div>
          <div className="field">
            <label>Local time</label>
            <input type="time" value={design.time} onChange={(e) => patch({ time: e.target.value })} />
          </div>
        </div>

        <div className="field">
          <label>Timezone of that moment</label>
          <select value={design.tz} onChange={(e) => patch({ tz: e.target.value })}>
            <option value={deviceTz()}>Auto ({deviceTz()})</option>
            {COMMON_TZ.filter((t) => t !== deviceTz()).map((t) => (
              <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>Place</label>
          <input
            type="text"
            value={design.place}
            placeholder="CITY, COUNTRY"
            onChange={(e) => patch({ place: e.target.value })}
          />
          <button type="button" className="geobtn" onClick={() => setGeoOpen((v) => !v)}>
            {geoOpen ? '▴ hide place finder' : '▾ find place on a map'}
          </button>
          {geoOpen && (
            <>
              <input
                type="text"
                placeholder="Search a city…"
                value={geoQuery}
                onChange={(e) => runGeocode(e.target.value)}
                style={{ marginTop: 8 }}
              />
              {geoResults.length > 0 && (
                <div className="georesults">
                  {geoResults.map((r, i) => (
                    <button key={i} type="button" onClick={() => pickPlace(r)}>{r.label}</button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className="field">
          <label>Your line (optional)</label>
          <input
            type="text"
            maxLength={80}
            value={design.msg}
            placeholder="the night we met"
            onChange={(e) => patch({ msg: e.target.value })}
          />
        </div>

        <div className="field">
          <label>Shirt colour</label>
          <div className="swatches">
            {SHIRT_COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                title={c.label}
                className={'swatch' + (design.color === c.id ? ' active' : '')}
                style={{ background: c.hex }}
                onClick={() => patch({ color: c.id })}
              />
            ))}
          </div>
        </div>

        <div className="row3">
          <div className="field">
            <label>Size</label>
            <div className="sizes">
              {SHIRT_SIZES.map((s) => (
                <button key={s} type="button" className={'sizebtn' + (design.size === s ? ' active' : '')} onClick={() => patch({ size: s })}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <label>Qty</label>
            <input type="number" min="1" max="10" value={design.qty} onChange={(e) => patch({ qty: Math.max(1, Math.min(10, Number(e.target.value) || 1)) })} />
          </div>
        </div>
      </div>

      <div className="previewwrap">
        <div className="previewbox">
          <canvas id="preview" ref={canvasRef} width={780} height={900} />
        </div>
        <div className="price">
          {usd(totals.total)} <small>{design.qty > 1 ? `for ${design.qty} shirts` : 'per shirt'} · incl. {totals.shipping === 0 ? 'free shipping' : 'shipping'}</small>
        </div>
        <div className="shipnote">DTG-printed to order · ships worldwide in 3–8 days</div>
        <button className="btn" onClick={addToCart} disabled={added}>
          {added ? '✓ Added to cart' : 'Add to cart'}
        </button>{' '}
        <a className="btn ghost" href="/checkout" style={{ marginLeft: 8 }}>Go to checkout</a>
      </div>
    </div>
  );
}
