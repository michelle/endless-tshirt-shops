"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { SHIRT_COLORS, SHIRT_SIZES, BASE_PRICE_USD } from "@/lib/config";

interface Geo {
  lat: number;
  lng: number;
  label: string;
}

export default function CustomizePage() {
  const [date, setDate] = useState("2015-06-14");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("New York, NY");
  const [title, setTitle] = useState("The Night We Met");
  const [names, setNames] = useState("Emma & Jack");
  const [message, setMessage] = useState("");
  const [color, setColor] = useState("black");
  const [size, setSize] = useState("M");
  const [quantity, setQuantity] = useState(1);

  const [geo, setGeo] = useState<Geo | null>({ lat: 40.7128, lng: -74.006, label: "New York, NY" });
  const [geocoding, setGeocoding] = useState(false);
  const [geoError, setGeoError] = useState("");
  const [checkoutError, setCheckoutError] = useState("");
  const [checkingOut, setCheckingOut] = useState(false);

  const geoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const geocodeLocation = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setGeocoding(true);
    setGeoError("");
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setGeo({ lat: data.lat, lng: data.lng, label: data.label });
      } else {
        setGeoError("Couldn't find that place — try a city and country.");
      }
    } catch {
      setGeoError("Couldn't reach the location service.");
    } finally {
      setGeocoding(false);
    }
  }, []);

  useEffect(() => {
    if (geoTimer.current) clearTimeout(geoTimer.current);
    geoTimer.current = setTimeout(() => geocodeLocation(location), 600);
    return () => {
      if (geoTimer.current) clearTimeout(geoTimer.current);
    };
  }, [location, geocodeLocation]);

  const previewUrl = useMemo(() => {
    const p = new URLSearchParams({
      date,
      lat: String(geo?.lat ?? 0),
      lng: String(geo?.lng ?? 0),
      title: title || "The Night Sky",
      names,
      location: location,
      color,
      format: "svg",
    });
    if (time) p.set("time", time);
    if (message) p.set("message", message);
    return `/api/design?${p.toString()}`;
  }, [date, time, geo, title, names, message, location, color]);

  const total = (BASE_PRICE_USD * quantity).toFixed(2);

  async function handleCheckout() {
    setCheckoutError("");
    if (!geo) {
      setCheckoutError("Please enter a valid location first.");
      return;
    }
    setCheckingOut(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          time: time || undefined,
          lat: geo.lat,
          lng: geo.lng,
          locationLabel: location,
          title,
          names,
          message: message || undefined,
          shirtColor: color,
          size,
          quantity,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCheckoutError(data.error || "Checkout failed.");
        setCheckingOut(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setCheckoutError("Something went wrong. Please try again.");
      setCheckingOut(false);
    }
  }

  return (
    <main>
      <header className="container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 24, paddingBottom: 24 }}>
        <Link href="/" className="serif" style={{ fontSize: 24, letterSpacing: "0.12em", color: "var(--gold)" }}>
          STELLARA
        </Link>
        <Link href="/" style={{ color: "var(--ink-dim)", fontSize: 15 }}>
          ← Back
        </Link>
      </header>

      <section className="container" style={{ paddingBottom: 80 }}>
        <h1 className="serif" style={{ fontSize: 40, fontWeight: 400, textAlign: "center", margin: "0 0 8px" }}>
          Design your star map
        </h1>
        <p style={{ textAlign: "center", color: "var(--ink-dim)", margin: "0 0 40px" }}>
          Every shirt is printed to order from your exact moment.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "start" }}>
          {/* Form */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div className="field">
              <label>Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>

            <div className="field">
              <label>Time (optional, local)</label>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} placeholder="21:00" />
            </div>

            <div className="field">
              <label>Place</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="City, Country"
              />
              {geocoding && <span style={{ fontSize: 13, color: "var(--ink-dim)" }}>Looking up…</span>}
              {geoError && <span className="error">{geoError}</span>}
            </div>

            <div className="field">
              <label>Title</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={40} placeholder="The Night We Met" />
            </div>

            <div className="field">
              <label>Names</label>
              <input type="text" value={names} onChange={(e) => setNames(e.target.value)} maxLength={40} placeholder="Emma & Jack" />
            </div>

            <div className="field">
              <label>Message (optional)</label>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2} maxLength={80} placeholder="Forever and always" />
            </div>

            <div className="field">
              <label>Shirt color</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {SHIRT_COLORS.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setColor(c.key)}
                    title={c.label}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: c.hex,
                      border: color === c.key ? "2px solid var(--gold)" : "1px solid var(--line)",
                      cursor: "pointer",
                    }}
                  />
                ))}
              </div>
              <span style={{ fontSize: 13, color: "var(--ink-dim)" }}>
                {SHIRT_COLORS.find((c) => c.key === color)?.label}
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div className="field">
                <label>Size</label>
                <select value={size} onChange={(e) => setSize(e.target.value)}>
                  {SHIRT_SIZES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Quantity</label>
                <select value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value, 10))}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
              <div style={{ fontSize: 18 }}>
                <span style={{ color: "var(--ink-dim)" }}>Total</span>{" "}
                <span className="serif" style={{ color: "var(--gold)", fontSize: 24 }}>${total}</span>
              </div>
              <button className="btn btn-primary" onClick={handleCheckout} disabled={checkingOut || geocoding}>
                {checkingOut ? "Redirecting…" : "Checkout"}
              </button>
            </div>
            {checkoutError && <div className="error">{checkoutError}</div>}
          </div>

          {/* Preview */}
          <div style={{ position: "sticky", top: 24 }}>
            <div
              style={{
                borderRadius: 20,
                border: "1px solid var(--line)",
                background: "var(--panel)",
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                aspectRatio: "4 / 5",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Star map preview"
                style={{ width: "100%", height: "100%", objectFit: "contain", background: "#0a0d1a" }}
              />
            </div>
            <p style={{ textAlign: "center", color: "var(--ink-dim)", fontSize: 13, marginTop: 12 }}>
              Live preview — the real sky for your moment.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
