"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  SHIRT_COLORS,
  SHIRT_SIZES,
  BASE_PRICE_USD,
  SHIPPING_USD,
} from "@/lib/config";

export default function DesignPage() {
  const [date, setDate] = useState("2019-06-14");
  const [locationName, setLocationName] = useState("Paris, France");
  const [lat, setLat] = useState("48.8566");
  const [lng, setLng] = useState("2.3522");
  const [title, setTitle] = useState("The Night We Met");
  const [subtitle, setSubtitle] = useState("");
  const [time, setTime] = useState("21:00");
  const [color, setColor] = useState("black");
  const [size, setSize] = useState("m");
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const previewUrl = useMemo(() => {
    const q = new URLSearchParams({
      date,
      lat,
      lng,
      loc: locationName,
      title,
    });
    if (subtitle) q.set("sub", subtitle);
    if (time) q.set("time", time);
    return `/api/star-map?${q.toString()}`;
  }, [date, lat, lng, locationName, title, subtitle, time]);

  function useMyLocation() {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(4));
        setLng(pos.coords.longitude.toFixed(4));
        setError("");
      },
      () => setError("Could not get your location. Enter coordinates manually.")
    );
  }

  async function checkout() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          lat: parseFloat(lat),
          lng: parseFloat(lng),
          locationName,
          title,
          subtitle: subtitle || undefined,
          time: time || undefined,
          color,
          size,
          quantity,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        setLoading(false);
        return;
      }
      window.location.href = data.url;
    } catch (e) {
      setError("Could not reach the checkout. Please try again.");
      setLoading(false);
    }
  }

  const total = BASE_PRICE_USD * quantity + SHIPPING_USD;

  return (
    <>
      <header className="site-header">
        <div className="container inner">
          <Link href="/" className="brand">
            STELL<span>ARA</span>
          </Link>
          <nav className="nav">
            <Link href="/">Home</Link>
          </nav>
        </div>
      </header>

      <main className="container">
        <div className="design-layout">
          <div className="preview-sticky">
            <div className="preview-frame">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="Your star map preview" />
            </div>
            <p
              style={{
                textAlign: "center",
                color: "var(--ink-dim)",
                fontSize: 13,
                marginTop: 14,
              }}
            >
              Live preview — updates as you type.
            </p>
          </div>

          <div>
            <h2 style={{ fontFamily: "var(--serif)", fontSize: 36, margin: "0 0 8px" }}>
              Design your shirt
            </h2>
            <p style={{ color: "var(--ink-dim)", margin: "0 0 28px" }}>
              Tell us about the moment, and we&apos;ll map the sky.
            </p>

            <div className="field">
              <label>Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="The Night We Met"
                maxLength={40}
              />
            </div>

            <div className="field">
              <label>Subtitle (optional)</label>
              <input
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="Est. 2019"
                maxLength={40}
              />
            </div>

            <div className="field-row">
              <div className="field">
                <label>Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="field">
                <label>Time (local)</label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </div>
            </div>

            <div className="field">
              <label>Location name</label>
              <input
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="Paris, France"
                maxLength={60}
              />
            </div>

            <div className="field-row">
              <div className="field">
                <label>Latitude</label>
                <input
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  inputMode="decimal"
                />
              </div>
              <div className="field">
                <label>Longitude</label>
                <input
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  inputMode="decimal"
                />
              </div>
            </div>
            <div className="field">
              <button type="button" className="btn btn-ghost" onClick={useMyLocation}>
                Use my current location
              </button>
              <div className="hint">
                Latitude &amp; longitude determine the exact sky. Find yours on
                any map app.
              </div>
            </div>

            <div className="field">
              <label>Shirt colour</label>
              <div className="swatches">
                {SHIRT_COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={`swatch ${color === c.id ? "active" : ""}`}
                    style={{ background: c.hex }}
                    title={c.label}
                    onClick={() => setColor(c.id)}
                  />
                ))}
              </div>
              <div className="hint">
                {SHIRT_COLORS.find((c) => c.id === color)?.label}
              </div>
            </div>

            <div className="field">
              <label>Size</label>
              <div className="sizes">
                {SHIRT_SIZES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`size-pill ${size === s ? "active" : ""}`}
                    onClick={() => setSize(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <label>Quantity</label>
              <select
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value, 10))}
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>

            <div className="price-box">
              <div className="price-row">
                <span>
                  Shirt × {quantity}
                </span>
                <span>${(BASE_PRICE_USD * quantity).toFixed(2)}</span>
              </div>
              <div className="price-row">
                <span>Shipping</span>
                <span>${SHIPPING_USD.toFixed(2)}</span>
              </div>
              <div className="price-row total">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>

            {error && (
              <p style={{ color: "#e08a8a", fontSize: 14, marginTop: 16 }}>{error}</p>
            )}

            <button
              className="btn btn-primary"
              style={{ width: "100%", marginTop: 20 }}
              onClick={checkout}
              disabled={loading}
            >
              {loading ? "Redirecting…" : `Checkout — $${total.toFixed(2)}`}
            </button>
            <p
              style={{
                textAlign: "center",
                color: "var(--ink-dim)",
                fontSize: 12,
                marginTop: 14,
              }}
            >
              Secure payment via Stripe. Your shirt is printed only after payment
              succeeds.
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
