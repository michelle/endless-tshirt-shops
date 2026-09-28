"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type ColorChoice = "navy" | "black" | "forest" | "charcoal" | "white";
type SizeChoice = "xs" | "s" | "m" | "l" | "xl" | "xxl" | "3xl" | "4xl";

const COLORS: { id: ColorChoice; label: string; hex: string }[] = [
  { id: "navy", label: "Midnight Navy", hex: "#0e1f3a" },
  { id: "black", label: "Black", hex: "#111111" },
  { id: "forest", label: "Deep Forest", hex: "#1f3a2c" },
  { id: "charcoal", label: "Charcoal", hex: "#2a2a2a" },
  { id: "white", label: "Bone", hex: "#f4f1ec" },
];
const SIZES: SizeChoice[] = ["xs", "s", "m", "l", "xl", "xxl", "3xl", "4xl"];

interface CityPick {
  name: string;
  lat: number;
  lon: number;
}

const CITIES: CityPick[] = [
  { name: "New York", lat: 40.7128, lon: -74.0060 },
  { name: "San Francisco", lat: 37.7749, lon: -122.4194 },
  { name: "London", lat: 51.5074, lon: -0.1278 },
  { name: "Paris", lat: 48.8566, lon: 2.3522 },
  { name: "Tokyo", lat: 35.6762, lon: 139.6503 },
  { name: "Sydney", lat: -33.8688, lon: 151.2093 },
  { name: "Cape Town", lat: -33.9249, lon: 18.4241 },
  { name: "Reykjavik", lat: 64.1466, lon: -21.9426 },
  { name: "Buenos Aires", lat: -34.6037, lon: -58.3816 },
];

function nowUtcIso(): string {
  const d = new Date();
  // round to the nearest minute for cleanliness
  d.setSeconds(0, 0);
  return d.toISOString();
}

function toInputValue(iso: string): string {
  // datetime-local wants "YYYY-MM-DDTHH:MM" in local time, but we treat it as UTC for honesty.
  return iso.replace(/:\d{2}\.\d{3}Z$/, "").slice(0, 16);
}

export default function Home() {
  const [phrase, setPhrase] = useState("Sarah & Mike");
  const [phrase2, setPhrase2] = useState("Est. 2019");
  const [place, setPlace] = useState("Brooklyn, NY");
  const [lat, setLat] = useState(40.7128);
  const [lon, setLon] = useState(-74.006);
  const [date, setDate] = useState(toInputValue(nowUtcIso()));
  const [color, setColor] = useState<ColorChoice>("navy");
  const [size, setSize] = useState<SizeChoice>("m");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // Pre-render the moment the page loads so the preview isn't blank.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("canceled") === "1") {
      setInfo("Checkout was canceled. Nothing was charged. Try again whenever you're ready.");
    }
  }, []);

  const previewPayload = useMemo(
    () => ({
      phrase,
      phrase2,
      place,
      date: date.length === 16 ? `${date}:00Z` : date,
      lat,
      lon,
      color,
      size,
      width: 720,
    }),
    [phrase, phrase2, place, date, lat, lon, color, size],
  );

  useEffect(() => {
    let cancelled = false;
    const handle = setTimeout(async () => {
      setPreviewError(null);
      try {
        const res = await fetch("/api/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(previewPayload),
        });
        if (!res.ok) throw new Error(`Preview ${res.status}`);
        const blob = await res.blob();
        if (cancelled) return;
        // revoke previous URL to avoid leaks
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(URL.createObjectURL(blob));
      } catch (err) {
        if (!cancelled) setPreviewError((err as Error).message);
      }
    }, 220);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewPayload]);

  function pickCity(c: CityPick) {
    setPlace(c.name);
    setLat(c.lat);
    setLon(c.lon);
  }

  async function handleBuy() {
    setSubmitting(true);
    setSubmitErr(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phrase,
          phrase2,
          place,
          date: previewPayload.date,
          lat,
          lon,
          color,
          size,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      if (json.mode === "stripe" && json.url) {
        window.location.href = json.url;
      } else if (json.mode === "demo" && json.redirect) {
        window.location.href = json.redirect;
      } else {
        throw new Error("Unexpected response from server");
      }
    } catch (err) {
      setSubmitErr((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const bg = COLORS.find((c) => c.id === color)?.hex ?? "#0e1f3a";

  return (
    <div className="page-head">
      <section>
        <h1>A sundial for your moment.</h1>
        <p className="lead">
          Every GNOMON tee is a hand-typeset sundial plate, drawn from the precise
          position of the sun at a place and time you choose. Anniversary,
          newborn, the night you met — every shirt is one of one, printed
          just for you with direct-to-garment ink on heavyweight cotton.
        </p>

        {info && <div className="banner info">{info}</div>}

        <div className="form-card">
          <div className="form-grid">
            <div className="field">
              <label>
                Top inscription <span className="help">— name, phrase, date (≤ 28 chars)</span>
              </label>
              <input
                value={phrase}
                maxLength={28}
                onChange={(e) => setPhrase(e.target.value)}
                placeholder="Sarah & Mike"
              />
            </div>
            <div className="field">
              <label>Sub-inscription <span className="help">— optional subtitle</span></label>
              <input
                value={phrase2}
                maxLength={28}
                onChange={(e) => setPhrase2(e.target.value)}
                placeholder="Est. 2019"
              />
            </div>

            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label>Moment (UTC) <span className="help">— when the sun was where you were</span></label>
              <input
                type="datetime-local"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div className="field">
              <label>Place <span className="help">— printed on the cartouche</span></label>
              <input value={place} maxLength={32} onChange={(e) => setPlace(e.target.value)} placeholder="Brooklyn, NY" />
              <div className="city-suggestions">
                {CITIES.map((c) => (
                  <button key={c.name} type="button" className="chip" onClick={() => pickCity(c)}>
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <label>
                Coordinates <span className="help">— auto-fills from a city, or enter yours (decimal degrees)</span>
              </label>
              <div className="field-row">
                <input
                  type="number"
                  step="0.0001"
                  value={lat}
                  min={-90}
                  max={90}
                  onChange={(e) => setLat(Number(e.target.value))}
                />
                <input
                  type="number"
                  step="0.0001"
                  value={lon}
                  min={-180}
                  max={180}
                  onChange={(e) => setLon(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="field">
              <label>Color</label>
              <div className="color-row">
                {COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="swatch"
                    aria-label={c.label}
                    title={c.label}
                    style={{ background: c.hex }}
                    data-selected={color === c.id}
                    onClick={() => setColor(c.id)}
                  />
                ))}
              </div>
              <small className="preview-meta">{COLORS.find((c) => c.id === color)?.label}</small>
            </div>

            <div className="field">
              <label>Size</label>
              <div className="size-row">
                {SIZES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="chip"
                    data-selected={size === s}
                    onClick={() => setSize(s)}
                  >
                    {s.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="price-card">
            <div>
              <div className="total">$38.95</div>
              <div className="each-line">free worldwide shipping · DTG-printed in your colour and size</div>
            </div>
            <button
              type="button"
              className="pay-btn"
              disabled={submitting}
              onClick={handleBuy}
            >
              {submitting ? "Preparing…" : "Buy this shirt"}
            </button>
          </div>
          {submitErr && <div className="banner warn" style={{ marginTop: 18 }}>{submitErr}</div>}
        </div>

        <div className="story">
          <p>
            <strong>Engraved sun geometry.</strong>
            <br />
            Each plate is drawn from NOAA-grade solar math: declination, hour
            angle, the gnomon's shadow at your moment. The Roman hour ticks
            mark the local daylight.
          </p>
          <p>
            <strong>One of one — printed only for you.</strong>
            <br />
            Your inscription and coordinates are typeset into the cartouche.
            No two shirts share the same design.
          </p>
          <p>
            <strong>Printed in your colour, your size.</strong>
            <br />
            Bella+Canvas 3001 cotton, 4.2 oz, ring-spun. DTG-ink, cured, then
            packed. Ships from the nearest of 30+ print labs.
          </p>
        </div>
      </section>

      <aside>
        <div className="preview-card">
          <div className="preview-stage">
            <div className="preview-shirt">
              <div className="preview-image">
                {previewUrl ? (
                  <img src={previewUrl} alt="Your sundial design" />
                ) : previewError ? (
                  <div className="banner warn" style={{ margin: 0 }}>
                    {previewError}
                  </div>
                ) : (
                  <div className="banner info" style={{ margin: 0 }}>
                    Rendering your moment…
                  </div>
                )}
              </div>
            </div>
            <div className="preview-meta">
              {date.replace("T", " ")} UTC · {lat.toFixed(2)}°, {lon.toFixed(2)}°<br />
              {COLORS.find((c) => c.id === color)?.label} · size {size.toUpperCase()}
            </div>
          </div>
          <div style={{ marginTop: 12, fontStyle: "italic", color: "var(--soft)", fontSize: 14 }}>
            A sundial plate is a piece of engraved paper — what you see is exactly
            what we'll print, framed by the moment you chose.
          </div>
          {bg && <div style={{ display: "none" }}>{bg}</div>}
        </div>
      </aside>
    </div>
  );
}
