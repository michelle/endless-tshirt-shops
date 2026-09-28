'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  buildDesignContent,
  buildMockupSVG,
  decodeDesign,
  encodeDesign,
  MAX_SUBTITLE_LEN,
  MAX_TITLE_LEN,
  type DesignInput,
} from '@/lib/design';
import { loadFont, type Font } from '@/lib/textpath';
import { CITIES, type City } from '@/data/cities';
import { COUNTRIES } from '@/data/countries';
import {
  INKS,
  PRICE_CENTS,
  SHIRT_COLORS,
  SIZES,
  formatPrice,
  inkById,
  inksForShirt,
  shirtById,
} from '@/lib/shirts';
import { formatInZone, localToUtc } from '@/lib/tz';

const PRESETS: { title: string; date: string; time: string; city: string }[] = [
  { title: 'The Night We Met', date: '2019-06-14', time: '23:30', city: 'Lisbon' },
  { title: 'She Said Yes', date: '2022-12-24', time: '18:45', city: 'Paris' },
  { title: 'First Breath', date: '2024-03-02', time: '04:12', city: 'Chicago' },
  { title: 'Graduation Night', date: '2021-05-28', time: '21:00', city: 'Austin' },
  { title: 'The Long Road Home', date: '2018-09-07', time: '22:15', city: 'Denver' },
];

function todayPlus(days: number): string {
  const d = new Date(Date.now() + days * 86400000);
  return d.toISOString().slice(0, 10);
}

export default function Designer() {
  const router = useRouter();
  const [font, setFont] = useState<Font | null>(null);

  const [title, setTitle] = useState('The Night We Met');
  const [dateStr, setDateStr] = useState(todayPlus(-365 * 3));
  const [timeStr, setTimeStr] = useState('21:30');
  const [query, setQuery] = useState('Lisbon');
  const [city, setCity] = useState<City | null>(null);
  const [custom, setCustom] = useState(false);
  const [latStr, setLatStr] = useState('');
  const [lonStr, setLonStr] = useState('');
  const [tz, setTz] = useState('Europe/Lisbon');
  const [subtitle, setSubtitle] = useState('');
  const [subtitleDirty, setSubtitleDirty] = useState(false);
  const [colorId, setColorId] = useState('black');
  const [inkId, setInkId] = useState('starlight');
  const [size, setSize] = useState('m');
  const [qty, setQty] = useState(1);
  const [listOpen, setListOpen] = useState(false);
  const [geoBusy, setGeoBusy] = useState(false);
  const comboRef = useRef<HTMLDivElement>(null);
  const resumed = useRef(false);

  // load font once
  useEffect(() => {
    try {
      setFont(loadFont());
    } catch {
      // font failed; preview stays in loading state
    }
  }, []);

  // resume from URL (?d=...) e.g. after cancelling Stripe checkout
  useEffect(() => {
    if (resumed.current) return;
    resumed.current = true;
    const sp = new URLSearchParams(window.location.search);
    const d = sp.get('d');
    if (d) {
      const design = decodeDesign(d);
      if (design) {
        setTitle(design.title);
        setSubtitle(design.subtitle);
        setSubtitleDirty(true);
        // restore local wall time for the location's timezone is not knowable
        // from the design alone; show the UTC date/time so nothing is lost.
        const t = new Date(design.utcIso);
        setDateStr(t.toISOString().slice(0, 10));
        setTimeStr(t.toISOString().slice(11, 16));
        setCustom(true);
        setLatStr(String(design.lat));
        setLonStr(String(design.lon));
        setTz('UTC');
        setQuery('');
        setCity(null);
      }
    }
    for (const [key, setter, valid] of [
      ['color', setColorId, (v: string) => !!shirtById(v)],
      ['ink', setInkId, (v: string) => !!inkById(v)],
      ['size', setSize, (v: string) => (SIZES as readonly string[]).includes(v)],
    ] as const) {
      const v = sp.get(key);
      if (v && valid(v)) setter(v);
    }
    const q = parseInt(sp.get('qty') || '', 10);
    if (q >= 1 && q <= 5) setQty(q);
  }, []);

  // default city: Lisbon
  useEffect(() => {
    if (!city && !custom) {
      const lisbon = CITIES.find((c) => c.n === 'Lisbon' && c.c === 'PT');
      if (lisbon) {
        setCity(lisbon);
        setTz(lisbon.tz);
        setQuery(`${lisbon.n}, ${COUNTRIES[lisbon.c] || lisbon.c}`);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lat = custom ? parseFloat(latStr) : city?.la;
  const lon = custom ? parseFloat(lonStr) : city?.lo;
  const tzValid = useMemo(() => {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: tz });
      return true;
    } catch {
      return false;
    }
  }, [tz]);

  const dateValid = /^\d{4}-\d{2}-\d{2}$/.test(dateStr) && !isNaN(new Date(`${dateStr}T12:00:00Z`).getTime());
  const timeValid = /^([01]\d|2[0-3]):[0-5]\d$/.test(timeStr);
  const locValid = Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat!) <= 89.9 && Math.abs(lon!) <= 180;

  const utc: Date | null = useMemo(() => {
    if (!dateValid || !timeValid || !locValid || !tzValid) return null;
    const [y, m, dd] = dateStr.split('-').map(Number);
    const [hh, mm] = timeStr.split(':').map(Number);
    return localToUtc(y, m, dd, hh, mm, tz);
  }, [dateStr, timeStr, dateValid, timeValid, lat, lon, locValid, tz, tzValid]);

  const placeName = custom
    ? `${Math.abs(lat || 0).toFixed(2)}° ${(lat || 0) >= 0 ? 'N' : 'S'}, ${Math.abs(lon || 0).toFixed(2)}° ${(lon || 0) >= 0 ? 'E' : 'W'}`
    : city
      ? `${city.n}, ${COUNTRIES[city.c] || city.c}`
      : '';

  // auto-fill subtitle until the user edits it
  useEffect(() => {
    if (subtitleDirty || !utc) return;
    setSubtitle(`${formatInZone(utc, tz)} · ${placeName}`.slice(0, MAX_SUBTITLE_LEN));
  }, [utc, tz, placeName, subtitleDirty]);

  const design: DesignInput | null = useMemo(() => {
    if (!utc || !title.trim()) return null;
    return {
      title: title.trim().slice(0, MAX_TITLE_LEN),
      subtitle: subtitle.trim().slice(0, MAX_SUBTITLE_LEN),
      utcIso: utc.toISOString(),
      lat: lat!,
      lon: lon!,
    };
  }, [utc, title, subtitle, lat, lon]);

  const dParam = design ? encodeDesign(design) : '';
  const shirt = shirtById(colorId)!;
  const ink = inkById(inkId) ?? inksForShirt(shirt)[0];

  // keep ink compatible with shirt
  useEffect(() => {
    if (inkById(inkId)?.forDark !== shirt.dark) {
      setInkId(inksForShirt(shirt)[0].id);
    }
  }, [colorId, shirt, inkId]);

  // live preview
  const mockup = useMemo(() => {
    if (!font || !design) return null;
    const content = buildDesignContent(design, ink.hex, font);
    return buildMockupSVG(shirt.hex, content);
  }, [font, design, ink.hex, shirt.hex]);

  // shareable URL
  useEffect(() => {
    if (!dParam) return;
    const sp = new URLSearchParams({ d: dParam, color: colorId, ink: ink.id, size, qty: String(qty) });
    const t = setTimeout(() => {
      window.history.replaceState(null, '', `/design?${sp.toString()}`);
    }, 250);
    return () => clearTimeout(t);
  }, [dParam, colorId, ink.id, size, qty]);

  // city search
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2 || city) return [];
    const starts: City[] = [];
    const contains: City[] = [];
    for (const c of CITIES) {
      const n = c.n.toLowerCase();
      if (n.startsWith(q)) starts.push(c);
      else if (n.includes(q)) contains.push(c);
      if (starts.length >= 8) break;
    }
    return [...starts, ...contains].slice(0, 8);
  }, [query, city]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (comboRef.current && !comboRef.current.contains(e.target as Node)) setListOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const errors: string[] = [];
  if (!title.trim()) errors.push('Give your moment a title.');
  if (!dateValid) errors.push('Pick a valid date (1900–2100).');
  if (!timeValid) errors.push('Pick a valid time.');
  if (!locValid) errors.push(custom ? 'Enter valid coordinates.' : 'Choose a place from the list.');
  if (!tzValid) errors.push('Choose a valid timezone.');
  if (!utc) errors.push('Complete your moment to see the sky.');

  const checkout = () => {
    if (!design) return;
    const sp = new URLSearchParams({ d: dParam, color: colorId, ink: ink.id, size, qty: String(qty) });
    router.push(`/checkout?${sp.toString()}`);
  };

  const inspire = () => {
    const p = PRESETS[Math.floor(Math.random() * PRESETS.length)];
    setTitle(p.title);
    setDateStr(p.date);
    setTimeStr(p.time);
    setCustom(false);
    setCity(null);
    setQuery(p.city);
    setSubtitleDirty(false);
    setListOpen(true);
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    setGeoBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCustom(true);
        setLatStr(pos.coords.latitude.toFixed(4));
        setLonStr(pos.coords.longitude.toFixed(4));
        setTz(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
        setCity(null);
        setQuery('');
        setGeoBusy(false);
        setSubtitleDirty(false);
      },
      () => setGeoBusy(false),
      { timeout: 8000 }
    );
  };

  const tzOptions = useMemo(() => {
    try {
      return (Intl as unknown as { supportedValuesOf(k: string): string[] }).supportedValuesOf('timeZone');
    } catch {
      return ['UTC'];
    }
  }, []);

  return (
    <div className="designer">
      <div className="preview-stick">
        <div className="preview-frame">
          {mockup ? (
            <div dangerouslySetInnerHTML={{ __html: mockup }} />
          ) : (
            <div className="preview-loading">Charting your sky…</div>
          )}
        </div>
        <p className="muted small" style={{ textAlign: 'center', marginTop: 12 }}>
          Live preview · printed exactly as shown
        </p>
      </div>

      <div>
        <section className="form-section">
          <h2>YOUR MOMENT</h2>
          <div className="field">
            <label htmlFor="title">Title on the shirt</label>
            <input
              id="title"
              type="text"
              value={title}
              maxLength={MAX_TITLE_LEN}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="The Night We Met"
            />
          </div>
          <div className="row row-2">
            <div className="field">
              <label htmlFor="date">Date</label>
              <input
                id="date"
                type="date"
                min="1900-01-01"
                max="2100-12-31"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="time">Local time</label>
              <input id="time" type="time" value={timeStr} onChange={(e) => setTimeStr(e.target.value)} />
            </div>
          </div>
          <button type="button" className="btn btn-ghost btn-small" onClick={inspire}>
            Inspire me
          </button>
        </section>

        <section className="form-section">
          <h2>THE PLACE</h2>
          {!custom && (
            <div className="field combobox" ref={comboRef}>
              <label htmlFor="city">City</label>
              <input
                id="city"
                type="text"
                value={query}
                autoComplete="off"
                onChange={(e) => {
                  setQuery(e.target.value);
                  setCity(null);
                  setListOpen(true);
                  setSubtitleDirty(false);
                }}
                onFocus={() => setListOpen(true)}
                placeholder="Start typing a city…"
              />
              {listOpen && matches.length > 0 && (
                <ul className="combobox-list">
                  {matches.map((c) => (
                    <li
                      key={`${c.n}-${c.c}-${c.la}`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setCity(c);
                        setQuery(`${c.n}, ${COUNTRIES[c.c] || c.c}`);
                        setTz(c.tz);
                        setListOpen(false);
                        setSubtitleDirty(false);
                      }}
                    >
                      <span>{c.n}</span>
                      <span className="cc">{COUNTRIES[c.c] || c.c}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {custom && (
            <>
              <div className="row row-2">
                <div className="field">
                  <label htmlFor="lat">Latitude</label>
                  <input id="lat" type="text" inputMode="decimal" value={latStr} onChange={(e) => { setLatStr(e.target.value); setSubtitleDirty(false); }} placeholder="38.7223" />
                </div>
                <div className="field">
                  <label htmlFor="lon">Longitude</label>
                  <input id="lon" type="text" inputMode="decimal" value={lonStr} onChange={(e) => { setLonStr(e.target.value); setSubtitleDirty(false); }} placeholder="-9.1393" />
                </div>
              </div>
              <div className="field">
                <label htmlFor="tz">Timezone</label>
                <select id="tz" value={tz} onChange={(e) => { setTz(e.target.value); setSubtitleDirty(false); }}>
                  {tzOptions.map((z) => (
                    <option key={z} value={z}>
                      {z}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-ghost btn-small" onClick={() => { setCustom(!custom); setSubtitleDirty(false); }}>
              {custom ? 'Search by city instead' : 'Enter coordinates instead'}
            </button>
            <button type="button" className="btn btn-ghost btn-small" onClick={useMyLocation} disabled={geoBusy}>
              {geoBusy ? 'Locating…' : 'Use my location'}
            </button>
          </div>
          {city && !custom && (
            <p className="muted small" style={{ marginTop: 12, marginBottom: 6 }}>
              {city.la.toFixed(3)}°, {city.lo.toFixed(3)}° · {city.tz}
            </p>
          )}
        </section>

        <section className="form-section">
          <h2>YOUR WORDS</h2>
          <div className="field">
            <label htmlFor="subtitle">Line beneath the title</label>
            <input
              id="subtitle"
              type="text"
              value={subtitle}
              maxLength={MAX_SUBTITLE_LEN}
              onChange={(e) => {
                setSubtitle(e.target.value);
                setSubtitleDirty(true);
              }}
              placeholder="June 14, 2023 · Lisbon, Portugal"
            />
          </div>
        </section>

        <section className="form-section">
          <h2>THE SHIRT</h2>
          <label>Color</label>
          <div className="swatches" role="group" aria-label="Shirt color">
            {SHIRT_COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                className="swatch"
                title={c.name}
                aria-pressed={colorId === c.id}
                style={{ background: c.hex }}
                onClick={() => setColorId(c.id)}
              />
            ))}
          </div>
          <label>Print ink</label>
          <div className="swatches" role="group" aria-label="Ink color">
            {inksForShirt(shirt).map((i) => (
              <button
                key={i.id}
                type="button"
                className="swatch"
                title={i.name}
                aria-pressed={ink.id === i.id}
                style={{ background: i.hex }}
                onClick={() => setInkId(i.id)}
              />
            ))}
          </div>
          <label>Size (unisex)</label>
          <div className="size-row">
            {SIZES.map((s) => (
              <button
                key={s}
                type="button"
                className="size-btn"
                aria-pressed={size === s}
                onClick={() => setSize(s)}
              >
                {s.toUpperCase()}
              </button>
            ))}
          </div>
          <label>Quantity</label>
          <div className="qty-row">
            <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease quantity">
              −
            </button>
            <span style={{ minWidth: 24, textAlign: 'center' }}>{qty}</span>
            <button type="button" onClick={() => setQty((q) => Math.min(5, q + 1))} aria-label="Increase quantity">
              +
            </button>
          </div>
        </section>

        {errors.length > 0 && (
          <div className="error-box">
            {errors.map((e) => (
              <div key={e}>{e}</div>
            ))}
          </div>
        )}

        <div className="price-line">
          <span className="muted">
            {qty} × tee · free standard shipping
          </span>
          <span className="amount">{formatPrice(PRICE_CENTS * qty)}</span>
        </div>
        <button type="button" className="btn" style={{ width: '100%' }} disabled={!design} onClick={checkout}>
          Continue to shipping →
        </button>
      </div>
    </div>
  );
}
