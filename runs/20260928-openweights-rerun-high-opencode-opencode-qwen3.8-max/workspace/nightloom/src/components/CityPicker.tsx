'use client';

// Location picker: fuzzy search over ~2,600 world cities (GeoNames, bundled —
// no external geocoding service), plus "use my location" and manual coordinates.

import { useEffect, useMemo, useRef, useState } from 'react';
import { formatCoords } from '@/lib/format';

type City = [string, string, number, number, number]; // name, cc, lat*1000, lon*1000, pop

export interface PlaceValue {
  lat: number;
  lng: number;
  placeLabel: string;
}

export default function CityPicker({
  value,
  onChange,
  error,
}: {
  value: PlaceValue;
  onChange: (v: PlaceValue) => void;
  error?: string;
}) {
  const [cities, setCities] = useState<City[] | null>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [manual, setManual] = useState(false);
  const [geoBusy, setGeoBusy] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    import('@/data/cities.json')
      .then((m) => setCities(m.default as City[]))
      .catch(() => setCities([]));
  }, []);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const results = useMemo(() => {
    if (!cities || query.trim().length < 2) return [];
    const q = query.trim().toLowerCase();
    const out: City[] = [];
    for (const c of cities) {
      const name = c[0].toLowerCase();
      if (name.startsWith(q)) out.push(c);
      else if (name.includes(q)) out.push(c);
      if (out.length >= 40) break;
    }
    // cities list is pre-sorted by population, keep first 8
    return out.slice(0, 8);
  }, [cities, query]);

  function pick(c: City) {
    onChange({
      lat: c[2] / 1000,
      lng: c[3] / 1000,
      placeLabel: `${c[0]}, ${c[1]}`,
    });
    setQuery(`${c[0]}, ${c[1]}`);
    setOpen(false);
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not available in this browser.');
      return;
    }
    setGeoBusy(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoBusy(false);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        // label with nearest bundled city
        let best: City | null = null;
        let bestD = Infinity;
        for (const c of cities ?? []) {
          const dLat = c[2] / 1000 - lat;
          const dLon = c[3] / 1000 - lng;
          const d = dLat * dLat + dLon * dLon;
          if (d < bestD) {
            bestD = d;
            best = c;
          }
        }
        const km = Math.sqrt(bestD) * 111;
        const label =
          best && km <= 120
            ? km <= 25
              ? `${best[0]}, ${best[1]}`
              : `near ${best[0]}, ${best[1]}`
            : formatCoords(lat, lng);
        onChange({ lat: Math.round(lat * 10000) / 10000, lng: Math.round(lng * 10000) / 10000, placeLabel: label });
        setQuery(label);
      },
      () => {
        setGeoBusy(false);
        setGeoError('Could not get your location. Search for a city instead.');
      },
      { timeout: 8000 }
    );
  }

  const hasPlace = Boolean(value.placeLabel);

  return (
    <div ref={boxRef} className="relative">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            className="nl-input"
            placeholder="Search any city — e.g. Lisbon, Kyoto, Recife…"
            value={query}
            aria-invalid={error ? 'true' : undefined}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
              if (!e.target.value.trim()) onChange({ lat: 0, lng: 0, placeLabel: '' });
            }}
            onFocus={() => setOpen(true)}
            autoComplete="off"
          />
          {hasPlace && !manual && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] faint pointer-events-none">
              {formatCoords(value.lat, value.lng)}
            </div>
          )}
        </div>
        <button
          type="button"
          className="nl-btn nl-btn-ghost !px-3 !py-0 text-[11px] whitespace-nowrap"
          onClick={useMyLocation}
          disabled={geoBusy}
          title="Use my current location"
        >
          {geoBusy ? 'Locating…' : '⌖ My location'}
        </button>
        <button
          type="button"
          className="nl-btn nl-btn-ghost !px-3 !py-0 text-[11px] whitespace-nowrap"
          onClick={() => setManual((m) => !m)}
        >
          {manual ? 'Search' : 'Coords'}
        </button>
      </div>

      {manual && (
        <div className="mt-2 grid grid-cols-[1fr_1fr_1.4fr] gap-2">
          <input
            className="nl-input"
            type="number"
            step="0.0001"
            min={-90}
            max={90}
            placeholder="lat"
            value={Number.isFinite(value.lat) && value.placeLabel ? value.lat : ''}
            onChange={(e) =>
              onChange({
                ...value,
                lat: parseFloat(e.target.value) || 0,
                placeLabel: value.placeLabel || 'custom coordinates',
              })
            }
          />
          <input
            className="nl-input"
            type="number"
            step="0.0001"
            min={-180}
            max={180}
            placeholder="lng"
            value={Number.isFinite(value.lng) && value.placeLabel ? value.lng : ''}
            onChange={(e) =>
              onChange({
                ...value,
                lng: parseFloat(e.target.value) || 0,
                placeLabel: value.placeLabel || 'custom coordinates',
              })
            }
          />
          <input
            className="nl-input"
            placeholder="label on shirt"
            maxLength={60}
            value={value.placeLabel}
            onChange={(e) => onChange({ ...value, placeLabel: e.target.value })}
          />
        </div>
      )}

      {geoError && <div className="nl-error">{geoError}</div>}
      {error && <div className="nl-error">{error}</div>}

      {open && results.length > 0 && (
        <ul className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border hairline bg-[#0a0f2b] shadow-2xl">
          {results.map((c) => (
            <li key={`${c[0]}-${c[2]}-${c[3]}`}>
              <button
                type="button"
                className="w-full flex items-center justify-between px-4 py-2.5 text-left text-[13px] hover:bg-[rgba(224,198,143,0.08)]"
                onClick={() => pick(c)}
              >
                <span>
                  {c[0]} <span className="faint">· {c[1]}</span>
                </span>
                <span className="faint text-[11px]">pop {(c[4] / 1000).toFixed(0)}k</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
