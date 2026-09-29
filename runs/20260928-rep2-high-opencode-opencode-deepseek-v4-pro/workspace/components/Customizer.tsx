"use client";

import { useMemo, useState } from "react";
import StarMapPreview from "./StarMapPreview";
import { SHIRT_COLORS, SHIRT_SIZES, BASE_PRICE_USD, SHIPPING_USD, colorById } from "@/lib/config";

export default function Customizer() {
  const [title, setTitle] = useState("The Night We Met");
  const [date, setDate] = useState("2019-06-14");
  const [locationName, setLocationName] = useState("Brooklyn, NY");
  const [lat, setLat] = useState("40.6782");
  const [lng, setLng] = useState("-73.9442");
  const [color, setColor] = useState("black");
  const [size, setSize] = useState("m");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [geocoding, setGeocoding] = useState(false);

  const ink = colorById(color).ink;

  const preview = useMemo(
    () => ({
      date,
      lat: parseFloat(lat) || 0,
      lng: parseFloat(lng) || 0,
      title: title || "Your Sky",
      locationName: locationName || "Somewhere",
      ink,
    }),
    [date, lat, lng, title, locationName, ink]
  );

  async function handleGeocode() {
    if (!locationName.trim()) return;
    setGeocoding(true);
    setError(null);
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(locationName)}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not find that location");
        return;
      }
      setLat(String(data.lat));
      setLng(String(data.lng));
    } catch {
      setError("Could not look up location");
    } finally {
      setGeocoding(false);
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported in this browser");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(String(pos.coords.latitude.toFixed(4)));
        setLng(String(pos.coords.longitude.toFixed(4)));
        setLocationName("My current location");
      },
      () => setError("Could not access your location")
    );
  }

  async function handleCheckout() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          lat: parseFloat(lat),
          lng: parseFloat(lng),
          title,
          locationName,
          color,
          size,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not start checkout");
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="customizer container">
      <div className="preview-col">
        <div className="preview-frame">
          <StarMapPreview {...preview} />
        </div>
      </div>

      <div className="form-col">
        <h2>Design your sky</h2>
        <p className="hint">
          Pick a moment and a place. We&apos;ll map the stars exactly as they were
          and print them on a premium tee, made just for you.
        </p>

        <div className="field">
          <label htmlFor="title">Title</label>
          <input
            id="title"
            type="text"
            value={title}
            maxLength={40}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="The Night We Met"
          />
        </div>

        <div className="field">
          <label htmlFor="date">Date</label>
          <input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="location">Place</label>
          <input
            id="location"
            type="text"
            value={locationName}
            onChange={(e) => setLocationName(e.target.value)}
            placeholder="Brooklyn, NY"
          />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button
              type="button"
              className="mini-btn"
              onClick={handleGeocode}
              disabled={geocoding}
            >
              {geocoding ? "Looking up…" : "Find coordinates"}
            </button>
            <button type="button" className="mini-btn" onClick={useMyLocation}>
              Use my location
            </button>
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="lat">Latitude</label>
            <input
              id="lat"
              type="number"
              step="0.0001"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="lng">Longitude</label>
            <input
              id="lng"
              type="number"
              step="0.0001"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
            />
          </div>
        </div>

        <div className="field">
          <label>Shirt colour</label>
          <div className="swatches">
            {SHIRT_COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`swatch ${color === c.id ? "selected" : ""}`}
                style={{ background: c.hex }}
                title={c.label}
                aria-label={c.label}
                onClick={() => setColor(c.id)}
              >
                {color === c.id && <span className="check">✓</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Size</label>
          <div className="sizes">
            {SHIRT_SIZES.map((s) => (
              <button
                key={s}
                type="button"
                className={`size-pill ${size === s ? "selected" : ""}`}
                onClick={() => setSize(s)}
              >
                {s.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="price-row">
          <span className="price">
            ${BASE_PRICE_USD.toFixed(2)}{" "}
            <span className="shipping">+ ${SHIPPING_USD.toFixed(2)} shipping</span>
          </span>
        </div>

        <button className="cta" onClick={handleCheckout} disabled={loading}>
          {loading ? "Preparing checkout…" : "Make my shirt"}
        </button>
        <p className="cta-note">
          Secure checkout via Stripe. Your shirt is printed on demand and shipped
          to you — nothing is produced until you pay.
        </p>

        {error && <p className="error">{error}</p>}
      </div>
    </div>
  );
}
