"use client";
import { useDeferredValue, useEffect, useRef, useState } from "react";
import { FlatArt, ShirtMockup, useChart } from "./Shirt";
import { DEFAULT_DESIGN, LIMITS, SHIRTS, SIZES, decodeDesign, type Design, type ShirtColor, type Size } from "@/lib/design";
import { MAX_QTY, PRICE_CENTS, SHIPPING } from "@/lib/catalog";

type GeoResult = {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  timezone: string;
  country?: string;
  country_code?: string;
  admin1?: string;
};

const PRESETS = ["The Night We Met", "Hello, Little One", "Where It All Began", "She Said Yes", "Forever Starts Here", "Born Under These Stars"];

const SIZE_CHART: Record<Size, [number, number]> = {
  xs: [16.5, 27], s: [18, 28], m: [20, 29], l: [22, 30], xl: [24, 31], "2xl": [26, 32], "3xl": [28, 33],
};

const usd = (c: number) => `$${(c / 100).toFixed(c % 100 ? 2 : 0)}`;

function placeLabel(r: GeoResult) {
  const region = r.country_code === "US" || r.country_code === "CA" || r.country_code === "AU" ? r.admin1 : r.country;
  return [r.name, region].filter(Boolean).join(", ").slice(0, LIMITS.place);
}

export default function Studio({ initial, initialSize }: { initial?: string; initialSize?: string }) {
  const [design, setDesign] = useState<Design>(() => {
    if (initial) {
      try {
        return decodeDesign(initial);
      } catch {}
    }
    return DEFAULT_DESIGN;
  });
  const [size, setSize] = useState<Size | null>(SIZES.includes(initialSize as Size) ? (initialSize as Size) : null);
  const [qty, setQty] = useState(1);
  const [view, setView] = useState<"shirt" | "print">("shirt");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeoResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const deferred = useDeferredValue(design);
  const { svg, info } = useChart(deferred);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const set = <K extends keyof Design>(k: K, v: Design[K]) => setDesign((d) => ({ ...d, [k]: v }));

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=8&language=en&format=json`,
        );
        const json = await res.json();
        setResults((json.results ?? []).filter((r: GeoResult) => r.timezone));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);
  }, [query]);

  const choosePlace = (r: GeoResult) => {
    setDesign((d) => ({
      ...d,
      lat: Math.round(r.latitude * 10000) / 10000,
      lon: Math.round(r.longitude * 10000) / 10000,
      tz: r.timezone,
      place: placeLabel(r),
    }));
    setQuery("");
    setResults([]);
  };

  const [date, time] = design.when.split("T");

  async function checkout() {
    setError(null);
    if (!size) {
      setError("Pick a size first.");
      document.getElementById("size-panel")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ design, size, quantity: qty }),
      });
      const json = await res.json();
      if (!res.ok || !json.url) throw new Error(json.error || "Checkout failed");
      window.location.href = json.url;
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  const facts = [
    <span key="s"><b>{info.visibleStars.toLocaleString()}</b> stars above the horizon</span>,
    design.layers.planets ? <span key="m">Moon <b>{info.moonIllumination}%</b> lit</span> : null,
    design.layers.planets && info.planetsUp.length ? <span key="p">Visible planets: <b>{info.planetsUp.join(", ")}</b></span> : null,
  ];

  return (
    <div className="studio">
      <div className="stage">
        <div className="stage-box">
          <div className="stage-tabs">
            <button className={view === "shirt" ? "on" : ""} onClick={() => setView("shirt")}>On the shirt</button>
            <button className={view === "print" ? "on" : ""} onClick={() => setView("print")}>Print file</button>
          </div>
          {view === "shirt" ? <ShirtMockup design={deferred} svg={svg} /> : <FlatArt design={deferred} svg={svg} />}
          <div className="facts">{facts}</div>
        </div>
      </div>

      <div>
        <div className="panel">
          <h3><small>01</small> The moment</h3>
          <label className="f">Where were you?</label>
          <input
            className="input"
            placeholder="Search a city or town…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search for a place"
          />
          {results.length > 0 && (
            <ul className="results">
              {results.map((r) => (
                <li key={r.id}>
                  <button onClick={() => choosePlace(r)}>
                    {r.name} <small>{[r.admin1, r.country].filter(Boolean).join(", ")}</small>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {searching && <div className="hint">Searching…</div>}
          <div className="chosen">
            Sky over <b>{design.place || "—"}</b> · {design.lat.toFixed(3)}, {design.lon.toFixed(3)} · {design.tz}
          </div>
          <div className="row" style={{ marginTop: 14 }}>
            <div>
              <label className="f">Date</label>
              <input className="input" type="date" min="1800-01-01" max="2200-12-31" value={date}
                onChange={(e) => e.target.value && set("when", `${e.target.value}T${time}`)} />
            </div>
            <div>
              <label className="f">Local time</label>
              <input className="input" type="time" value={time}
                onChange={(e) => e.target.value && set("when", `${date}T${e.target.value}`)} />
            </div>
          </div>
          <div className="hint">Local time at that place. Night-time looks best — but the stars are there at noon too.</div>
        </div>

        <div className="panel">
          <h3><small>02</small> Your words</h3>
          <label className="f">Title <span className="count">{design.title.length}/{LIMITS.title}</span></label>
          <input className="input" maxLength={LIMITS.title} value={design.title} onChange={(e) => set("title", e.target.value)} />
          <div className="sizes" style={{ marginTop: 8 }}>
            {PRESETS.map((p) => (
              <button key={p} className="size" style={{ textTransform: "none", fontSize: 13, padding: "6px 10px" }} onClick={() => set("title", p)}>{p}</button>
            ))}
          </div>
          <label className="f" style={{ marginTop: 14 }}>Line underneath <span className="count">{design.message.length}/{LIMITS.message}</span></label>
          <input className="input" maxLength={LIMITS.message} value={design.message} placeholder="optional" onChange={(e) => set("message", e.target.value)} />
          <label className="f" style={{ marginTop: 14 }}>Place name as printed <span className="count">{design.place.length}/{LIMITS.place}</span></label>
          <input className="input" maxLength={LIMITS.place} value={design.place} onChange={(e) => set("place", e.target.value)} />
        </div>

        <div className="panel">
          <h3><small>03</small> Style</h3>
          <label className="f">Shirt colour</label>
          <div className="swatches">
            {(Object.keys(SHIRTS) as ShirtColor[]).map((c) => (
              <button key={c} className={`swatch ${design.shirt === c ? "on" : ""}`} onClick={() => set("shirt", c)}>
                <i style={{ background: SHIRTS[c].fabric }} />
                {SHIRTS[c].label}
              </button>
            ))}
          </div>
          <label className="f" style={{ marginTop: 18 }}>Chart details</label>
          <div className="toggles">
            {([
              ["lines", "Constellation lines"],
              ["names", "Constellation names"],
              ["grid", "Celestial grid"],
              ["planets", "Moon & planets"],
            ] as const).map(([k, label]) => (
              <label key={k} className="toggle">
                <input type="checkbox" checked={design.layers[k]} onChange={(e) => set("layers", { ...design.layers, [k]: e.target.checked })} />
                {label}
              </label>
            ))}
          </div>
        </div>

        <div className="panel" id="size-panel">
          <h3><small>04</small> Size</h3>
          <div className="sizes">
            {SIZES.map((s) => (
              <button key={s} className={`size ${size === s ? "on" : ""}`} onClick={() => setSize(s)}>{s}</button>
            ))}
          </div>
          <table className="sizechart">
            <tbody>
              <tr><th>Size</th>{SIZES.map((s) => <th key={s}>{s.toUpperCase()}</th>)}</tr>
              <tr><td>Width (in)</td>{SIZES.map((s) => <td key={s}>{SIZE_CHART[s][0]}</td>)}</tr>
              <tr><td>Length (in)</td>{SIZES.map((s) => <td key={s}>{SIZE_CHART[s][1]}</td>)}</tr>
            </tbody>
          </table>
          <div className="hint">Bella + Canvas 3001 · unisex retail fit · 100% combed ring-spun cotton (heathers are blends).</div>
        </div>

        <div className="buy">
          <div className="price">
            <div>
              <strong>{usd(PRICE_CENTS * qty)}</strong>{" "}
              <span className="muted">+ shipping from {usd(SHIPPING.Standard.cents)}</span>
            </div>
            <label className="qty">
              Qty
              <select value={qty} onChange={(e) => setQty(Number(e.target.value))}>
                {Array.from({ length: MAX_QTY }, (_, i) => i + 1).map((n) => <option key={n}>{n}</option>)}
              </select>
            </label>
          </div>
          <button className="btn block" onClick={checkout} disabled={busy}>
            {busy ? "Opening secure checkout…" : `Checkout${size ? ` · ${size.toUpperCase()}` : ""} →`}
          </button>
          {error && <div className="error">{error}</div>}
          <div className="hint" style={{ textAlign: "center" }}>Secure payment by Stripe · Printed to order, ships in 2–5 days</div>
        </div>
      </div>
    </div>
  );
}
