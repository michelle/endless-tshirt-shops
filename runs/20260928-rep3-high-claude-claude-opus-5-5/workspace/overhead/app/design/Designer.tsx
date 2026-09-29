"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { MAX_QTY_PER_LINE, PRODUCT, SHIRT_COLORS, SIZES, Size, colorByKey, formatMoney } from "@/lib/catalog";
import { cart } from "@/lib/cart";
import {
  DEFAULT_DESIGN, Design, INKS, LIMITS, paletteFor, parseDesign, unpackDesign, zonedTimeToUtc,
} from "@/lib/design";
import { renderArtSVG, renderMockupSVG } from "@/lib/render";
import { computeSky, moonPhaseName } from "@/lib/sky";

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

const TITLE_IDEAS = ["The Night We Met", "Hello, World", "Just Married", "Where It Began", "Forever Ago", "Our First Home", "Always Here"];

function placeLabel(r: GeoResult): string {
  const region = r.country_code === "US" || r.country_code === "CA" ? r.admin1 || r.country : r.country;
  return [r.name, region].filter(Boolean).join(", ");
}

function PlaceSearch({ onPick }: { onPick: (r: GeoResult) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<GeoResult[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setBusy(true);
      try {
        const res = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?count=6&language=en&format=json&name=${encodeURIComponent(q.trim())}`,
          { signal: ctrl.signal },
        );
        const data = await res.json();
        setResults(data.results ?? []);
        setOpen(true);
      } catch {
        /* aborted or offline */
      } finally {
        setBusy(false);
      }
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div className="field" ref={boxRef}>
      <span>Where were you?</span>
      <input
        className="input"
        placeholder="Search a city, town or village…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => results.length && setOpen(true)}
        aria-label="Search for a place"
      />
      {open && (results.length > 0 || !busy) && q.trim().length >= 2 && (
        <div className="results" role="listbox">
          {results.length === 0 && <button type="button" disabled>No places found</button>}
          {results.map((r) => (
            <button
              type="button"
              key={r.id}
              onClick={() => {
                onPick(r);
                setQ("");
                setOpen(false);
              }}
            >
              {r.name} <small>{[r.admin1, r.country].filter(Boolean).join(", ")}</small>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function initialDesign(params: URLSearchParams): { design: Design; editId: string | null; size: Size; qty: number } {
  const editId = params.get("edit");
  if (editId) {
    const item = cart.get().find((i) => i.id === editId);
    if (item) return { design: item.design, editId, size: item.size, qty: item.qty };
  }
  const d = params.get("d");
  if (d) {
    try {
      return { design: unpackDesign(d), editId: null, size: "l", qty: 1 };
    } catch {
      /* fall through */
    }
  }
  return { design: DEFAULT_DESIGN, editId: null, size: "l", qty: 1 };
}

export default function Designer() {
  const router = useRouter();
  const [init] = useState(() => initialDesign(new URLSearchParams(window.location.search)));
  const [design, setDesign] = useState<Design>(init.design);
  const [size, setSize] = useState<Size>(init.size);
  const [qty, setQty] = useState(init.qty);
  const [view, setView] = useState<"shirt" | "print">("shirt");
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const editId = init.editId;

  const set = <K extends keyof Design>(k: K, v: Design[K]) => {
    setNotice(null);
    setDesign((d) => ({ ...d, [k]: v }));
  };

  const deferred = useDeferredValue(design);
  const svg = useMemo(
    () => (view === "shirt" ? renderMockupSVG(deferred, "pv") : renderArtSVG(deferred, "pv")),
    [deferred, view],
  );
  const facts = useMemo(() => {
    try {
      const sky = computeSky(zonedTimeToUtc(deferred.date, deferred.time, deferred.tz), deferred.lat, deferred.lon);
      return {
        stars: sky.stars.length,
        moon: sky.moon ? `${moonPhaseName(sky.moon.phase)} (${Math.round(sky.moon.fraction * 100)}% lit)` : "below the horizon",
        planets: sky.planets.map((p) => p.name),
      };
    } catch {
      return null;
    }
  }, [deferred]);

  const pal = paletteFor(design);
  const shirt = colorByKey(design.color);

  function addToBag() {
    let clean: Design;
    try {
      clean = parseDesign(design);
    } catch (e) {
      setNotice({ kind: "err", text: (e as Error).message });
      return;
    }
    if (editId && cart.get().some((i) => i.id === editId)) {
      cart.update(editId, { design: clean, size, qty });
      router.push("/bag");
      return;
    }
    if (!cart.add(clean, size, qty)) {
      setNotice({ kind: "err", text: "Your bag is full. Check out first, then design another." });
      return;
    }
    setNotice({ kind: "ok", text: "Added to your bag." });
  }

  return (
    <div className="wrap designer">
      <div className="preview-col">
        <div className="preview-tabs">
          <button className={`tab ${view === "shirt" ? "active" : ""}`} onClick={() => setView("shirt")}>On the shirt</button>
          <button className={`tab ${view === "print" ? "active" : ""}`} onClick={() => setView("print")}>Print detail</button>
        </div>
        <div
          className={`preview ${view === "print" ? "flat" : ""}`}
          style={{ ["--pv-bg" as string]: shirt.hex }}
        >
          <div className={view === "shirt" ? "shirt" : "flat-art"} dangerouslySetInnerHTML={{ __html: svg }} />
        </div>
        {facts && (
          <div className="sky-facts">
            <span><b>{facts.stars.toLocaleString()}</b> stars above the horizon</span>
            <span>Moon: <b>{facts.moon}</b></span>
            <span>Planets: <b>{facts.planets.length ? facts.planets.join(", ") : "none up"}</b></span>
          </div>
        )}
      </div>

      <div>
        <div className="panel">
          <h2><span className="n">01</span> The moment</h2>
          <p className="hint">We&rsquo;ll compute the sky exactly as it was, in local time at that place.</p>
          <PlaceSearch
            onPick={(r) =>
              setDesign((d) => ({
                ...d,
                lat: Math.round(r.latitude * 1e4) / 1e4,
                lon: Math.round(r.longitude * 1e4) / 1e4,
                tz: r.timezone,
                place: placeLabel(r).slice(0, LIMITS.place),
              }))
            }
          />
          <p className="located">
            Sky over <b style={{ color: "var(--cream)" }}>{design.place || "your location"}</b> · {design.lat.toFixed(3)}, {design.lon.toFixed(3)} · {design.tz.replace(/_/g, " ")}
          </p>
          <div className="row">
            <label className="field">
              <span>Date</span>
              <input className="input" type="date" min="1800-01-01" max="2100-12-31" value={design.date} onChange={(e) => e.target.value && set("date", e.target.value)} />
            </label>
            <label className="field">
              <span>Local time</span>
              <input className="input" type="time" value={design.time} onChange={(e) => e.target.value && set("time", e.target.value)} />
            </label>
          </div>
          <details>
            <summary className="muted" style={{ cursor: "pointer", fontSize: 14 }}>Fine-tune exact coordinates</summary>
            <div className="row" style={{ marginTop: 12 }}>
              <label className="field">
                <span>Latitude</span>
                <input className="input" type="number" step="0.0001" min={-90} max={90} value={design.lat}
                  onChange={(e) => { const v = Number(e.target.value); if (Number.isFinite(v) && v >= -90 && v <= 90) set("lat", v); }} />
              </label>
              <label className="field">
                <span>Longitude</span>
                <input className="input" type="number" step="0.0001" min={-180} max={180} value={design.lon}
                  onChange={(e) => { const v = Number(e.target.value); if (Number.isFinite(v) && v >= -180 && v <= 180) set("lon", v); }} />
              </label>
            </div>
          </details>
        </div>

        <div className="panel">
          <h2><span className="n">02</span> The words</h2>
          <p className="hint">Keep the title short. It&rsquo;s the first thing people read.</p>
          <label className="field">
            <span>Title</span>
            <span className="count">{design.title.length}/{LIMITS.title}</span>
            <input className="input" maxLength={LIMITS.title} value={design.title} onChange={(e) => set("title", e.target.value)} placeholder="The Night We Met" />
          </label>
          <div className="chips">
            {TITLE_IDEAS.map((t) => (
              <button key={t} type="button" className="chip" onClick={() => set("title", t)}>{t}</button>
            ))}
          </div>
          <label className="field">
            <span>A line of your own</span>
            <span className="count">{design.message.length}/{LIMITS.message}</span>
            <input className="input" maxLength={LIMITS.message} value={design.message} onChange={(e) => set("message", e.target.value)} placeholder="and everything after" />
          </label>
          <label className="field">
            <span>Place name, as printed</span>
            <span className="count">{design.place.length}/{LIMITS.place}</span>
            <input className="input" maxLength={LIMITS.place} value={design.place} onChange={(e) => set("place", e.target.value)} placeholder="Brooklyn, New York" />
          </label>
        </div>

        <div className="panel">
          <h2><span className="n">03</span> The look</h2>
          <p className="hint">Garment: <b style={{ color: "var(--cream)" }}>{shirt.label}</b></p>
          <div className="swatches">
            {SHIRT_COLORS.map((c) => (
              <button
                key={c.key}
                type="button"
                title={c.label}
                aria-label={c.label}
                className={`swatch ${design.color === c.key ? "active" : ""}`}
                style={{ background: c.hex }}
                onClick={() => set("color", c.key)}
              />
            ))}
          </div>
          <div className="inks">
            {INKS.map((ink) => {
              const p = paletteFor({ ink: ink.key, color: design.color });
              return (
                <button key={ink.key} type="button" className={`ink ${design.ink === ink.key ? "active" : ""}`} onClick={() => set("ink", ink.key)}>
                  <span className="dot" style={{ background: `linear-gradient(135deg, ${p.ink} 50%, ${p.accent} 50%)`, border: `3px solid ${pal.shirt}` }} />
                  <span>
                    <strong>{ink.label}</strong>
                    <small>{ink.note}</small>
                  </span>
                </button>
              );
            })}
          </div>
          <div className="toggles">
            <label className="toggle"><input type="checkbox" checked={design.lines} onChange={(e) => set("lines", e.target.checked)} /> Constellation lines</label>
            <label className="toggle"><input type="checkbox" checked={design.planets} onChange={(e) => set("planets", e.target.checked)} /> Moon &amp; planets</label>
            <label className="toggle"><input type="checkbox" checked={design.names} onChange={(e) => set("names", e.target.checked)} /> Constellation names</label>
            <label className="toggle"><input type="checkbox" checked={design.grid} onChange={(e) => set("grid", e.target.checked)} /> Altitude grid</label>
          </div>
        </div>

        <div className="panel">
          <h2><span className="n">04</span> Size &amp; bag</h2>
          <p className="hint">{PRODUCT.garment}</p>
          <div className="sizes" role="radiogroup" aria-label="Size">
            {SIZES.map((s) => (
              <button key={s} type="button" role="radio" aria-checked={size === s} className={`size ${size === s ? "active" : ""}`} onClick={() => setSize(s)}>{s}</button>
            ))}
          </div>
          <p className="size-guide">Unisex fit. Chest (flat): S 18″ · M 20″ · L 22″ · XL 24″ · 2XL 26″ · 3XL 28″</p>
          <div className="buy-row">
            <div className="qty" aria-label="Quantity">
              <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Fewer">−</button>
              <span>{qty}</span>
              <button type="button" onClick={() => setQty((q) => Math.min(MAX_QTY_PER_LINE, q + 1))} aria-label="More">+</button>
            </div>
            <div className="price">{formatMoney(PRODUCT.priceCents * qty)}</div>
          </div>
          <button type="button" className="btn btn-gold btn-block" onClick={addToBag}>
            {editId ? "Save changes" : "Add to bag"}
          </button>
          {notice && (
            <div className={`notice ${notice.kind}`}>
              {notice.text} {notice.kind === "ok" && <Link href="/bag">View bag &amp; check out →</Link>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
