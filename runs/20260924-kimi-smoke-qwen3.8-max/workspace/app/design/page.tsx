'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import {
  Design,
  GARMENT_COLORS,
  PALETTE_LIST,
  RADII,
  RADIUS_LABELS,
  SIZES,
  decodeDesign,
  encodeDesign,
  sizeLabel,
  garmentColor,
  suggestedPalette,
} from '@/lib/design';
import { PRESETS } from '@/lib/presets';
import { formatCents, SHIRT_UNIT_CENTS } from '@/lib/pricing';

type GeoResult = {
  name: string;
  admin1: string;
  country: string;
  lat: number;
  lon: number;
};

const DEFAULT_DESIGN: Design = {
  lat: 46.0207,
  lon: 7.6586,
  radiusKm: 10,
  label: 'The Matterhorn',
  caption: '',
  date: '',
  palette: 'bone',
};

export default function DesignPage() {
  return (
    <Suspense fallback={<Header compact />}>
      <DesignStudio />
    </Suspense>
  );
}

function DesignStudio() {
  const router = useRouter();
  const params = useSearchParams();

  const initial = useMemo(() => {
    const d = params.get('d');
    if (d) {
      const decoded = decodeDesign(d);
      if (decoded) return decoded;
    }
    return DEFAULT_DESIGN;
  }, [params]);

  const [design, setDesign] = useState<Design>(initial);
  const [color, setColor] = useState<string>('black');
  const [size, setSize] = useState<string>('m');
  const [qty, setQty] = useState<number>(1);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeoResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [geoError, setGeoError] = useState('');

  const [previewSrc, setPreviewSrc] = useState('');
  const [imgState, setImgState] = useState<'loading' | 'ready' | 'error'>('loading');
  const debouncer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const garment = garmentColor(color);
  const tone = garment?.tone ?? 'dark';

  // debounce preview + URL sync
  useEffect(() => {
    if (debouncer.current) clearTimeout(debouncer.current);
    debouncer.current = setTimeout(() => {
      const encoded = encodeDesign(design);
      setImgState('loading');
      setPreviewSrc(`/api/render?d=${encodeURIComponent(encoded)}&w=830`);
      const url = new URL(window.location.href);
      url.searchParams.set('d', encoded);
      window.history.replaceState(null, '', url.toString());
    }, 450);
    return () => {
      if (debouncer.current) clearTimeout(debouncer.current);
    };
  }, [design]);

  // search debounce
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults(null);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        setResults(data.results ?? []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [query]);

  const set = useCallback(<K extends keyof Design>(k: K, v: Design[K]) => {
    setDesign((d) => ({ ...d, [k]: v }));
  }, []);

  const pickResult = (r: GeoResult) => {
    setDesign((d) => ({
      ...d,
      lat: r.lat,
      lon: r.lon,
      label: r.name.slice(0, 40),
      palette: PALETTE_LIST.some((p) => p.id === d.palette) ? d.palette : suggestedPalette(tone),
    }));
    setQuery('');
    setResults(null);
    setGeoError('');
  };

  const useMyLocation = () => {
    setGeoError('');
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not available in this browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = Math.round(pos.coords.latitude * 1e4) / 1e4;
        const lon = Math.round(pos.coords.longitude * 1e4) / 1e4;
        try {
          const res = await fetch(`/api/geocode?lat=${lat}&lon=${lon}`);
          const data = await res.json();
          const r = data.results?.[0];
          pickResult({ name: r?.name ?? 'My location', admin1: r?.admin1 ?? '', country: r?.country ?? '', lat, lon });
        } catch {
          pickResult({ name: 'My location', admin1: '', country: '', lat, lon });
        }
      },
      () => setGeoError('Could not get your location. Search for a place instead.'),
      { timeout: 10000 },
    );
  };

  const surprise = () => {
    const p = PRESETS[Math.floor(Math.random() * PRESETS.length)];
    setDesign({ ...p.design });
    setColor(p.design.palette === 'moss' || p.design.palette === 'ink' || p.design.palette === 'clay' ? 'cream' : 'black');
  };

  const pickColor = (id: string) => {
    setColor(id);
    const g = garmentColor(id);
    if (g) {
      // if current palette doesn't suit the new garment tone, suggest one
      const pal = PALETTE_LIST.find((p) => p.id === design.palette);
      if (pal && pal.forGarment !== g.tone) set('palette', suggestedPalette(g.tone));
    }
  };

  const continueToCheckout = () => {
    const encoded = encodeDesign(design);
    router.push(`/checkout?d=${encodeURIComponent(encoded)}&color=${encodeURIComponent(color)}&size=${encodeURIComponent(size)}&qty=${qty}`);
  };

  const lineTotal = SHIRT_UNIT_CENTS * qty;

  return (
    <>
      <Header compact />
      <main className="container studio">
        {/* ---------- controls ---------- */}
        <div className="studio-controls">
          <div className="panel">
            {/* 1 · place */}
            <div className="field-group">
              <div className="field-label">
                <span>01 · The place</span>
                <button className="linklike tiny" onClick={surprise} type="button">
                  surprise me
                </button>
              </div>
              <input
                type="text"
                value={query}
                placeholder="Search any place on Earth…"
                onChange={(e) => setQuery(e.target.value)}
              />
              {searching && <p className="tiny" style={{ marginTop: 8 }}>searching…</p>}
              {results && results.length > 0 && (
                <div className="search-results">
                  {results.map((r, i) => (
                    <button key={i} type="button" onClick={() => pickResult(r)}>
                      {r.name}
                      {r.admin1 || r.country ? (
                        <span className="region">
                          {' '}— {[r.admin1, r.country].filter(Boolean).join(', ')}
                        </span>
                      ) : null}
                    </button>
                  ))}
                </div>
              )}
              {results && results.length === 0 && !searching && query.trim().length >= 2 && (
                <p className="tiny" style={{ marginTop: 8 }}>
                  No matches — try a different spelling.
                </p>
              )}
              <div style={{ marginTop: 10, display: 'flex', gap: 14, alignItems: 'center' }}>
                <button className="linklike tiny" type="button" onClick={useMyLocation}>
                  use my current location
                </button>
                <span className="tiny mono">
                  {design.lat.toFixed(4)}, {design.lon.toFixed(4)}
                </span>
              </div>
              {geoError && <p className="error-note">{geoError}</p>}
            </div>

            {/* 2 · scale */}
            <div className="field-group">
              <div className="field-label">
                <span>02 · How much ground</span>
              </div>
              <div className="seg-row">
                {RADII.map((r) => (
                  <button
                    key={r}
                    type="button"
                    className={`seg ${design.radiusKm === r ? 'active' : ''}`}
                    onClick={() => set('radiusKm', r)}
                  >
                    {r} km
                  </button>
                ))}
              </div>
              <span className="seg-sub">{RADIUS_LABELS[design.radiusKm]}</span>
            </div>

            {/* 3 · words */}
            <div className="field-group">
              <div className="field-label">
                <span>03 · The words</span>
                <span className="hint">printed below the map</span>
              </div>
              <div style={{ display: 'grid', gap: 10 }}>
                <input
                  type="text"
                  value={design.label}
                  maxLength={40}
                  placeholder="Place name"
                  onChange={(e) => set('label', e.target.value.slice(0, 40))}
                />
                <input
                  type="text"
                  value={design.caption}
                  maxLength={70}
                  placeholder="A line that means something (optional)"
                  onChange={(e) => set('caption', e.target.value.slice(0, 70))}
                />
                <input
                  type="date"
                  value={design.date}
                  max={new Date(Date.now() + 366 * 86400000).toISOString().slice(0, 10)}
                  onChange={(e) => set('date', e.target.value)}
                />
              </div>
            </div>

            {/* 4 · ink */}
            <div className="field-group">
              <div className="field-label">
                <span>04 · The ink</span>
                <span className="hint">{tone === 'dark' ? 'for dark garments' : 'for light garments'} shown first</span>
              </div>
              <div className="palette-row">
                {[...PALETTE_LIST]
                  .sort((a, b) => (a.forGarment === tone ? -1 : 1) - (b.forGarment === tone ? -1 : 1))
                  .map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className={`palette-btn ${design.palette === p.id ? 'active' : ''}`}
                      onClick={() => set('palette', p.id)}
                      title={`${p.name} — best on ${p.forGarment} garments`}
                    >
                      <span className="palette-dots" style={{ background: p.swatchCss }} />
                      <span className="palette-name">{p.name}</span>
                    </button>
                  ))}
              </div>
            </div>

            {/* 5 · garment */}
            <div className="field-group">
              <div className="field-label">
                <span>05 · The tee</span>
                <span className="hint">Bella+Canvas 3001</span>
              </div>
              <div className="color-row" style={{ marginBottom: 14 }}>
                {GARMENT_COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    title={c.name}
                    aria-label={c.name}
                    className={`color-btn ${color === c.id ? 'active' : ''}`}
                    style={{ background: c.hex }}
                    onClick={() => pickColor(c.id)}
                  />
                ))}
              </div>
              <div className="seg-row" style={{ marginBottom: 14 }}>
                {SIZES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`seg ${size === s ? 'active' : ''}`}
                    onClick={() => setSize(s)}
                  >
                    {sizeLabel(s)}
                  </button>
                ))}
              </div>
              <div className="field-label">
                <span>Quantity</span>
              </div>
              <div className="qty-row">
                {[1, 2, 3].map((q) => (
                  <button
                    key={q}
                    type="button"
                    className={`qty-btn ${qty === q ? 'active' : ''}`}
                    onClick={() => setQty(q)}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ---------- preview ---------- */}
        <div className="studio-preview">
          <div className="preview-stage" style={{ background: garment?.hex ?? '#17171a' }}>
            {imgState === 'loading' && <div className="preview-loading">drawing contours…</div>}
            {imgState === 'error' && (
              <div className="preview-loading" style={{ background: 'rgba(0,0,0,.55)' }}>
                terrain unavailable — try another place or radius
              </div>
            )}
            {previewSrc && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={previewSrc}
                src={previewSrc}
                alt="Design preview"
                onLoad={() => setImgState('ready')}
                onError={() => setImgState('error')}
              />
            )}
          </div>
          <div className="preview-meta">
            <div className="price-tag">
              {formatCents(lineTotal)}
              <span className="per">
                {formatCents(SHIRT_UNIT_CENTS)} each · shipping added at checkout
              </span>
            </div>
            <button className="btn btn-accent" type="button" onClick={continueToCheckout}>
              Continue to checkout →
            </button>
          </div>
          <p className="tiny" style={{ textAlign: 'center' }}>
            What you see is what gets printed — the preview is generated from the same 300-DPI
            render the print lab receives, on a transparent background that lets the garment
            colour through.
          </p>
        </div>
      </main>
    </>
  );
}
