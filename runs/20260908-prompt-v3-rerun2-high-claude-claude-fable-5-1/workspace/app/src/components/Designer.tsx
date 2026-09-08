"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_DESIGN,
  Design,
  LIMITS,
  MAX_QUANTITY,
  SHIRT_COLORS,
  SHIRT_SIZES,
  UNIT_PRICE_CENTS,
} from "@/lib/design";
import { computeSky } from "@/lib/starmap";
import { ShirtMockup } from "./ShirtMockup";

interface Place {
  label: string;
  lat: number;
  lon: number;
  tz: string;
}

const EXAMPLES: Array<{ name: string; patch: Partial<Design> }> = [
  {
    name: "First date",
    patch: { title: "The night we met", subtitle: "Ana & Tomas", place: "Lisbon, Portugal", lat: 38.7167, lon: -9.1333, tz: "Europe/Lisbon", date: "2019-06-21", time: "23:30" },
  },
  {
    name: "A birth",
    patch: { title: "Born under these stars", subtitle: "Olivia Rose", place: "Melbourne, Australia", lat: -37.8136, lon: 144.9631, tz: "Australia/Melbourne", date: "2023-11-04", time: "04:12" },
  },
  {
    name: "Wedding",
    patch: { title: "I do", subtitle: "Priya & Marcus · Forever", place: "Santa Fe, New Mexico", lat: 35.687, lon: -105.9378, tz: "America/Denver", date: "2022-09-17", time: "21:00" },
  },
  {
    name: "In memory",
    patch: { title: "Always looking up", subtitle: "Grandpa Joe, 1941 – 2024", place: "Galway, Ireland", lat: 53.2707, lon: -9.0568, tz: "Europe/Dublin", date: "2024-02-11", time: "22:00" },
  },
];

function money(cents: number) {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function Designer({ canceled }: { canceled?: boolean }) {
  const [design, setDesign] = useState<Design>(DEFAULT_DESIGN);
  const [quantity, setQuantity] = useState(1);
  const [query, setQuery] = useState(DEFAULT_DESIGN.place);
  const [results, setResults] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abort = useRef<AbortController | null>(null);

  const update = useCallback((patch: Partial<Design>) => setDesign((d) => ({ ...d, ...patch })), []);

  // Debounced place search
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    const q = query.trim();
    if (q.length < 2 || q === design.place) {
      searchTimer.current = setTimeout(() => setResults([]), 0);
      return;
    }
    searchTimer.current = setTimeout(async () => {
      abort.current?.abort();
      const ctrl = new AbortController();
      abort.current = ctrl;
      setSearching(true);
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        const data = (await res.json()) as { results: Place[] };
        setResults(data.results ?? []);
        setOpen(true);
      } catch {
        /* aborted or offline */
      } finally {
        setSearching(false);
      }
    }, 250);
  }, [query, design.place]);

  const choosePlace = (p: Place) => {
    update({ place: p.label.slice(0, LIMITS.place), lat: p.lat, lon: p.lon, tz: p.tz });
    setQuery(p.label);
    setResults([]);
    setOpen(false);
  };

  const sky = useMemo(() => {
    try {
      const s = computeSky(design);
      return { stars: s.visibleStars, utc: new Date(s.utcMs) };
    } catch {
      return null;
    }
  }, [design]);

  const total = UNIT_PRICE_CENTS * quantity;

  const checkout = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ design, quantity }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Could not start checkout");
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setSubmitting(false);
    }
  };

  const color = SHIRT_COLORS.find((c) => c.key === design.color)!;

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:gap-14">
      {/* ----- Form ----- */}
      <div className="space-y-7">
        {canceled && (
          <p className="rounded-md border border-line bg-bg-2 px-4 py-3 text-sm text-muted">
            Checkout was cancelled. Your design is still here whenever you are ready.
          </p>
        )}

        <div>
          <span className="label">Start from an example</span>
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex.name}
                type="button"
                className="chip"
                onClick={() => {
                  update(ex.patch);
                  if (ex.patch.place) setQuery(ex.patch.place);
                }}
              >
                {ex.name}
              </button>
            ))}
          </div>
        </div>

        <section className="space-y-4">
          <h3 className="font-display text-sm uppercase tracking-[0.25em] text-gold">1 · The moment</h3>

          <div className="relative">
            <label className="label" htmlFor="place">
              Where
            </label>
            <input
              id="place"
              className="field"
              value={query}
              placeholder="City, town or landmark"
              autoComplete="off"
              maxLength={LIMITS.place}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => results.length && setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 150)}
            />
            {searching && <span className="absolute right-3 top-9 text-xs text-muted">searching…</span>}
            {open && results.length > 0 && (
              <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-line bg-bg-2 shadow-xl">
                {results.map((r, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-white/5"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => choosePlace(r)}
                    >
                      {r.label}
                      <span className="ml-2 text-xs text-muted">
                        {r.lat.toFixed(2)}, {r.lon.toFixed(2)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-1 text-xs text-muted">
              Using {design.place} · {design.lat.toFixed(3)}, {design.lon.toFixed(3)} · {design.tz}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="date">
                Date
              </label>
              <input
                id="date"
                type="date"
                className="field"
                value={design.date}
                min="1800-01-01"
                max="2200-12-31"
                onChange={(e) => e.target.value && update({ date: e.target.value })}
              />
            </div>
            <div>
              <label className="label" htmlFor="time">
                Local time
              </label>
              <input
                id="time"
                type="time"
                className="field"
                value={design.time}
                onChange={(e) => e.target.value && update({ time: e.target.value.slice(0, 5) })}
              />
            </div>
          </div>
          {sky && (
            <p className="text-xs text-muted">
              {sky.stars.toLocaleString()} stars above the horizon at {sky.utc.toISOString().replace("T", " ").slice(0, 16)} UTC.
            </p>
          )}
        </section>

        <section className="space-y-4">
          <h3 className="font-display text-sm uppercase tracking-[0.25em] text-gold">2 · The words</h3>
          <div>
            <label className="label" htmlFor="title">
              Headline
            </label>
            <input
              id="title"
              className="field"
              value={design.title}
              maxLength={LIMITS.title}
              placeholder="The night we met"
              onChange={(e) => update({ title: e.target.value })}
            />
          </div>
          <div>
            <label className="label" htmlFor="subtitle">
              Second line <span className="normal-case tracking-normal text-muted/70">(optional)</span>
            </label>
            <input
              id="subtitle"
              className="field"
              value={design.subtitle}
              maxLength={LIMITS.subtitle}
              placeholder="Names, a date, a few words"
              onChange={(e) => update({ subtitle: e.target.value })}
            />
          </div>
          <label className="flex cursor-pointer items-center gap-3 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[#d9bc74]"
              checked={design.lines}
              onChange={(e) => update({ lines: e.target.checked })}
            />
            Draw constellation lines
          </label>
        </section>

        <section className="space-y-4">
          <h3 className="font-display text-sm uppercase tracking-[0.25em] text-gold">3 · The shirt</h3>
          <div>
            <span className="label">Colour · {color.label}</span>
            <div className="flex flex-wrap gap-2">
              {SHIRT_COLORS.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  title={c.label}
                  aria-label={c.label}
                  aria-pressed={design.color === c.key}
                  onClick={() => update({ color: c.key })}
                  className={`h-9 w-9 rounded-full border-2 transition ${
                    design.color === c.key ? "border-gold scale-110" : "border-white/15 hover:border-white/40"
                  }`}
                  style={{ background: c.hex }}
                />
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="size">
                Size (unisex)
              </label>
              <select id="size" className="field" value={design.size} onChange={(e) => update({ size: e.target.value as Design["size"] })}>
                {SHIRT_SIZES.map((s) => (
                  <option key={s} value={s}>
                    {s.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="qty">
                Quantity
              </label>
              <select id="qty" className="field" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))}>
                {Array.from({ length: MAX_QUANTITY }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-xs text-muted">Gildan 64000 Softstyle, 100% ring-spun cotton. Ink colour is chosen automatically to suit the garment.</p>
        </section>

        <div className="space-y-3 border-t border-line pt-6">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted">
              {quantity} × {money(UNIT_PRICE_CENTS)}
            </span>
            <span className="font-display text-2xl">{money(total)}</span>
          </div>
          <p className="text-xs text-muted">Shipping calculated at checkout (from $5.95). Printed to order, ships in 2–5 business days.</p>
          <button type="button" className="btn-primary w-full" onClick={checkout} disabled={submitting || !design.place}>
            {submitting ? "Opening secure checkout…" : "Buy this shirt"}
          </button>
          {error && <p className="text-sm text-red-300">{error}</p>}
        </div>
      </div>

      {/* ----- Preview ----- */}
      <div className="lg:sticky lg:top-6 lg:self-start">
        <div className="rounded-xl border border-line bg-gradient-to-b from-white/[0.04] to-transparent p-4 sm:p-8">
          <ShirtMockup design={design} className="mx-auto w-full max-w-[520px]" />
          <p className="mt-4 text-center text-xs text-muted">
            Live preview, drawn from the same code that generates your print file. The map is astronomically accurate for the moment above.
          </p>
        </div>
      </div>
    </div>
  );
}
