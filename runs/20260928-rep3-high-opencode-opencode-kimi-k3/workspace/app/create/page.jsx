'use client';

import { useMemo, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import CitySearch from '../../components/CitySearch';
import TeeMockup from '../../components/TeeMockup';
import ArtworkCanvas from '../../components/ArtworkCanvas';
import { zonedToUtcMs, formatWhen, formatCoords } from '../../lib/client-time';
import { SHIRT_COLORS, SIZES, BASE_PRICE_CENTS, money } from '../../lib/design';
import { moonPhase, moonPhaseName } from '../../lib/sky';

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function Creator() {
  const router = useRouter();
  const canceled = useSearchParams().get('canceled');

  const [line1, setLine1] = useState('');
  const [dateStr, setDateStr] = useState(todayStr());
  const [timeStr, setTimeStr] = useState('21:00');
  const [city, setCity] = useState(null);
  const [colorId, setColorId] = useState('black');
  const [size, setSize] = useState('M');
  const [view, setView] = useState('shirt');
  const [err, setErr] = useState('');

  const color = SHIRT_COLORS.find((c) => c.id === colorId);

  const design = useMemo(() => {
    if (!city || !dateStr || !timeStr) return null;
    const [y, m, d] = dateStr.split('-').map(Number);
    const [h, mi] = timeStr.split(':').map(Number);
    if (!y || !m || !d) return null;
    const t = zonedToUtcMs(y, m, d, h, mi, city.tz);
    return {
      t,
      lat: city.lat,
      lng: city.lng,
      line1: line1.trim(),
      place: city.place,
      when: formatWhen(t, city.tz),
      coords: formatCoords(city.lat, city.lng),
      theme: color.ink,
    };
  }, [city, dateStr, timeStr, line1, color]);

  const ready = Boolean(design);

  const goCheckout = () => {
    setErr('');
    if (!design) { setErr('Pick a city (or your current location) so we can chart the sky.'); return; }
    sessionStorage.setItem('celestee:order', JSON.stringify({ design, color: colorId, size }));
    router.push('/checkout');
  };

  return (
    <div className="wrap creator">
      <div className="panel">
        <div>
          <div className="eyebrow">Design yours</div>
          <h1 className="serif" style={{ fontSize: 36, fontWeight: 500, lineHeight: 1.1 }}>
            Your moment, charted
          </h1>
        </div>

        {canceled && <div className="error-box">Checkout was canceled — your design is still here when you’re ready.</div>}

        <div className="field">
          <label htmlFor="line1">Your dedication</label>
          <input id="line1" className="input" maxLength={42}
            placeholder="The Night We Met" value={line1}
            onChange={(e) => setLine1(e.target.value)} />
          <div className="hint">Printed beneath the sky — a first dance, a birth, a goodbye. Up to 42 characters.</div>
        </div>

        <div className="field">
          <label>Place</label>
          <CitySearch value={city} onSelect={setCity} />
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="date">Date</label>
            <input id="date" type="date" className="input" value={dateStr}
              min="1900-01-01" max="2100-12-31"
              onChange={(e) => setDateStr(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="time">Time</label>
            <input id="time" type="time" className="input" value={timeStr}
              onChange={(e) => setTimeStr(e.target.value)} />
          </div>
        </div>
        <div className="hint" style={{ marginTop: -10 }}>
          Local time at the place you chose. Night skies are the classic choice — but a noon sky is real too.
        </div>

        <div className="field">
          <label>Shirt color</label>
          <div className="swatches">
            {SHIRT_COLORS.map((c) => (
              <button key={c.id} type="button" className="swatch" title={c.label}
                style={{ background: c.hex }} aria-pressed={colorId === c.id}
                onClick={() => setColorId(c.id)} />
            ))}
          </div>
        </div>

        <div className="field">
          <label>Size</label>
          <div className="size-grid">
            {SIZES.map((s) => (
              <button key={s} type="button" className="size-btn"
                aria-pressed={size === s} onClick={() => setSize(s)}>{s}</button>
            ))}
          </div>
        </div>

        {err && <div className="error-box">{err}</div>}

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 6 }}>
          <button className="btn" onClick={goCheckout} disabled={!ready}>
            Continue — {money(BASE_PRICE_CENTS)}
          </button>
          {!ready && <span className="hint">Choose a place to see your sky</span>}
        </div>
      </div>

      <div className="preview-stick">
        <div className="preview-stage">
          {design
            ? (view === 'shirt'
              ? <TeeMockup hex={color.hex} design={design} />
              : <div style={{ maxWidth: 420, width: '100%' }}><ArtworkCanvas design={design} width={840} /></div>)
            : (
              <div style={{ padding: '120px 30px', textAlign: 'center', color: 'var(--cream-faint)' }}>
                <div style={{ fontSize: 42, marginBottom: 12 }}>✦</div>
                <div>Your sky appears here.<br />Choose a place to begin.</div>
              </div>
            )}
        </div>
        <div className="preview-meta">
          <div className="view-toggle" role="group" aria-label="Preview mode">
            <button aria-pressed={view === 'shirt'} onClick={() => setView('shirt')}>On the shirt</button>
            <button aria-pressed={view === 'print'} onClick={() => setView('print')}>Print artwork</button>
          </div>
          <span>{color.label} · {size} · {money(BASE_PRICE_CENTS)}</span>
        </div>
        {design && (
          <p className="hint" style={{ marginTop: 10 }}>
            {design.when} · {design.coords} · {moonPhaseName(moonPhase(design.t).frac)}, {Math.round(moonPhase(design.t).illum * 100)}% lit
          </p>
        )}
      </div>
    </div>
  );
}

export default function CreatePage() {
  return (
    <Suspense>
      <Creator />
    </Suspense>
  );
}
