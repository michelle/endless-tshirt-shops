"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { COLORS, SIZES } from "@/lib/design";

const CITIES = [
  { label: "Paris", place: "Paris, France", lat: 48.8566, lon: 2.3522 },
  { label: "New York", place: "New York, USA", lat: 40.7128, lon: -74.006 },
  { label: "Tokyo", place: "Tokyo, Japan", lat: 35.6762, lon: 139.6503 },
  { label: "Sydney", place: "Sydney, Australia", lat: -33.8688, lon: 151.2093 },
  { label: "Cape Town", place: "Cape Town, South Africa", lat: -33.9249, lon: 18.4241 },
  { label: "Reykjavik", place: "Reykjavik, Iceland", lat: 64.1466, lon: -21.9426 },
];

const SHIRT_BG: Record<string, string> = {
  black: "#17181c",
  "navy blue": "#1c2440",
  white: "#e8e6e0",
  natural: "#e2d9c4",
  "athletic grey heather": "#9a9ca2",
};

export default function Customizer() {
  const [caption, setCaption] = useState("The Night Everything Changed");
  const [date, setDate] = useState("2024-06-14");
  const [time, setTime] = useState("21:30");
  const [place, setPlace] = useState(CITIES[0].place);
  const [lat, setLat] = useState(String(CITIES[0].lat));
  const [lon, setLon] = useState(String(CITIES[0].lon));
  const [size, setSize] = useState("l");
  const [color, setColor] = useState("black");
  const [imgSrc, setImgSrc] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const seq = useRef(0);

  const query = useMemo(() => {
    const p = new URLSearchParams({
      caption,
      date,
      time,
      place,
      lat,
      lon,
      size,
      color,
    });
    return p.toString();
  }, [caption, date, time, place, lat, lon, size, color]);

  useEffect(() => {
    const id = setTimeout(() => {
      const n = ++seq.current;
      const src = `/api/preview?${query}&n=${n}`;
      const img = new Image();
      img.onload = () => {
        if (seq.current === n) setImgSrc(src);
      };
      img.src = src;
    }, 350);
    return () => clearTimeout(id);
  }, [query]);

  async function buy() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caption,
          date,
          time,
          place,
          lat: Number(lat),
          lon: Number(lon),
          size,
          color,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Checkout failed");
      window.location.href = json.url;
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div className="studio">
      <div className="preview-frame">
        <div
          className="shirt-stage"
          style={{ background: SHIRT_BG[color] || "#17181c" }}
        >
          {imgSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imgSrc} alt="Your custom star map print preview" />
          ) : (
            <span style={{ color: "#666" }}>Charting your sky…</span>
          )}
        </div>
        <div className="preview-caption">
          LIVE PREVIEW — PRINTED AT 300 DPI ON THE FRONT OF YOUR SHIRT
        </div>
      </div>

      <form
        className="customizer"
        onSubmit={(e) => {
          e.preventDefault();
          buy();
        }}
      >
        <h2>Chart your moment</h2>
        <p className="form-sub">
          Every shirt is generated from your date, time and place — no two
          skies are alike.
        </p>

        <div className="field">
          <label>Title of your moment</label>
          <input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            maxLength={48}
            placeholder="The Night We Met"
            required
          />
        </div>

        <div className="field-row">
          <div className="field">
            <label>Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label>Time</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="field">
          <label>Place</label>
          <input
            value={place}
            onChange={(e) => setPlace(e.target.value)}
            maxLength={48}
            placeholder="City, Country"
            required
          />
          <div className="city-picks">
            {CITIES.map((c) => (
              <button
                key={c.label}
                type="button"
                onClick={() => {
                  setPlace(c.place);
                  setLat(String(c.lat));
                  setLon(String(c.lon));
                }}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label>Latitude</label>
            <input
              type="number"
              step="0.0001"
              min="-66"
              max="66"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label>Longitude</label>
            <input
              type="number"
              step="0.0001"
              min="-180"
              max="180"
              value={lon}
              onChange={(e) => setLon(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label>Shirt color</label>
            <select value={color} onChange={(e) => setColor(e.target.value)}>
              {COLORS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Size</label>
            <select value={size} onChange={(e) => setSize(e.target.value)}>
              {SIZES.map((s) => (
                <option key={s} value={s}>
                  {s.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="buy-row">
          <div className="price">
            $38.90
            <small>FREE STANDARD SHIPPING</small>
          </div>
          <button className="buy" type="submit" disabled={loading}>
            {loading ? "One moment…" : "Buy this shirt"}
          </button>
        </div>
        {error && <div className="error-msg">{error}</div>}
      </form>
    </div>
  );
}
