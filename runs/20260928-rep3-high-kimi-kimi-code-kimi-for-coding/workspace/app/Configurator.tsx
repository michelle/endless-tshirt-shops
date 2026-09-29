"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CITIES } from "@/lib/cities-data";
import { zonedTimeToUtc, isValidTz } from "@/lib/time";
import { summarizeSky } from "@/lib/solar";
import { SHIRT_COLORS, SIZES } from "@/lib/preview";

const OCCASIONS: { key: string; caption: string }[] = [
  { key: "custom", caption: "" },
  { key: "met", caption: "the night we met" },
  { key: "wedding", caption: "the day we said I do" },
  { key: "baby", caption: "welcome to the world" },
  { key: "grad", caption: "and so it begins" },
  { key: "memorial", caption: "forever under the same sky" },
  { key: "first", caption: "our first morning" },
];

interface City { n: string; c: string; lat: number; lon: number; tz: string }

function defaultDateTimeLocal(): string {
  // a pleasant golden-hour default: today at sunset-ish local
  const d = new Date(Date.now() - 3 * 3600000);
  d.setMinutes(0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function Configurator() {
  const [occasion, setOccasion] = useState("met");
  const [label, setLabel] = useState("New York, USA");
  const [lat, setLat] = useState(40.71);
  const [lon, setLon] = useState(-74.0);
  const [tz, setTz] = useState("America/New_York");
  const [customPlace, setCustomPlace] = useState(false);
  const [dateTime, setDateTime] = useState(defaultDateTimeLocal());
  const [caption, setCaption] = useState("the night we met");
  const [color, setColor] = useState("black");
  const [size, setSize] = useState("m");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<City[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const ms = useMemo(() => {
    try {
      return zonedTimeToUtc(dateTime, tz);
    } catch {
      return Date.now();
    }
  }, [dateTime, tz]);

  const sky = useMemo(() => {
    try {
      return summarizeSky({ timeMs: ms, lat, lon });
    } catch {
      return null;
    }
  }, [ms, lat, lon]);

  const buildParams = useCallback(() => {
    const q = new URLSearchParams({
      label, lat: lat.toFixed(4), lon: lon.toFixed(4), ms: String(ms), tz, color, size,
    });
    if (caption.trim()) q.set("caption", caption.trim());
    return q.toString();
  }, [label, lat, lon, ms, tz, color, size, caption]);

  // debounced preview
  useEffect(() => {
    const t = setTimeout(() => setPreviewUrl(`/api/preview?${buildParams()}`), 350);
    return () => clearTimeout(t);
  }, [buildParams]);

  // city search
  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) { setResults([]); return; }
    const t = setTimeout(() => {
      const starts: City[] = [], contains: City[] = [];
      for (const c of CITIES as readonly City[]) {
        const name = c.n.toLowerCase();
        if (name.startsWith(q)) starts.push(c);
        else if (name.includes(q)) contains.push(c);
        if (starts.length >= 8) break;
      }
      setResults([...starts, ...contains].slice(0, 8));
    }, 120);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setResults([]);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const pickCity = (c: City) => {
    setLabel(`${c.n}, ${c.c}`);
    setLat(c.lat); setLon(c.lon); setTz(c.tz);
    setCustomPlace(false);
    setQuery(""); setResults([]);
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const la = +pos.coords.latitude.toFixed(4);
      const lo = +pos.coords.longitude.toFixed(4);
      let zone = "UTC";
      try {
        const tzLookup = (await import("tz-lookup")).default;
        zone = tzLookup(la, lo);
      } catch { /* keep UTC */ }
      setLat(la); setLon(lo); setTz(zone);
      setLabel("My special place");
      setCustomPlace(true);
    });
  };

  const skyLine = useMemo(() => {
    if (!sky) return "";
    const kindText = sky.kind === "day" ? "daytime sky" : sky.kind === "golden" ? "golden hour" : "night sky";
    const elTxt = `${sky.elevation >= 0 ? "+" : ""}${sky.elevation.toFixed(0)}°`;
    const extra =
      sky.kind === "night"
        ? ` Moon ${(sky.moon.phase * 100).toFixed(0)}% lit.`
        : sky.sunriseMs && sky.sunsetMs
          ? ` Sunrise ${fmtHm(sky.sunriseMs, tz)} · sunset ${fmtHm(sky.sunsetMs, tz)}.`
          : "";
    return <>Your moment: <b>{kindText}</b> — sun at <b>{elTxt}</b> elevation.{extra}</>;
  }, [sky, tz]);

  async function checkout() {
    setCheckingOut(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, lat, lon, ms, tz, caption, color, size }),
      });
      const data = await res.json();
      if (!res.ok || !data.clientSecret) throw new Error(data.error ?? "Checkout failed to start.");
      sessionStorage.setItem(`cs_${data.piId}`, data.clientSecret);
      const q = new URLSearchParams({ pi: data.piId, pk: data.publishableKey, label });
      window.location.href = `/pay?${q.toString()}`;
    } catch (e: any) {
      setError(e.message ?? "Something went wrong.");
      setCheckingOut(false);
    }
  }

  return (
    <div className="config-shell" id="design">
      <div className="config-left">
        <div className="field">
          <label>The occasion</label>
          <div className="chips">
            {OCCASIONS.map((o) => (
              <button
                key={o.key}
                className={`chip ${occasion === o.key ? "active" : ""}`}
                onClick={() => { setOccasion(o.key); if (o.key !== "custom") setCaption(o.caption); }}
              >
                {o.key === "custom" ? "Write my own" : o.caption}
              </button>
            ))}
          </div>
        </div>

        <div className="field" ref={searchRef}>
          <label>The place</label>
          <div className="search-box">
            <input
              type="text"
              value={query}
              placeholder="Search a city… (e.g. Reykjavík)"
              onChange={(e) => setQuery(e.target.value)}
              onFocus={(e) => e.target.select()}
            />
            {results.length > 0 && (
              <div className="search-results">
                {results.map((c) => (
                  <button key={`${c.n}-${c.c}`} onMouseDown={(e) => { e.preventDefault(); pickCity(c); }}>
                    <span>{c.n}</span><span className="c">{c.c}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="geo-row">
            <button className="mini" onClick={useMyLocation}>📍 Use my location</button>
            <button className="mini" onClick={() => setCustomPlace((v) => !v)}>
              {customPlace ? "Hide custom coordinates" : "Enter exact coordinates"}
            </button>
          </div>
          {customPlace && (
            <div className="custom-coords">
              <input type="number" step="0.0001" value={lat} onChange={(e) => setLat(+e.target.value)} placeholder="Latitude" />
              <input type="number" step="0.0001" value={lon} onChange={(e) => setLon(+e.target.value)} placeholder="Longitude" />
            </div>
          )}
          <div className="search-hint">
            Currently: <b>{label}</b> ({lat.toFixed(2)}, {lon.toFixed(2)}) · {tz.replace(/_/g, " ")}
          </div>
        </div>

        <div className="field">
          <label>The moment (local time at that place)</label>
          <input type="datetime-local" value={dateTime} onChange={(e) => setDateTime(e.target.value)} />
        </div>

        <div className="field">
          <label>Words for the shirt (optional)</label>
          <input
            type="text"
            value={caption}
            maxLength={60}
            placeholder="e.g. the night we said yes"
            onChange={(e) => { setCaption(e.target.value); setOccasion("custom"); }}
          />
        </div>

        <div className="field">
          <label>Shirt colour</label>
          <div className="swatch-grid">
            {SHIRT_COLORS.map((c) => (
              <button
                key={c.prodigi}
                title={c.label}
                className={`swatch ${color === c.prodigi ? "active" : ""}`}
                style={{ background: c.hex }}
                onClick={() => setColor(c.prodigi)}
              />
            ))}
          </div>
        </div>

        <div className="field" style={{ marginBottom: 0 }}>
          <label>Size</label>
          <div className="size-grid">
            {SIZES.map((s) => (
              <button key={s} className={`size-btn ${size === s ? "active" : ""}`} onClick={() => setSize(s)}>
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="config-right">
        <div className="preview-stage">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="Your personalized sky tee preview" />
          ) : (
            <div className="spin" />
          )}
        </div>
        <div className="sky-summary">{skyLine}</div>
        {error && <div className="status-pill err">{error}</div>}
        <div className="buy-row">
          <div className="price">
            $39.99
            <small>INCL. WORLDWIDE SHIPPING · DTG PRINTED TO ORDER</small>
          </div>
          <button className="btn btn-gold" onClick={checkout} disabled={checkingOut}>
            {checkingOut ? "Opening secure checkout…" : "Create my tee →"}
          </button>
        </div>
        <div className="checkout-note">
          Secure payment by Stripe. Your shirt is printed &amp; shipped by Prodigi only after payment succeeds.
        </div>
      </div>
    </div>
  );
}

function fmtHm(ms: number, tz: string): string {
  try {
    return new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(ms));
  } catch {
    return new Date(ms).toISOString().slice(11, 16);
  }
}
