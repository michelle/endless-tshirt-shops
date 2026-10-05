"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  COLOR_BY_ID,
  PALETTES,
  SHIRT_COLORS,
  SHIPPING_CENTS,
  SIZES,
  formatMoney,
  priceCents,
  type Size,
} from "@/lib/catalog";
import { encodeDesign, parseDesign, parseSelection, type DesignParams } from "@/lib/schema";

interface Place {
  label: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

const DEFAULT: DesignParams = {
  title: "Ada & Charles",
  subtitle: "The night we met",
  date: "1990-06-15",
  time: "22:30",
  tz: "Europe/London",
  place: "London, United Kingdom",
  lat: 51.5074,
  lng: -0.1278,
  palette: "starlight",
};

const today = new Date().toISOString().slice(0, 10);

export default function Customizer() {
  const [design, setDesign] = useState<DesignParams>(DEFAULT);
  const [color, setColor] = useState("black");
  const [size, setSize] = useState<Size>("m");
  const [quantity, setQuantity] = useState(1);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const skipSearch = useRef(false);

  const set = <K extends keyof DesignParams>(key: K, value: DesignParams[K]) =>
    setDesign((current) => ({ ...current, [key]: value }));

  // Debounced place search.
  useEffect(() => {
    if (skipSearch.current) {
      skipSearch.current = false;
      return;
    }
    const term = query.trim();
    if (term.length < 2) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch(`/api/geocode?q=${encodeURIComponent(term)}`, { signal: controller.signal });
        const data = (await response.json()) as { results: Place[] };
        setResults(data.results ?? []);
        setOpen(true);
      } catch {
        /* ignore aborted searches */
      } finally {
        setSearching(false);
      }
    }, 320);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  function choosePlace(place: Place) {
    skipSearch.current = true;
    setQuery("");
    setResults([]);
    setOpen(false);
    setDesign((current) => ({
      ...current,
      place: place.label,
      lat: Math.round(place.latitude * 1e4) / 1e4,
      lng: Math.round(place.longitude * 1e4) / 1e4,
      tz: place.timezone || "UTC",
    }));
  }

  // Auto-pick a shirt colour that suits the selected palette.
  useEffect(() => {
    const current = COLOR_BY_ID.get(color);
    if (current && !current.recommended.includes(design.palette)) {
      const first = SHIRT_COLORS.find((c) => c.recommended.includes(design.palette));
      if (first) setColor(first.id);
    }
  }, [design.palette, color]);

  const previewDesign = useMemo<DesignParams>(() => {
    const dateOk = /^\d{4}-\d{2}-\d{2}$/.test(design.date) ? design.date : today;
    const timeOk = /^([01]\d|2[0-3]):[0-5]\d$/.test(design.time) ? design.time : "21:00";
    const paletteOk = PALETTES.some((p) => p.id === design.palette) ? design.palette : "starlight";
    return {
      ...design,
      title: design.title.trim() || "Your night",
      subtitle: design.subtitle.trim(),
      date: dateOk,
      time: timeOk,
      palette: paletteOk,
      lat: Number.isFinite(design.lat) ? design.lat : 51.5074,
      lng: Number.isFinite(design.lng) ? design.lng : -0.1278,
      place: design.place.trim() || "Somewhere on Earth",
      tz: design.tz || "UTC",
    };
  }, [design]);

  const previewUrl = `/api/design?d=${encodeDesign(previewDesign)}`;
  const proofUrl = `/api/artwork?d=${encodeDesign(previewDesign)}`;
  const shirt = COLOR_BY_ID.get(color);
  const total = priceCents(size) * quantity + SHIPPING_CENTS;
  const availableColors = SHIRT_COLORS;

  async function buy() {
    setError(null);
    let parsedDesign: DesignParams;
    let parsedSelection;
    try {
      parsedDesign = parseDesign(design);
      parsedSelection = parseSelection({ size, color, quantity });
    } catch (validationError) {
      setError((validationError as Error).message);
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ design: parsedDesign, ...parsedSelection }),
      });
      const data = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !data.url) throw new Error(data.error ?? "Checkout is unavailable.");
      window.location.href = data.url;
    } catch (checkoutError) {
      setError((checkoutError as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="builder-grid">
      <div className="panel">
        <div className="field">
          <label htmlFor="title">Names or title</label>
          <input id="title" maxLength={42} value={design.title} onChange={(e) => set("title", e.target.value)} placeholder="Ada & Charles" />
        </div>
        <div className="field">
          <label htmlFor="subtitle">Subtitle <span className="hint">(optional)</span></label>
          <input id="subtitle" maxLength={56} value={design.subtitle} onChange={(e) => set("subtitle", e.target.value)} placeholder="The night we met" />
        </div>
        <div className="row">
          <div className="field">
            <label htmlFor="date">Date</label>
            <input id="date" type="date" value={design.date} onChange={(e) => set("date", e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="time">Local time</label>
            <input id="time" type="time" value={design.time} onChange={(e) => set("time", e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="place">Place</label>
          <div className="search">
            <input
              id="place"
              value={query || design.place}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              placeholder="Search a city…"
              autoComplete="off"
            />
            {open && (results.length > 0 || searching) && query.trim().length >= 2 && (
              <div className="search-results" role="listbox">
                {searching && results.length === 0 && <button disabled>Searching…</button>}
                {results.map((place) => (
                  <button key={`${place.label}-${place.latitude}`} onClick={() => choosePlace(place)} role="option">
                    {place.label}
                    <span className="muted"> · {place.latitude.toFixed(2)}, {place.longitude.toFixed(2)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="hint">
            {design.lat.toFixed(4)}°, {design.lng.toFixed(4)}° · {design.tz}
            {" · "}
            <button type="button" onClick={() => setAdvanced((v) => !v)} style={{ background: "none", border: 0, color: "var(--gold)", cursor: "pointer", font: "inherit", padding: 0 }}>
              {advanced ? "hide coordinates" : "enter coordinates"}
            </button>
          </div>
          {advanced && (
            <div className="row" style={{ marginTop: 10 }}>
              <input aria-label="Latitude" type="number" step="0.0001" value={design.lat} onChange={(e) => set("lat", Number(e.target.value))} />
              <input aria-label="Longitude" type="number" step="0.0001" value={design.lng} onChange={(e) => set("lng", Number(e.target.value))} />
            </div>
          )}
        </div>

        <div className="field">
          <label>Ink palette</label>
          <div className="palette-options">
            {PALETTES.map((palette) => (
              <button
                key={palette.id}
                className="palette-option"
                aria-pressed={design.palette === palette.id}
                onClick={() => set("palette", palette.id)}
                type="button"
              >
                <span className="palette-dots">
                  <i style={{ background: palette.primary }} />
                  <i style={{ background: palette.accent }} />
                  <i style={{ background: palette.faint }} />
                </span>
                <span className="name">{palette.label}</span>
                <span className="desc">{palette.description}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Shirt colour</label>
          <div className="swatches">
            {availableColors.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`swatch${option.recommended.includes(design.palette) ? "" : " disabled"}`}
                style={{ background: option.hex }}
                title={option.label}
                aria-label={option.label}
                aria-pressed={color === option.id}
                onClick={() => setColor(option.id)}
              />
            ))}
          </div>
          <div className="hint">{shirt?.label} · {design.palette} ink</div>
        </div>

        <div className="field">
          <label>Size</label>
          <div className="size-row">
            {SIZES.map((option) => (
              <button key={option} type="button" className="size-chip" aria-pressed={size === option} onClick={() => setSize(option)}>
                {option.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="field" style={{ maxWidth: 160 }}>
          <label htmlFor="qty">Quantity</label>
          <select id="qty" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))}>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        <div className="summary">
          <span className="price">{formatMoney(total)} <small>USD · incl. shipping</small></span>
        </div>
        <button className="buy" onClick={buy} disabled={busy}>
          {busy ? "Opening checkout…" : "Buy this shirt"}
        </button>
        {error && <p className="error">{error}</p>}
        <p className="secure">Secure payment by Stripe · Printed and shipped by Prodigi</p>
      </div>

      <div className="preview-wrap">
        <div className="preview-frame">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="Live preview of your custom night sky shirt" />
        </div>
        <p className="preview-label">Live proof · updates as you type</p>
        <div className="preview-actions">
          <a href={proofUrl} target="_blank" rel="noreferrer">Open print file</a>
          <a href={previewUrl} target="_blank" rel="noreferrer">Open vector proof</a>
        </div>
      </div>
    </div>
  );
}
