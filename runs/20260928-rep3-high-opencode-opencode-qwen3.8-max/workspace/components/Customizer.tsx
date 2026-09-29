'use client';

import { useEffect, useMemo, useState } from 'react';
import { CITIES } from '@/data/cities';
import { renderDesignForShirt } from '@/lib/design';
import { formatUsd, PRICE_SHIPPING_CENTS, PRICE_SHIRT_CENTS, PRICE_TOTAL_CENTS, SHIRT_COLORS, shirtColor, type DesignParams, type InkStyle } from '@/lib/types';
import TeeMockup from './TeeMockup';

interface FormState {
  date: string;
  time: string;
  timeUnknown: boolean;
  placeMode: 'city' | 'manual';
  cityIdx: number;
  manualPlace: string;
  manualLat: string;
  manualLon: string;
  manualOffset: string;
  color: string;
  size: string;
  style: InkStyle;
  name: string;
  msg: string;
}

const today = new Date().toISOString().slice(0, 10);

const INITIAL: FormState = {
  date: '1995-05-14',
  time: '21:30',
  timeUnknown: false,
  placeMode: 'city',
  cityIdx: CITIES.findIndex((c) => c.city === 'London'),
  manualPlace: '',
  manualLat: '',
  manualLon: '',
  manualOffset: '0',
  color: 'black',
  size: 'm',
  style: 'gilded',
  name: 'Amelia',
  msg: 'Under this sky, everything began.',
};

export default function Customizer() {
  const [f, setF] = useState<FormState>(INITIAL);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setF((prev) => ({ ...prev, [k]: v }));

  // keep the size valid for the chosen colour
  useEffect(() => {
    const c = SHIRT_COLORS.find((x) => x.id === f.color);
    if (c && !c.sizes.includes(f.size)) {
      setF((prev) => ({ ...prev, size: c.sizes.includes('m') ? 'm' : c.sizes[0] }));
    }
  }, [f.color, f.size]);

  const { design, problem } = useMemo((): { design: DesignParams | null; problem: string | null } => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(f.date)) return { design: null, problem: 'Choose the date you were born.' };
    if (f.date < '1900-01-01') return { design: null, problem: 'We can compute skies back to 1900.' };
    if (f.date > today) return { design: null, problem: 'Birth dates in the future are a different product.' };
    const time = f.timeUnknown ? null : f.time || null;
    if (!f.timeUnknown && !/^\d{2}:\d{2}$/.test(f.time)) return { design: null, problem: 'Choose a birth time, or tick “I don’t know”.' };

    let lat: number, lon: number, tz: string | null, utcOffset: number | null, place: string;
    if (f.placeMode === 'city') {
      const c = CITIES[f.cityIdx];
      lat = c.lat;
      lon = c.lon;
      tz = c.tz;
      utcOffset = null;
      place = `${c.city}, ${c.country}`;
    } else {
      lat = parseFloat(f.manualLat);
      lon = parseFloat(f.manualLon);
      utcOffset = f.manualOffset === '' ? null : parseFloat(f.manualOffset);
      tz = null;
      if (!isFinite(lat) || lat < -90 || lat > 90) return { design: null, problem: 'Latitude must be between −90 and 90.' };
      if (!isFinite(lon) || lon < -180 || lon > 180) return { design: null, problem: 'Longitude must be between −180 and 180.' };
      if (utcOffset === null || !isFinite(utcOffset) || utcOffset < -12 || utcOffset > 14)
        return { design: null, problem: 'Enter the UTC offset that applied where you were born (e.g. −4 for a summer evening in New York).' };
      place = f.manualPlace.trim() || `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
      if (place.length > 60) return { design: null, problem: 'Keep the place name under 60 characters.' };
    }

    const name = f.name.trim();
    if (!name) return { design: null, problem: 'Every sky needs a name.' };
    if (name.length > 24) return { design: null, problem: 'Keep the name under 24 characters so it stays beautiful.' };
    if (f.msg.length > 80) return { design: null, problem: 'Keep the message under 80 characters.' };

    return {
      design: {
        v: 1,
        name,
        date: f.date,
        time,
        place,
        lat,
        lon,
        tz,
        utcOffset,
        msg: f.msg.trim(),
        style: f.style,
      },
      problem: null,
    };
  }, [f]);

  const svg = useMemo(() => {
    if (!design) return null;
    try {
      return renderDesignForShirt(design, f.color);
    } catch {
      return null;
    }
  }, [design, f.color]);

  const colour = shirtColor(f.color);

  async function checkout() {
    if (!design) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ design, product: { color: f.color, size: f.size } }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? `Checkout could not start (${res.status})`);
      }
      window.location.href = data.url;
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="studio">
      <div className="panel">
        <fieldset>
          <legend><span className="step">1</span>The moment</legend>
          <div className="row">
            <label className="field">
              <span className="lbl">Birth date</span>
              <input
                type="date"
                value={f.date}
                min="1900-01-01"
                max={today}
                onChange={(e) => set('date', e.target.value)}
              />
            </label>
            <label className="field">
              <span className="lbl">Birth time (local)</span>
              <input
                type="time"
                value={f.time}
                disabled={f.timeUnknown}
                onChange={(e) => set('time', e.target.value)}
              />
            </label>
          </div>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={f.timeUnknown}
              onChange={(e) => set('timeUnknown', e.target.checked)}
            />
            I don’t know my birth time — show the evening sky
          </label>
          <p className="hint">
            Your certificate usually has the minute. With a time we compute the exact sky;
            without one we show 9:00 PM local, marked as approximate on the shirt.
          </p>
        </fieldset>

        <fieldset>
          <legend><span className="step">2</span>The place</legend>
          <label className="field">
            <span className="lbl">Born in</span>
            <select
              value={f.placeMode === 'city' ? String(f.cityIdx) : 'manual'}
              onChange={(e) => {
                const v = e.target.value;
                if (v === 'manual') set('placeMode', 'manual');
                else {
                  setF((prev) => ({ ...prev, placeMode: 'city', cityIdx: Number(v) }));
                }
              }}
            >
              <option value="manual">Somewhere else — enter coordinates…</option>
              {CITIES.map((c, i) => (
                <option key={`${c.city}-${c.country}`} value={String(i)}>
                  {c.city}, {c.country}
                </option>
              ))}
            </select>
          </label>
          {f.placeMode === 'manual' && (
            <>
              <label className="field">
                <span className="lbl">Place name for the shirt</span>
                <input
                  type="text"
                  value={f.manualPlace}
                  placeholder="Reykjavík, Iceland"
                  maxLength={60}
                  onChange={(e) => set('manualPlace', e.target.value)}
                />
              </label>
              <div className="row-3">
                <label className="field">
                  <span className="lbl">Latitude</span>
                  <input
                    type="number"
                    step="0.0001"
                    min={-90}
                    max={90}
                    value={f.manualLat}
                    placeholder="64.1466"
                    onChange={(e) => set('manualLat', e.target.value)}
                  />
                </label>
                <label className="field">
                  <span className="lbl">Longitude</span>
                  <input
                    type="number"
                    step="0.0001"
                    min={-180}
                    max={180}
                    value={f.manualLon}
                    placeholder="-21.9426"
                    onChange={(e) => set('manualLon', e.target.value)}
                  />
                </label>
                <label className="field">
                  <span className="lbl">UTC offset then</span>
                  <input
                    type="number"
                    step="0.25"
                    min={-12}
                    max={14}
                    value={f.manualOffset}
                    onChange={(e) => set('manualOffset', e.target.value)}
                  />
                </label>
              </div>
              <p className="hint">
                The offset is the one in effect at your birth — include daylight saving
                (New York in July is −4, in January −5).
              </p>
            </>
          )}
        </fieldset>

        <fieldset>
          <legend><span className="step">3</span>The words</legend>
          <label className="field">
            <span className="lbl">Name on the shirt</span>
            <input
              type="text"
              value={f.name}
              maxLength={24}
              onChange={(e) => set('name', e.target.value)}
            />
          </label>
          <label className="field">
            <span className="lbl">A line of your own (optional)</span>
            <input
              type="text"
              value={f.msg}
              maxLength={80}
              placeholder="Under this sky, everything began."
              onChange={(e) => set('msg', e.target.value)}
            />
          </label>
        </fieldset>

        <fieldset>
          <legend><span className="step">4</span>The shirt</legend>
          <div className="swatches" role="radiogroup" aria-label="Shirt colour">
            {SHIRT_COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`swatch ${f.color === c.id ? 'selected' : ''}`}
                style={{ background: c.hex }}
                title={c.label}
                aria-label={c.label}
                aria-checked={f.color === c.id}
                role="radio"
                onClick={() => set('color', c.id)}
              >
                <span className="tip">{c.label}</span>
              </button>
            ))}
          </div>
          <div className="pills" role="radiogroup" aria-label="Size" style={{ margin: '18px 0 16px' }}>
            {['xs', 's', 'm', 'l', 'xl', '2xl', '3xl', '4xl'].map((s) => (
              <button
                key={s}
                type="button"
                className={`pill ${f.size === s ? 'selected' : ''}`}
                disabled={!colour.sizes.includes(s)}
                onClick={() => set('size', s)}
                title={colour.sizes.includes(s) ? undefined : `Not available in ${colour.label}`}
              >
                {s.toUpperCase()}
              </button>
            ))}
          </div>
          <div className="styles">
            <button
              type="button"
              className={`style-card ${f.style === 'starlight' ? 'selected' : ''}`}
              onClick={() => set('style', 'starlight')}
            >
              <b>Starlight</b>
              <span>ivory stars, cool blue accents</span>
            </button>
            <button
              type="button"
              className={`style-card ${f.style === 'gilded' ? 'selected' : ''}`}
              onClick={() => set('style', 'gilded')}
            >
              <b>Gilded</b>
              <span>ivory stars, hand-gilded gold accents</span>
            </button>
          </div>
        </fieldset>
      </div>

      <div className="preview-col">
        <div className="mockup-wrap">
          <TeeMockup svg={svg} hex={colour.hex} light={colour.light} />
        </div>
        <div className="buy-box">
          <div className="price">
            {formatUsd(PRICE_TOTAL_CENTS)}
            <small>
              shirt {formatUsd(PRICE_SHIRT_CENTS)} · shipping {formatUsd(PRICE_SHIPPING_CENTS)} · printed to order
            </small>
          </div>
          <button className="checkout-btn" disabled={busy || !design} onClick={checkout}>
            {busy ? 'Opening checkout…' : 'Buy this sky'}
          </button>
        </div>
        {problem && <div className="form-error">{problem}</div>}
        {error && <div className="form-error">{error}</div>}
        <div className="trust">
          <span>✦ real computed sky, not a template</span>
          <span>✦ DTG-printed &amp; shipped by Prodigi</span>
          <span>✦ secure checkout by Stripe</span>
        </div>
      </div>
    </div>
  );
}
