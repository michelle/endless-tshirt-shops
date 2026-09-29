'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ShirtMockup } from './shirt-mockup';
import { PALETTES, PLACE_MAX, CAPTION_MAX } from '../lib/palettes';
import { COLORS, SIZES, SHIRT_PRICE_CENTS, SHIPPING_CENTS, MAX_QTY } from '../lib/catalog';

const CAPTION_IDEAS = [
  'the night we met',
  'welcome to the world',
  'the night we said I do',
  'under the same sky',
  'the night everything changed',
  'we danced until sunrise',
];

function todayIso(): string {
  const now = new Date();
  const off = now.getTimezoneOffset();
  return new Date(now.getTime() - off * 60000).toISOString().slice(0, 10);
}

function isRealDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function maxDateIso(): string {
  const now = new Date(Date.now() + 365 * 86400000);
  return now.toISOString().slice(0, 10);
}

export function Studio() {
  const [date, setDate] = useState('');
  const [place, setPlace] = useState('');
  const [caption, setCaption] = useState('');
  const [palette, setPalette] = useState(PALETTES[0].id);
  const [color, setColor] = useState(COLORS[0].id);
  const [size, setSize] = useState('m');
  const [qty, setQty] = useState(1);

  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [previewStale, setPreviewStale] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dateValid = isRealDate(date);
  const ready = dateValid && place.trim().length > 0 && !busy;
  const total = useMemo(() => (SHIRT_PRICE_CENTS * qty + SHIPPING_CENTS) / 100, [qty]);
  const colorHex = useMemo(() => COLORS.find((c) => c.id === color)?.hex ?? COLORS[0].hex, [color]);

  // Default to "tonight" — on mount only, so SSR and client never disagree.
  useEffect(() => {
    setDate((d) => d || todayIso());
  }, []);

  // Live preview: debounced POST -> blob URL. Until a place is typed we render
  // an example sky so the studio is never empty.
  const requestRef = useRef(0);
  const objectUrlRef = useRef<string | null>(null);
  useEffect(() => {
    const my = ++requestRef.current;
    setPreviewStale(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/design', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: isRealDate(date) ? date : todayIso(),
            place: place.trim() || 'Reykjavík',
            caption: caption.trim(),
            palette,
          }),
        });
        if (!res.ok) return;
        const blob = await res.blob();
        if (my !== requestRef.current) return; // a newer request superseded this one
        const url = URL.createObjectURL(blob);
        if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = url;
        setPosterUrl(url);
        setPreviewStale(false);
      } catch {
        // keep the last good preview on transient failures
      }
    }, 450);
    return () => clearTimeout(timer);
  }, [date, place, caption, palette]);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  const inspire = useCallback(() => {
    setCaption(CAPTION_IDEAS[Math.floor(Math.random() * CAPTION_IDEAS.length)]);
    setPalette(PALETTES[Math.floor(Math.random() * PALETTES.length)].id);
  }, []);

  const checkout = useCallback(async () => {
    if (!ready) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, place: place.trim(), caption: caption.trim(), palette, color, size, qty }),
      });
      const body = await res.json();
      if (!res.ok || !body.url) {
        throw new Error(body.error ?? 'Could not start checkout');
      }
      window.location.href = body.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start checkout');
      setBusy(false);
    }
  }, [ready, date, place, caption, palette, color, size, qty]);

  const label = 'block text-[11px] font-medium uppercase tracking-[0.18em] text-mist-500 mb-2';
  const input =
    'w-full rounded-xl border border-night-600 bg-night-900/80 px-4 py-3 text-mist-100 placeholder:text-mist-500/60 outline-none focus:border-aurora/70 focus:ring-2 focus:ring-aurora/25 transition';

  return (
    <div className="grid gap-8 lg:grid-cols-[1.02fr_1fr] lg:gap-10">
      {/* Mockup */}
      <div className="relative rounded-3xl border border-night-700 bg-gradient-to-b from-night-850 to-night-900 p-6 sm:p-10">
        <div className="mx-auto max-w-md">
          <ShirtMockup colorHex={colorHex} posterUrl={posterUrl} />
        </div>
        <p className="mt-6 text-center text-xs text-mist-500">
          Live preview — your sky recomposes as you type.
          {previewStale ? ' Updating…' : ''}
          {!place.trim() ? ' Showing an example sky until you add your place.' : ''}
        </p>
      </div>

      {/* Controls */}
      <div className="rounded-3xl border border-night-700 bg-night-900/60 p-6 sm:p-8">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className={label} htmlFor="mw-date">The night</label>
            <input
              id="mw-date"
              type="date"
              className={input}
              value={date}
              min="1900-01-01"
              max={maxDateIso()}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div>
            <label className={label} htmlFor="mw-place">The place</label>
            <input
              id="mw-place"
              type="text"
              className={input}
              placeholder="Reykjavík"
              maxLength={PLACE_MAX}
              value={place}
              onChange={(e) => setPlace(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-5">
          <div className="flex items-baseline justify-between">
            <label className={label} htmlFor="mw-caption">A few words <span className="normal-case tracking-normal text-mist-500/70">(optional)</span></label>
            <button type="button" onClick={inspire} className="mb-2 text-xs text-aurora hover:text-aurora/80 transition">
              ✦ inspire me
            </button>
          </div>
          <input
            id="mw-caption"
            type="text"
            className={input}
            placeholder="the night we met"
            maxLength={CAPTION_MAX}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {CAPTION_IDEAS.slice(0, 4).map((idea) => (
              <button
                key={idea}
                type="button"
                onClick={() => setCaption(idea)}
                className="rounded-full border border-night-600 px-3 py-1 text-xs text-mist-300 hover:border-aurora/60 hover:text-mist-100 transition"
              >
                {idea}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <span className={label}>The sky</span>
          <div className="flex flex-wrap gap-3">
            {PALETTES.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPalette(p.id)}
                aria-pressed={palette === p.id}
                className={`group flex flex-col items-center gap-1.5 rounded-xl p-1.5 transition ${palette === p.id ? 'ring-2 ring-moonlight ring-offset-2 ring-offset-night-900' : 'hover:ring-1 hover:ring-night-600'}`}
              >
                <span
                  className="block h-9 w-14 rounded-lg"
                  style={{ background: `linear-gradient(to bottom, ${p.c1}, ${p.c2} 55%, ${p.c3})`, boxShadow: `inset 0 0 0 1px ${p.accent}44` }}
                />
                <span className="text-[11px] text-mist-300">{p.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <div>
            <span className={label}>Shirt colour — {COLORS.find((c) => c.id === color)?.name}</span>
            <div className="flex flex-wrap gap-2.5">
              {COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  title={c.name}
                  aria-pressed={color === c.id}
                  onClick={() => setColor(c.id)}
                  className={`h-9 w-9 rounded-full transition ${color === c.id ? 'ring-2 ring-moonlight ring-offset-2 ring-offset-night-900' : 'hover:ring-1 hover:ring-night-600'}`}
                  style={{ background: c.hex, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.18)' }}
                />
              ))}
            </div>
          </div>
          <div>
            <span className={label}>Size</span>
            <div className="flex flex-wrap gap-2">
              {SIZES.map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={size === s}
                  onClick={() => setSize(s)}
                  className={`min-w-11 rounded-lg border px-2.5 py-2 text-sm transition ${size === s ? 'border-moonlight bg-moonlight text-night-950 font-semibold' : 'border-night-600 text-mist-300 hover:border-mist-500'}`}
                >
                  {s.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-7 flex items-center justify-between gap-4 border-t border-night-700 pt-6">
          <div className="flex items-center gap-3">
            <span className={label.replace('mb-2', 'mb-0')}>Qty</span>
            <div className="flex items-center rounded-xl border border-night-600">
              <button type="button" aria-label="Decrease quantity" className="px-3 py-2 text-mist-300 hover:text-mist-100 disabled:opacity-40" disabled={qty <= 1} onClick={() => setQty((q) => q - 1)}>−</button>
              <span className="w-8 text-center text-sm font-medium">{qty}</span>
              <button type="button" aria-label="Increase quantity" className="px-3 py-2 text-mist-300 hover:text-mist-100 disabled:opacity-40" disabled={qty >= MAX_QTY} onClick={() => setQty((q) => q + 1)}>+</button>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-mist-500">${(SHIRT_PRICE_CENTS / 100).toFixed(2)} each · ${(SHIPPING_CENTS / 100).toFixed(2)} shipping</div>
            <div className="font-display text-3xl text-moonlight">${total.toFixed(2)}</div>
          </div>
        </div>

        <button
          type="button"
          onClick={checkout}
          disabled={!ready}
          className="mt-5 w-full rounded-xl bg-moonlight px-6 py-4 text-base font-semibold text-night-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? 'Opening secure checkout…' : `Checkout — $${total.toFixed(2)}`}
        </button>
        {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
        <p className="mt-4 text-center text-xs text-mist-500">
          Secure checkout by Stripe · each shirt printed one-of-one, direct-to-garment
        </p>
      </div>
    </div>
  );
}
