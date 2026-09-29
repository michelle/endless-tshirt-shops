"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import StarMapPreview from "./StarMapPreview";
import { PRICE_CENTS, SHIRT_COLORS, SHIRT_SIZES, formatMoney, type ShirtColor, type ShirtSize } from "@/lib/design";

interface PlaceHit {
  display_name: string;
  lat: string;
  lon: string;
}

const SWATCH_CSS: Record<string, string> = {
  black: "#1c1c22",
  "navy blue": "#1d2b4d",
  white: "#e9e9e6",
};

function todayLocal(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function Customizer() {
  const [title, setTitle] = useState("The Night We Met");
  const [date, setDate] = useState(todayLocal());
  const [time, setTime] = useState("21:00");

  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<PlaceHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [place, setPlace] = useState<{ name: string; lat: number; lon: number } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [color, setColor] = useState<ShirtColor>("black");
  const [size, setSize] = useState<ShirtSize>("m");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounced place search via OpenStreetMap Nominatim.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q.length < 3 || place?.name === q) {
      setHits([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&addressdetails=0&q=${encodeURIComponent(q)}`,
          { headers: { Accept: "application/json" } }
        );
        setHits((await res.json()) as PlaceHit[]);
      } catch {
        setHits([]);
      } finally {
        setSearching(false);
      }
    }, 350);
  }, [query, place]);

  const choosePlace = useCallback((hit: PlaceHit) => {
    const short = hit.display_name.split(",").slice(0, 2).join(",").trim();
    setPlace({ name: short, lat: Number(hit.lat), lon: Number(hit.lon) });
    setQuery(short);
    setHits([]);
  }, []);

  const canSubmit = !!place && title.trim().length > 0 && !!date && !!time && !submitting;

  async function submit() {
    setError(null);
    if (!place) {
      setError("Pick a place for your sky first.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          date,
          time,
          place: place.name,
          lat: place.lat,
          lon: place.lon,
          color,
          size,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not start checkout");
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  const previewLat = place?.lat ?? 48.8566;
  const previewLon = place?.lon ?? 2.3522;

  return (
    <div className="customizer-grid">
      <div>
        <div className="form-section">
          <label className="form-label" htmlFor="title">Your headline</label>
          <input
            id="title" type="text" maxLength={40} value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder='e.g. "The Night We Met", "Where It All Began"'
          />
        </div>

        <div className="form-section">
          <label className="form-label">The moment</label>
          <div className="form-row">
            <input type="date" value={date} min="1900-01-01" max={todayLocal()} onChange={(e) => setDate(e.target.value)} />
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
        </div>

        <div className="form-section">
          <label className="form-label" htmlFor="place">The place</label>
          <div className="place-wrap">
            <input
              id="place" type="text" value={query} autoComplete="off"
              onChange={(e) => { setQuery(e.target.value); setPlace(null); }}
              placeholder="Search a city or town…"
            />
            {hits.length > 0 && (
              <div className="place-results">
                {hits.map((h, i) => (
                  <button key={i} type="button" onClick={() => choosePlace(h)}>
                    {h.display_name.split(",").slice(0, 2).join(",")}
                    <span className="place-detail">{h.display_name.split(",").slice(2, 5).join(",")}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className={`place-hint ${place ? "ok" : ""}`}>
            {place
              ? `✓ ${place.name} — ${place.lat.toFixed(4)}, ${place.lon.toFixed(4)}`
              : searching
                ? "Searching…"
                : "We pin the exact sky to these coordinates."}
          </div>
        </div>

        <div className="form-section">
          <label className="form-label">Shirt color</label>
          <div className="swatches">
            {SHIRT_COLORS.map((c) => (
              <button
                key={c} type="button" aria-label={c}
                className={`swatch ${color === c ? "active" : ""}`}
                style={{ background: SWATCH_CSS[c] }}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
        </div>

        <div className="form-section">
          <label className="form-label">Size</label>
          <div className="size-row">
            {SHIRT_SIZES.map((s) => (
              <button
                key={s} type="button"
                className={`size-btn ${size === s ? "active" : ""}`}
                onClick={() => setSize(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="price-line">
          <span className="price">{formatMoney(PRICE_CENTS[size])}</span>
          <span className="price-note">+ $4.95 shipping · printed &amp; shipped on demand</span>
        </div>

        {error && <div className="form-error">{error}</div>}

        <button className="cta" disabled={!canSubmit} onClick={submit}>
          {submitting ? "Taking you to checkout…" : "Design mine — checkout"}
        </button>
      </div>

      <div className="preview-sticky">
        <div className="shirt-stage">
          <StarMapPreview
            date={date} time={time} lat={previewLat} lon={previewLon} title={title} color={color}
          />
        </div>
        <div className="preview-caption">
          Live preview — the real stars over {place ? place.name : "your chosen place"} at your moment.
          {!place && " (Showing Paris until you pick a place.)"}
        </div>
      </div>
    </div>
  );
}
