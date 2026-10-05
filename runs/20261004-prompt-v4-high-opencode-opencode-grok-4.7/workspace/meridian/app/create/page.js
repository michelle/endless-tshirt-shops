"use client";

import { useEffect, useMemo, useState } from "react";
import { COLORS, money, SHIPPING_CENTS, SHIRT_CENTS, SIZES } from "../../lib/colors.js";
import { SAMPLE_SPEC } from "../../lib/sample.js";

const PROMPTS = ["The night we met", "The day you arrived", "When we said yes", "First night home", "Under this sky"];

export default function CreatePage() {
  const [spec, setSpec] = useState(SAMPLE_SPEC);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [svg, setSvg] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [cancelled, setCancelled] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem("meridian-spec");
    if (saved) {
      try { setSpec(JSON.parse(saved)); } catch { /* keep sample */ }
    }
    setCancelled(new URLSearchParams(window.location.search).get("cancelled") === "1");
  }, []);

  useEffect(() => {
    sessionStorage.setItem("meridian-spec", JSON.stringify(spec));
  }, [spec]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      setResults(data.results || []);
    }, 280);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const t = setTimeout(async () => {
      const res = await fetch("/api/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(spec),
      });
      if (!res.ok) return;
      setSvg(await res.text());
    }, 250);
    return () => clearTimeout(t);
  }, [spec]);

  const total = SHIRT_CENTS * spec.qty + SHIPPING_CENTS;
  const color = useMemo(() => COLORS.find((c) => c.id === spec.color), [spec.color]);

  function patch(next) {
    setSpec((s) => ({ ...s, ...next }));
    setError("");
  }

  async function checkout() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(spec),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Checkout failed");
      window.location.href = data.url;
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <main className="create-wrap">
      <form className="panel" onSubmit={(e) => { e.preventDefault(); checkout(); }}>
        <div>
          <p className="eyebrow">Make a shirt</p>
          <h1 style={{ fontSize: "clamp(2.4rem, 4vw, 3.6rem)" }}>Tell us the hour.</h1>
          {cancelled && <p className="note">Checkout was cancelled. Your sky is still here.</p>}
        </div>

        <fieldset>
          <legend>The moment</legend>
          <div className="chips">
            {PROMPTS.map((p) => (
              <button type="button" key={p} aria-pressed={spec.title === p} onClick={() => patch({ title: p })}>{p}</button>
            ))}
          </div>
          <label>
            Title, printed on the shirt
            <input maxLength={42} value={spec.title} onChange={(e) => patch({ title: e.target.value })} required />
          </label>
          <label>
            Dedication, optional
            <input maxLength={48} placeholder="For Amina" value={spec.dedication} onChange={(e) => patch({ dedication: e.target.value })} />
          </label>
          <div className="row">
            <label>
              Date
              <input type="date" min="1920-01-01" max="2036-12-31" value={spec.date} onChange={(e) => patch({ date: e.target.value })} required />
            </label>
            <label>
              Local time
              <input type="time" value={spec.time} onChange={(e) => patch({ time: e.target.value })} required />
            </label>
          </div>
          <div className="suggest">
            <label>
              Place
              <input
                placeholder="Search a city"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoComplete="off"
              />
            </label>
            {results.length > 0 && (
              <ul>
                {results.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => {
                        patch({ place: r.label, lat: r.lat, lon: r.lon, tz: r.tz });
                        setQuery("");
                        setResults([]);
                      }}
                    >
                      {r.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <p className="place-chip">{spec.place} · {spec.lat.toFixed(2)}°, {spec.lon.toFixed(2)}°</p>
        </fieldset>

        <fieldset>
          <legend>The shirt</legend>
          <div className="swatches" role="listbox" aria-label="Color">
            {COLORS.map((c) => (
              <button
                type="button"
                key={c.id}
                className="swatch"
                title={c.name}
                aria-label={c.name}
                aria-pressed={spec.color === c.id}
                style={{ background: c.hex }}
                onClick={() => patch({ color: c.id })}
              />
            ))}
          </div>
          <p className="note" style={{ margin: 0 }}>{color?.name}. {color?.ink === "light" ? "Printed in ivory and gold." : "Printed in indigo and copper."}</p>
          <div className="sizes">
            {SIZES.map((s) => (
              <button type="button" key={s.id} aria-pressed={spec.size === s.id} onClick={() => patch({ size: s.id })}>{s.label}</button>
            ))}
          </div>
          <label>
            Quantity
            <select value={spec.qty} onChange={(e) => patch({ qty: Number(e.target.value) })}>
              {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
        </fieldset>

        {error && <p className="error">{error}</p>}
        <button className="btn" type="submit" disabled={busy}>{busy ? "Opening checkout…" : `Pay ${money(total)}`}</button>
        <p className="note">You’ll enter the shipping address on Stripe. We only send the shirt to print after the payment succeeds.</p>
      </form>

      <aside className="sticky">
        <div className="mock" dangerouslySetInnerHTML={{ __html: svg }} />
        <div className="summary"><span>{spec.title || "Untitled"}</span><span>{color?.name} / {spec.size.toUpperCase()}</span></div>
        <div className="summary"><span>Shirt × {spec.qty}</span><span>{money(SHIRT_CENTS * spec.qty)}</span></div>
        <div className="summary"><span>Shipping</span><span>{money(SHIPPING_CENTS)}</span></div>
        <div className="total">{money(total)}</div>
        <p className="note">Preview matches the print file: a 10-inch chart on the chest, transparent everywhere else.</p>
      </aside>
    </main>
  );
}
