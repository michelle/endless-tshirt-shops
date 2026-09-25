"use client";

import { useMemo, useState } from "react";
import {
  buildStarMapInner,
  svgTextRenderer,
  type SkyConfig,
} from "@/lib/starmap";
import { searchCities } from "@/lib/cities";
import { COLORS, SIZES } from "@/lib/catalog";

const TEE_PATH =
  "M 130 50 C 150 38, 250 38, 270 50 L 330 78 C 345 85, 352 98, 348 112 " +
  "L 332 158 C 328 170, 316 176, 305 172 L 288 165 L 288 372 C 288 386, " +
  "278 396, 264 396 L 136 396 C 122 396, 112 386, 112 372 L 112 165 " +
  "L 95 172 C 84 176, 72 170, 68 158 L 52 112 C 48 98, 55 85, 70 78 Z";

interface Place {
  label: string;
  lat: number;
  lng: number;
}

function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function Configurator() {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [title, setTitle] = useState("The Night We Met");
  const [query, setQuery] = useState("");
  const [place, setPlace] = useState<Place | null>(null);
  const [customCoords, setCustomCoords] = useState(false);
  const [customLabel, setCustomLabel] = useState("");
  const [lat, setLat] = useState("40.7128");
  const [lng, setLng] = useState("-74.0060");
  const [date, setDate] = useState(today);
  const [time, setTime] = useState("21:00");
  const [color, setColor] = useState(COLORS[0].id);
  const [size, setSize] = useState("m");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const results = useMemo(
    () => (place && query === place.label ? [] : searchCities(query)),
    [query, place]
  );

  const resolvedPlace: Place | null = customCoords
    ? {
        label: customLabel.trim() || "Somewhere only we know",
        lat: Number(lat),
        lng: Number(lng),
      }
    : place;

  const coordsValid =
    resolvedPlace !== null &&
    isFinite(resolvedPlace.lat) &&
    isFinite(resolvedPlace.lng) &&
    Math.abs(resolvedPlace.lat) <= 90 &&
    Math.abs(resolvedPlace.lng) <= 180;

  const previewSvg = useMemo(() => {
    if (!coordsValid || !resolvedPlace) return null;
    const colorDef = COLORS.find((c) => c.id === color)!;
    const cfg: SkyConfig = {
      lat: resolvedPlace.lat,
      lng: resolvedPlace.lng,
      date,
      time,
      place: resolvedPlace.label,
      title,
      theme: colorDef.theme,
    };
    try {
      const inner = buildStarMapInner(cfg, svgTextRenderer);
      const line = colorDef.theme === "dark" ? "#0a0a0c" : "#d8d8d2";
      return (
        `<svg viewBox="0 0 400 440" xmlns="http://www.w3.org/2000/svg">` +
        `<path d="${TEE_PATH}" fill="${colorDef.hex}" stroke="${line}" stroke-width="2"/>` +
        `<path d="M 163 46 C 178 66, 222 66, 237 46" fill="none" stroke="${line}" stroke-width="2" opacity="0.6"/>` +
        `<svg x="124" y="110" width="152" height="188" viewBox="0 0 1560 1930">${inner}</svg>` +
        `</svg>`
      );
    } catch {
      return null;
    }
  }, [coordsValid, resolvedPlace, date, time, title, color]);

  const canBuy = coordsValid && !busy;

  async function buy() {
    if (!resolvedPlace) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          place: resolvedPlace.label,
          lat: resolvedPlace.lat,
          lng: resolvedPlace.lng,
          date,
          time,
          color,
          size,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "checkout failed");
      window.location.href = json.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <div className="studio" id="design">
      <div className="preview-card">
        {previewSvg ? (
          <div dangerouslySetInnerHTML={{ __html: previewSvg }} />
        ) : (
          <div style={{ padding: "60px 20px", textAlign: "center", color: "var(--ink-dim)" }}>
            Pick a place to see your sky
          </div>
        )}
        <div className="preview-caption">
          Live preview · Bella+Canvas 3001 · DTG print
        </div>
      </div>

      <div className="panel">
        <h2>Design your sky</h2>
        <p className="sub">
          Every order is generated from a real star catalog for your exact
          moment and printed just for you.
        </p>

        <div className="field">
          <label>Your moment</label>
          <input
            value={title}
            maxLength={40}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="The Night We Met"
          />
          <div className="hint">A caption under the star map — a proposal, a birth, a beginning.</div>
        </div>

        <div className="field">
          <label>Place</label>
          {!customCoords ? (
            <>
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPlace(null);
                }}
                placeholder="Search a city — Paris, Tokyo, Sydney…"
              />
              {results.length > 0 && (
                <ul className="city-results">
                  {results.map((r) => (
                    <li
                      key={r.label}
                      onClick={() => {
                        setPlace(r);
                        setQuery(r.label);
                      }}
                    >
                      {r.label}
                    </li>
                  ))}
                </ul>
              )}
              <div className="hint">
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setCustomCoords(true);
                  }}
                  style={{ color: "var(--accent-bright)" }}
                >
                  Enter exact coordinates instead
                </a>
              </div>
            </>
          ) : (
            <>
              <div className="field-row">
                <input value={lat} onChange={(e) => setLat(e.target.value)} placeholder="Latitude" />
                <input value={lng} onChange={(e) => setLng(e.target.value)} placeholder="Longitude" />
              </div>
              <div style={{ height: 10 }} />
              <input
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                placeholder="Label for this spot (e.g. Grandma's porch)"
              />
              <div className="hint">
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setCustomCoords(false);
                  }}
                  style={{ color: "var(--accent-bright)" }}
                >
                  Back to city search
                </a>
              </div>
            </>
          )}
        </div>

        <div className="field-row">
          <div className="field">
            <label>Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="field">
            <label>Time (local)</label>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
        </div>

        <div className="field">
          <label>Shirt color</label>
          <div className="swatches">
            {COLORS.map((c) => (
              <button
                key={c.id}
                className={`swatch${color === c.id ? " selected" : ""}`}
                style={{ background: c.hex }}
                title={c.label}
                onClick={() => setColor(c.id)}
              />
            ))}
          </div>
        </div>

        <div className="field">
          <label>Size</label>
          <div className="sizes">
            {SIZES.map((s) => (
              <button
                key={s}
                className={`size-btn${size === s ? " selected" : ""}`}
                onClick={() => setSize(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="price-row">
          <div>
            <div className="price">{money(3499)}</div>
            <div className="price-note">+ {money(499)} standard tracked shipping</div>
          </div>
          <div className="price-note">One of one. Yours only.</div>
        </div>

        <button className="buy-btn" disabled={!canBuy} onClick={buy}>
          {busy ? "Preparing checkout…" : "Make my shirt"}
        </button>
        {error && <div className="error-box">{error}</div>}
      </div>
    </div>
  );
}
