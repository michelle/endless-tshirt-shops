'use client';

// City picker with lazy-loaded gazetteer (~10k cities with IANA timezones)
// plus browser geolocation and manual coordinates.
import { useEffect, useMemo, useRef, useState } from 'react';

let citiesPromise = null;
function loadCities() {
  if (!citiesPromise) {
    citiesPromise = fetch('/cities.json').then((r) => r.json()).catch(() => []);
  }
  return citiesPromise;
}

const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export default function CitySearch({ value, onSelect }) {
  const [q, setQ] = useState(value?.label || '');
  const [cities, setCities] = useState(null);
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const [geoMsg, setGeoMsg] = useState('');
  const boxRef = useRef(null);

  useEffect(() => {
    const close = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const matches = useMemo(() => {
    if (!cities || !q || q.length < 2) return [];
    const needle = norm(q);
    const starts = [];
    const contains = [];
    for (const [name, country, lat, lng, tz] of cities) {
      const n = norm(name);
      if (n.startsWith(needle)) starts.push([name, country, lat, lng, tz]);
      else if (n.includes(needle) || norm(country).startsWith(needle)) contains.push([name, country, lat, lng, tz]);
      if (starts.length >= 8) break;
    }
    return [...starts.slice(0, 8), ...contains.slice(0, Math.max(0, 8 - starts.length))].slice(0, 8);
  }, [cities, q]);

  const pick = (c) => {
    const [name, country, lat, lng, tz] = c;
    setQ(`${name}, ${country}`);
    setOpen(false);
    onSelect({ label: `${name}, ${country}`, place: `${name}, ${country}`, lat, lng, tz });
  };

  const locate = () => {
    if (!navigator.geolocation) { setGeoMsg('Geolocation is not available in this browser.'); return; }
    setGeoMsg('Locating…');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: la, longitude: lo } = pos.coords;
        const list = await loadCities();
        let best = null;
        let bestD = Infinity;
        for (const [name, country, lat, lng, tz] of list) {
          const d = (lat - la) ** 2 + (lng - lo) ** 2;
          if (d < bestD) { bestD = d; best = [name, country, lat, lng, tz]; }
        }
        setGeoMsg('');
        // use the nearest city's label/timezone but the precise coordinates
        const [name, country, , , tz] = best;
        const label = `Near ${name}, ${country}`;
        setQ(label);
        onSelect({ label, place: label, lat: Math.round(la * 1000) / 1000, lng: Math.round(lo * 1000) / 1000, tz });
      },
      () => setGeoMsg('Could not get your location — search for a city instead.')
    );
  };

  return (
    <div className="city-box" ref={boxRef}>
      <input
        className="input"
        placeholder="City of the moment — e.g. Paris"
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); setHi(0); }}
        onFocus={() => { loadCities().then(setCities); setOpen(true); }}
        onKeyDown={(e) => {
          if (!open || matches.length === 0) return;
          if (e.key === 'ArrowDown') { e.preventDefault(); setHi((hi + 1) % matches.length); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((hi - 1 + matches.length) % matches.length); }
          else if (e.key === 'Enter') { e.preventDefault(); pick(matches[hi]); }
          else if (e.key === 'Escape') setOpen(false);
        }}
        aria-label="City"
      />
      {open && matches.length > 0 && (
        <div className="city-list" role="listbox">
          {matches.map((c, i) => (
            <div key={`${c[0]}${c[1]}${i}`} role="option" aria-selected={i === hi}
              className={`city-item ${i === hi ? 'active' : ''}`}
              onMouseEnter={() => setHi(i)}
              onMouseDown={(e) => { e.preventDefault(); pick(c); }}>
              <span className="cname">{c[0]}</span>
              <span className="cinfo">{c[1]}</span>
            </div>
          ))}
        </div>
      )}
      <div className="hint">
        <button type="button" className="linklike" onClick={locate}>Use my current location</button>
        {geoMsg ? <span> · {geoMsg}</span> : null}
      </div>
    </div>
  );
}
