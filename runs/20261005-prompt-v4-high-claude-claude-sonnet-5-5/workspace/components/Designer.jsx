'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Shirt from './Shirt';
import {
  COUNTRY_NAMES, DEFAULT_DESIGN, MAX_LINE, MAX_PLACE, MAX_TITLE, SHIPPING, SHIRTS, SIZES, THEMES,
  priceCents, themesForShirt,
} from '@/lib/design.js';

const OCCASIONS = ['The Night We Met', 'The Day You Were Born', 'Our Wedding Night', 'The Night I Said Yes', 'First Night in Our Home', 'The Night We Became Three'];
const STORAGE_KEY = 'skyprint-design-v1';
const money = (c) => `$${(c / 100).toFixed(2)}`;

function previewQuery(d) {
  const p = new URLSearchParams({
    title: d.title, line: d.line, place: d.place, lat: d.lat, lon: d.lon, tz: d.tz, date: d.date, time: d.time,
    shirt: d.shirt, theme: d.theme, size: d.size, lines: d.lines ? '1' : '0', planets: d.planets ? '1' : '0',
  });
  return p.toString();
}

export default function Designer({ demoMode, paymentsReady }) {
  const [d, setD] = useState(DEFAULT_DESIGN);
  const [country, setCountry] = useState('US');
  const [view, setView] = useState('shirt');
  const [placeQuery, setPlaceQuery] = useState(DEFAULT_DESIGN.place);
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [imgSrc, setImgSrc] = useState('');
  const [rendering, setRendering] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [hydrated, setHydrated] = useState(false);
  const searchSeq = useRef(0);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (saved?.d) {
        setD({ ...DEFAULT_DESIGN, ...saved.d });
        setPlaceQuery(saved.d.place || DEFAULT_DESIGN.place);
        if (saved.country && SHIPPING[saved.country]) setCountry(saved.country);
      }
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify({ d, country }));
  }, [d, country, hydrated]);

  const set = useCallback((patch) => setD((cur) => ({ ...cur, ...patch })), []);

  // Keep the ink theme valid for the chosen shirt colour.
  const allowedThemes = useMemo(() => themesForShirt(d.shirt), [d.shirt]);
  useEffect(() => {
    if (!allowedThemes.includes(d.theme)) set({ theme: allowedThemes[0] });
  }, [allowedThemes, d.theme, set]);

  // Debounced preview: preload the new image, then swap it in so the preview never flickers.
  const query = previewQuery(d);
  useEffect(() => {
    if (!hydrated) return undefined;
    setRendering(true);
    const t = setTimeout(() => {
      const url = `/api/preview?${query}`;
      const img = new Image();
      img.onload = () => { setImgSrc(url); setRendering(false); };
      img.onerror = () => setRendering(false);
      img.src = url;
    }, 300);
    return () => clearTimeout(t);
  }, [query, hydrated]);

  // Place search
  useEffect(() => {
    const q = placeQuery.trim();
    if (q.length < 2 || q === d.place) { setSuggestions([]); return undefined; }
    const seq = ++searchSeq.current;
    const t = setTimeout(async () => {
      setSearching(true);
      setSearchError('');
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
        const json = await res.json();
        if (seq === searchSeq.current) {
          setSuggestions(json.results || []);
          if (json.error) setSearchError(json.error);
        }
      } catch {
        if (seq === searchSeq.current) setSearchError('Place search is unavailable right now.');
      } finally {
        if (seq === searchSeq.current) setSearching(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [placeQuery, d.place]);

  const pickPlace = (r) => {
    set({ place: r.label, lat: r.lat, lon: r.lon, tz: r.tz });
    setPlaceQuery(r.label);
    setSuggestions([]);
  };

  const shirt = SHIRTS[d.shirt];
  const price = priceCents(d.size);
  const shipping = SHIPPING[country];
  const total = price + shipping;
  const complete = d.date && d.time && d.place;

  async function checkout() {
    setError('');
    if (!complete) { setError('Please choose a date, time and place.'); return; }
    setBusy(true);
    try {
      const res = await fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ design: d, country }) });
      const json = await res.json();
      if (!res.ok || !json.url) throw new Error(json.error || 'Could not start checkout.');
      window.location.href = json.url;
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }

  return (
    <div className="designer" id="design">
      <div className="card">
        <div className="step">
          <h3><span className="n">1</span> The moment</h3>
          <p className="hint">Pick an occasion or write your own headline.</p>
          <div className="chips">
            {OCCASIONS.map((o) => (
              <button key={o} type="button" className={`chip ${d.title === o ? 'on' : ''}`} onClick={() => set({ title: o })}>{o}</button>
            ))}
          </div>
          <label className="f" htmlFor="title">Headline</label>
          <input id="title" type="text" maxLength={MAX_TITLE} value={d.title} onChange={(e) => set({ title: e.target.value })} placeholder="The Night We Met" />
        </div>

        <div className="step">
          <h3><span className="n">2</span> Where &amp; when</h3>
          <p className="hint">We calculate exactly which stars, planets and moon phase were overhead.</p>
          <label className="f" htmlFor="place">Find the place</label>
          <div className="suggest">
            <input id="place" type="text" autoComplete="off" value={placeQuery} onChange={(e) => setPlaceQuery(e.target.value)} placeholder="City, town or landmark" />
            {(suggestions.length > 0 || searching) && (
              <ul>
                {searching && suggestions.length === 0 && <li><button type="button" disabled>Searching…</button></li>}
                {suggestions.map((r, i) => (
                  <li key={`${r.label}-${i}`}>
                    <button type="button" onClick={() => pickPlace(r)}>{r.label}<small>{r.detail} · {r.lat.toFixed(2)}, {r.lon.toFixed(2)}</small></button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {searchError && <p className="err">{searchError}</p>}
          <label className="f" htmlFor="label">Printed on the shirt as</label>
          <input id="label" type="text" maxLength={MAX_PLACE} value={d.place} onChange={(e) => set({ place: e.target.value })} />
          <div className="row">
            <div>
              <label className="f" htmlFor="date">Date</label>
              <input id="date" type="date" min="1800-01-01" max="2100-12-31" value={d.date} onChange={(e) => set({ date: e.target.value })} />
            </div>
            <div>
              <label className="f" htmlFor="time">Local time</label>
              <input id="time" type="time" value={d.time} onChange={(e) => set({ time: e.target.value })} />
            </div>
          </div>
          <p className="note">Time zone: {d.tz.replace('_', ' ')}. Not sure of the time? 9 PM gives a classic night sky.</p>
        </div>

        <div className="step">
          <h3><span className="n">3</span> Your words</h3>
          <p className="hint">Names, a vow, a lyric — printed beneath the sky.</p>
          <label className="f" htmlFor="line">Personal line</label>
          <input id="line" type="text" maxLength={MAX_LINE} value={d.line} onChange={(e) => set({ line: e.target.value })} placeholder="Sam & Alex" />
        </div>

        <div className="step">
          <h3><span className="n">4</span> Style</h3>
          <label className="f">Shirt colour — {shirt.label}</label>
          <div className="swatches" role="radiogroup" aria-label="Shirt colour">
            {Object.entries(SHIRTS).map(([k, s]) => (
              <button key={k} type="button" role="radio" aria-checked={d.shirt === k} aria-label={s.label} title={s.label} className={`sw ${d.shirt === k ? 'on' : ''}`} style={{ background: s.hex }} onClick={() => set({ shirt: k })} />
            ))}
          </div>
          <label className="f">Ink</label>
          <div className="themes">
            {allowedThemes.map((k) => (
              <button key={k} type="button" className={`theme ${d.theme === k ? 'on' : ''}`} onClick={() => set({ theme: k })}>
                <i style={{ background: THEMES[k].disc || THEMES[k].star, color: THEMES[k].accent }} />{THEMES[k].label}
              </button>
            ))}
          </div>
          <label className="check"><input type="checkbox" checked={d.lines} onChange={(e) => set({ lines: e.target.checked })} /> Draw constellation lines</label>
          <label className="check"><input type="checkbox" checked={d.planets} onChange={(e) => set({ planets: e.target.checked })} /> Show the Moon &amp; visible planets</label>
        </div>

        <div className="step">
          <h3><span className="n">5</span> Size &amp; delivery</h3>
          <label className="f">Unisex fit (Gildan Softstyle 64000, 100% cotton)</label>
          <div className="sizes" role="radiogroup" aria-label="Size">
            {SIZES.map((s) => (
              <button key={s} type="button" role="radio" aria-checked={d.size === s} className={`size ${d.size === s ? 'on' : ''}`} onClick={() => set({ size: s })}>{s}</button>
            ))}
          </div>
          <label className="f" htmlFor="country">Ship to</label>
          <select id="country" value={country} onChange={(e) => setCountry(e.target.value)}>
            {Object.entries(COUNTRY_NAMES).map(([k, n]) => <option key={k} value={k}>{n}</option>)}
          </select>
        </div>
      </div>

      <aside className="preview">
        <div className="card">
          <div className="tabs" role="tablist">
            <button type="button" role="tab" aria-selected={view === 'shirt'} className={`tab ${view === 'shirt' ? 'on' : ''}`} onClick={() => setView('shirt')}>On the tee</button>
            <button type="button" role="tab" aria-selected={view === 'art'} className={`tab ${view === 'art' ? 'on' : ''}`} onClick={() => setView('art')}>Artwork close-up</button>
          </div>
          <div className="stage">
            {rendering && <span className="loading">Updating sky…</span>}
            {view === 'shirt' ? (
              <Shirt color={shirt.hex} tone={shirt.tone} src={imgSrc} alt="Your custom night sky design" />
            ) : (
              <div className="artboard" style={{ background: shirt.hex }}>
                {imgSrc && <img src={imgSrc} alt="Your custom night sky design" />}
              </div>
            )}
          </div>
          <div className="facts"><span>Printed front, ~11″ × 14″</span><span>DTG on soft cotton</span></div>

          <div className="buy">
            {demoMode && (
              <div className="demo-banner"><strong>Test mode.</strong> Checkout is a sandbox demo: no card is charged and no shirt is actually printed or shipped.</div>
            )}
            <div className="sumline"><span>Custom tee ({d.size.toUpperCase()})</span><span>{money(price)}</span></div>
            <div className="sumline"><span>Shipping to {COUNTRY_NAMES[country]}</span><span>{money(shipping)}</span></div>
            <div className="sumline total"><span>Total</span><span>{money(total)}</span></div>
            <button className="btn" style={{ width: '100%', marginTop: 14 }} disabled={busy || !paymentsReady} onClick={checkout}>
              {busy ? 'Taking you to checkout…' : demoMode ? 'Continue to test checkout' : 'Checkout securely'}
            </button>
            {!paymentsReady && <p className="err">Checkout is temporarily unavailable.</p>}
            {error && <p className="err" role="alert">{error}</p>}
            <p className="note">Made to order and shipped in about 5–12 business days. Because every shirt is unique, we can only accept returns for damaged or misprinted items.</p>
          </div>
        </div>
      </aside>
    </div>
  );
}
