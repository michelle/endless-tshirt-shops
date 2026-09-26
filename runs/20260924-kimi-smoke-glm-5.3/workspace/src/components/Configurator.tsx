"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import cities from "@/lib/data/cities.json";
import { starmapSvg, skyFacts } from "@/lib/starmap";
import { COLORS, COLORS_BY_ID, OFFERED_SIZES, SIZE_LABELS, priceCents, type Size } from "@/lib/products";
import { MAX_MESSAGE, MAX_NAME, MAX_PLACE, MAX_TITLE, specNumber, type SkySpec } from "@/lib/spec";
import TeeMockup from "./TeeMockup";

type City = [string, string, number, number, string];

const TITLE_PRESETS = [
  "The Night You Were Born",
  "The Night We Met",
  "Our Wedding Night",
  "The Night You Said Yes",
  "A Sky To Remember",
];

const DEFAULT_PLACE: { label: string; lat: number; lng: number; tz: string } = {
  label: "New York, United States",
  lat: 40.713,
  lng: -74.006,
  tz: "America/New_York",
};

function titleCase(s: string): string {
  return s.replace(/\b\w/g, c => c.toUpperCase());
}

export default function Configurator() {
  const [date, setDate] = useState("1990-07-20");
  const [time, setTime] = useState("22:30");
  const [query, setQuery] = useState(DEFAULT_PLACE.label);
  const [place, setPlace] = useState(DEFAULT_PLACE);
  const [showMatches, setShowMatches] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [name, setName] = useState("");
  const [titleChoice, setTitleChoice] = useState(TITLE_PRESETS[0]);
  const [titleCustom, setTitleCustom] = useState("");
  const [message, setMessage] = useState("");
  const [colorId, setColorId] = useState<string>("navy blue");
  const [size, setSize] = useState<Size>("m");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [cancelled, setCancelled] = useState(false);
  const [tzList, setTzList] = useState<string[]>([]);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      setTzList((Intl as unknown as { supportedValuesOf: (k: string) => string[] }).supportedValuesOf("timeZone"));
    } catch { /* older browsers: manual entry still works via place selection */ }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("cancelled")) {
      setCancelled(true);
    }
  }, []);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setShowMatches(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const matches = useMemo<City[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q || q === place.label.toLowerCase()) return [];
    const cs = cities as City[];
    const starts = cs.filter(c => c[0].toLowerCase().startsWith(q));
    const incl = cs.filter(c => !c[0].toLowerCase().startsWith(q) && c[0].toLowerCase().includes(q));
    return [...starts, ...incl].slice(0, 12);
  }, [query, place.label]);

  const color = COLORS_BY_ID[colorId] ?? COLORS[0];
  const title = (titleChoice === "__custom" ? titleCustom : titleChoice) || "The Night Sky Above";

  const spec: SkySpec = useMemo(() => ({
    v: 1,
    date, time,
    tz: place.tz,
    lat: place.lat,
    lng: place.lng,
    place: place.label,
    name: name.trim() || "Your Name Here",
    title,
    message: message.trim(),
    color: colorId,
    size,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [date, time, place, name, title, message, colorId, size]);

  const deferredSpec = useDeferredValue(spec);
  const svg = useMemo(() => starmapSvg(deferredSpec), [deferredSpec]);
  const facts = useMemo(() => skyFacts(deferredSpec), [deferredSpec]);

  const number = specNumber(spec);
  const price = priceCents(size);

  async function checkout() {
    setError("");
    const check = {
      ...spec,
      name: name.trim(),
      title: title.trim() || "The Night Sky Above",
    };
    if (!check.name) { setError("Add a name for the shirt."); return; }
    if (query.trim() && query.trim() !== place.label) {
      setError("Pick your place from the list (or use custom coordinates).");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spec: check }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Checkout could not start.");
      }
      window.location.href = data.url;
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <section id="configure" className="wrap">
      <div className="config-grid">
        {/* ---------------- form ---------------- */}
        <div className="panel">
          <div className="step">
            <div className="step-label"><span className="n">1</span> The moment</div>
            <div className="fields-grid">
              <label className="fld">
                <span className="cap">Date</span>
                <input type="date" value={date} min="1900-01-01" max="2100-12-31"
                  onChange={e => setDate(e.target.value)} />
              </label>
              <label className="fld">
                <span className="cap">Time</span>
                <input type="time" value={time} onChange={e => setTime(e.target.value)} />
              </label>
              <div className="full" ref={boxRef} style={{ position: "relative" }}>
                <label className="fld">
                  <span className="cap">Place</span>
                  <div className="combobox">
                    <input
                      type="text"
                      value={query}
                      placeholder="Search a city…"
                      autoComplete="off"
                      onChange={e => { setQuery(e.target.value); setShowMatches(true); }}
                      onFocus={() => setShowMatches(true)}
                    />
                    {showMatches && matches.length > 0 && (
                      <div className="matches">
                        {matches.map((c, i) => (
                          <button key={i} type="button"
                            onMouseDown={e => {
                              e.preventDefault();
                              setPlace({ label: `${c[0]}, ${c[1]}`, lat: c[2], lng: c[3], tz: c[4] });
                              setQuery(`${c[0]}, ${c[1]}`);
                              setShowMatches(false);
                            }}>
                            {c[0]}, {c[1]}
                            <small>{c[4]}</small>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </label>
              </div>
            </div>
            <p style={{ marginTop: 12, fontSize: 14.5, color: "var(--ink-faint)", fontStyle: "italic" }}>
              {place.lat.toFixed(2)}°, {place.lng.toFixed(2)}° · {place.tz} — the sky is computed for this exact spot and minute.
              {" "}
              <button type="button" className="chip" style={{ padding: "2px 10px", fontSize: 13 }}
                onClick={() => setAdvanced(a => !a)}>
                {advanced ? "hide custom location" : "custom location"}
              </button>
            </p>
            {advanced && (
              <div className="fields-grid" style={{ marginTop: 6 }}>
                <label className="fld">
                  <span className="cap">Latitude</span>
                  <input type="text" value={place.lat} onChange={e => {
                    const v = Number(e.target.value);
                    if (Number.isFinite(v)) setPlace(p => ({ ...p, lat: v }));
                  }} />
                </label>
                <label className="fld">
                  <span className="cap">Longitude</span>
                  <input type="text" value={place.lng} onChange={e => {
                    const v = Number(e.target.value);
                    if (Number.isFinite(v)) setPlace(p => ({ ...p, lng: v }));
                  }} />
                </label>
                <label className="fld full">
                  <span className="cap">Time zone</span>
                  <select value={place.tz} onChange={e => setPlace(p => ({ ...p, tz: e.target.value }))}>
                    {(tzList.length ? tzList : [place.tz]).map(tz => (
                      <option key={tz} value={tz}>{tz}</option>
                    ))}
                  </select>
                </label>
              </div>
            )}
          </div>

          <div className="step">
            <div className="step-label"><span className="n">2</span> The words</div>
            <label className="fld" style={{ display: "block", marginBottom: 14 }}>
              <span className="cap">Name — the headline of the print</span>
              <input
                type="text"
                value={name}
                maxLength={MAX_NAME}
                placeholder="e.g. Elowen Grace"
                onChange={e => setName(e.target.value)}
              />
            </label>
            <label className="fld" style={{ display: "block", marginBottom: 14 }}>
              <span className="cap">Above the name</span>
              <select value={titleChoice} onChange={e => setTitleChoice(e.target.value)}>
                {TITLE_PRESETS.map(t => <option key={t} value={t}>{t}</option>)}
                <option value="__custom">Custom line…</option>
              </select>
            </label>
            {titleChoice === "__custom" && (
              <input
                type="text"
                style={{ marginBottom: 14 }}
                value={titleCustom}
                maxLength={MAX_TITLE}
                placeholder={titleCase("a line of your own")}
                onChange={e => setTitleCustom(e.target.value)}
              />
            )}
            <label className="fld">
              <span className="cap">A personal note (optional)</span>
              <input
                type="text"
                value={message}
                maxLength={MAX_MESSAGE}
                placeholder="e.g. For Elowen — with all our love"
                onChange={e => setMessage(e.target.value)}
              />
            </label>
          </div>

          <div className="step">
            <div className="step-label"><span className="n">3</span> The shirt</div>
            <div className="swatches" style={{ marginBottom: 18 }}>
              {COLORS.map(c => (
                <button
                  key={c.id}
                  type="button"
                  title={`${c.label}${c.ink === "light" ? " — light ink" : " — dark ink"}`}
                  className={`swatch${c.id === colorId ? " on" : ""}${c.ink === "light" ? " light-on" : ""}`}
                  style={{ ["--sw" as string]: c.swatch }}
                  onClick={() => setColorId(c.id)}
                >
                  <span className="tick">{c.id === colorId ? "✓" : ""}</span>
                </button>
              ))}
            </div>
            <div className="sizes">
              {OFFERED_SIZES.map(s => (
                <button key={s} type="button" className={`size${s === size ? " on" : ""}`}
                  onClick={() => setSize(s)}>
                  {SIZE_LABELS[s]}
                </button>
              ))}
            </div>
            <p style={{ marginTop: 14, fontSize: 14.5, color: "var(--ink-faint)", fontStyle: "italic" }}>
              Gildan Softstyle 64000 · 100% cotton · direct-to-garment printed in {color.label.toLowerCase()}.
              Ink auto-adapts: {color.ink === "light" ? "ivory & gold" : "ink & gold"} on {color.label.toLowerCase()}.
            </p>
          </div>
        </div>

        {/* ---------------- preview ---------------- */}
        <div className="preview-panel">
          <div className="panel">
            <TeeMockup color={color}>
              <div
                aria-label="Your chart"
                dangerouslySetInnerHTML={{ __html: svg }}
              />
            </TeeMockup>
            <div className="factline">
              <span>{facts.moon ?? "—"}</span>
              {facts.planets.length > 0 && <span>{facts.planets.join(" & ")} above the horizon</span>}
              <span>{facts.utc.toISOString().slice(0, 16).replace("T", " ")} UTC</span>
            </div>
            <div className="price-row">
              <div className="price">
                ${(price / 100).toFixed(0)}
                <small>one shirt · US shipping included</small>
              </div>
              <div className="no">
                № {number}
                <small>printed once, for one person</small>
              </div>
            </div>
            <button className="cta" type="button" onClick={checkout} disabled={busy}>
              {busy ? "Opening checkout…" : "Continue to payment"}
            </button>
            <div className="cta-note">
              Secure checkout with Stripe · printed and shipped via Prodigi only after payment
            </div>
            <div className="formerr">{error}</div>
            {cancelled && !error && (
              <div className="formerr" style={{ color: "var(--ink-faint)" }}>
                Checkout was cancelled — your design is still here.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
