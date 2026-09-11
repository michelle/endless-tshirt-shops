"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ShirtMockup } from "@/components/ShirtMockup";
import { encodeDesign, STYLES, type Design } from "@/lib/design";
import { GARMENTS, PRICE_CENTS, SHIPPING_OPTIONS, SIZES, type Size } from "@/lib/catalog";
import type { GeoResult } from "@/app/api/geocode/route";

const STYLE_INFO: Record<(typeof STYLES)[number], { label: string; hint: string }> = {
  constellations: { label: "Constellations", hint: "Stars joined into their figures. The classic." },
  stars: { label: "Stars only", hint: "Just the points of light. Quiet and abstract." },
  atlas: { label: "Atlas", hint: "Constellation names and a faint grid. For the nerds." },
};

interface SkyInfo {
  utc: string;
  visibleStars: number;
  constellations: string[];
}

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function Studio({ initialDesign, initialSize }: { initialDesign: Design; initialSize: Size }) {
  const [design, setDesign] = useState<Design>(initialDesign);
  const [size, setSize] = useState<Size>(initialSize);
  const [quantity, setQuantity] = useState(1);
  const [svg, setSvg] = useState<string | null>(null);
  const [sky, setSky] = useState<SkyInfo | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Place search
  const [placeQuery, setPlaceQuery] = useState(initialDesign.place);
  const [geo, setGeo] = useState<GeoResult[]>([]);
  const [geoOpen, setGeoOpen] = useState(false);
  const [geoBusy, setGeoBusy] = useState(false);
  const debouncedQuery = useDebounced(placeQuery, 350);
  const lastPicked = useRef(initialDesign.place);

  const update = useCallback(<K extends keyof Design>(k: K, v: Design[K]) => setDesign((d) => ({ ...d, [k]: v })), []);

  const encoded = useMemo(() => encodeDesign(design), [design]);
  const debouncedEncoded = useDebounced(encoded, 250);

  // Preview + sky facts
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [svgRes, skyRes] = await Promise.all([
          fetch(`/api/preview?d=${debouncedEncoded}`),
          fetch(`/api/sky?d=${debouncedEncoded}`),
        ]);
        if (!svgRes.ok) throw new Error(await svgRes.text());
        const text = await svgRes.text();
        const info = skyRes.ok ? ((await skyRes.json()) as SkyInfo) : null;
        if (!cancelled) {
          setSvg(text);
          setSky(info);
          setPreviewError(null);
        }
      } catch (err) {
        if (!cancelled) setPreviewError(err instanceof Error ? err.message : String(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debouncedEncoded]);

  // Keep the URL shareable
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("d", encoded);
    url.searchParams.set("size", size);
    window.history.replaceState(null, "", url.toString());
  }, [encoded, size]);

  // Geocoding
  useEffect(() => {
    const q = debouncedQuery.trim();
    if (q.length < 2 || q === lastPicked.current) {
      setGeo([]);
      return;
    }
    let cancelled = false;
    setGeoBusy(true);
    fetch(`/api/geocode?q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((j: { results: GeoResult[] }) => {
        if (!cancelled) {
          setGeo(j.results ?? []);
          setGeoOpen(true);
        }
      })
      .catch(() => undefined)
      .finally(() => !cancelled && setGeoBusy(false));
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  function pickPlace(r: GeoResult) {
    lastPicked.current = r.label;
    setPlaceQuery(r.label);
    setGeo([]);
    setGeoOpen(false);
    setDesign((d) => ({ ...d, place: r.label, lat: r.lat, lon: r.lon, tz: r.tz }));
  }

  async function checkout() {
    setCheckingOut(true);
    setCheckoutError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ design, size, quantity }),
      });
      const j = (await res.json()) as { url?: string; error?: string; detail?: string };
      if (!res.ok || !j.url) throw new Error(j.error ? `${j.error}${j.detail ? `: ${j.detail}` : ""}` : "Checkout failed");
      window.location.href = j.url;
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : String(err));
      setCheckingOut(false);
    }
  }

  const garment = GARMENTS.find((g) => g.key === design.garment) ?? GARMENTS[0];
  const total = ((PRICE_CENTS * quantity) / 100).toFixed(2);

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <div className="mb-8">
        <p className="eyebrow mb-2">The studio</p>
        <h1 className="font-display text-4xl text-star">Chart your sky</h1>
      </div>

      <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr]">
        {/* ---------- Controls ---------- */}
        <div className="space-y-8">
          <fieldset className="space-y-4">
            <legend className="eyebrow mb-1">1 · The moment</legend>

            <div className="relative">
              <label className="mb-1 block text-xs text-mist">Place</label>
              <input
                className="field"
                value={placeQuery}
                placeholder="Search a city, town or landmark"
                onChange={(e) => {
                  setPlaceQuery(e.target.value);
                  update("place", e.target.value.slice(0, 48));
                }}
                onFocus={() => geo.length && setGeoOpen(true)}
                onBlur={() => setTimeout(() => setGeoOpen(false), 150)}
                autoComplete="off"
              />
              {geoBusy && <span className="absolute right-3 top-8 text-xs text-mist">…</span>}
              {geoOpen && geo.length > 0 && (
                <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border border-line bg-panel shadow-xl">
                  {geo.map((r) => (
                    <li key={`${r.lat},${r.lon}`}>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-ink"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => pickPlace(r)}
                      >
                        <span>{r.label}</span>
                        <span className="font-mono text-[10px] text-mist">{r.tz}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-1 font-mono text-[11px] text-mist">
                {design.lat.toFixed(4)}, {design.lon.toFixed(4)} · {design.tz}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-mist">Date</label>
                <input
                  type="date"
                  className="field"
                  value={design.date}
                  min="1900-01-01"
                  max="2100-12-31"
                  onChange={(e) => e.target.value && update("date", e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-mist">Local time</label>
                <input
                  type="time"
                  className="field"
                  value={design.time}
                  onChange={(e) => e.target.value && update("time", e.target.value.slice(0, 5))}
                />
              </div>
            </div>

            <details className="text-xs text-mist">
              <summary className="cursor-pointer select-none">Fine-tune coordinates and time zone</summary>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <input
                  className="field"
                  type="number"
                  step="0.0001"
                  min={-90}
                  max={90}
                  value={design.lat}
                  onChange={(e) => update("lat", Math.max(-90, Math.min(90, Number(e.target.value) || 0)))}
                  aria-label="Latitude"
                />
                <input
                  className="field"
                  type="number"
                  step="0.0001"
                  min={-180}
                  max={180}
                  value={design.lon}
                  onChange={(e) => update("lon", Math.max(-180, Math.min(180, Number(e.target.value) || 0)))}
                  aria-label="Longitude"
                />
                <input
                  className="field"
                  value={design.tz}
                  onChange={(e) => update("tz", e.target.value.slice(0, 64))}
                  aria-label="IANA time zone"
                  placeholder="Europe/Lisbon"
                />
              </div>
            </details>
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="eyebrow mb-1">2 · The words</legend>
            <div>
              <label className="mb-1 block text-xs text-mist">Title (optional)</label>
              <input
                className="field font-display text-lg italic"
                value={design.title}
                maxLength={48}
                placeholder="The night we met"
                onChange={(e) => update("title", e.target.value)}
              />
            </div>
            <p className="text-xs text-mist">
              The place name above is printed under the title, then the coordinates, date and time in small type.
            </p>
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="eyebrow mb-1">3 · The look</legend>
            <div className="grid grid-cols-3 gap-2">
              {STYLES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => update("style", s)}
                  className={`rounded-md border p-3 text-left transition ${
                    design.style === s ? "border-gold bg-ink" : "border-line hover:border-mist"
                  }`}
                >
                  <p className="text-sm text-fog">{STYLE_INFO[s].label}</p>
                  <p className="mt-1 text-[11px] leading-snug text-mist">{STYLE_INFO[s].hint}</p>
                </button>
              ))}
            </div>
            <label className="flex items-center gap-3 text-sm">
              <input type="checkbox" checked={design.color} onChange={(e) => update("color", e.target.checked)} className="accent-gold" />
              <span>
                True-colour stars <span className="text-mist">— blue giants blue, red giants amber, as they really are</span>
              </span>
            </label>
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="eyebrow mb-1">4 · The shirt</legend>
            <div>
              <label className="mb-2 block text-xs text-mist">Colour · {garment.label}</label>
              <div className="flex flex-wrap gap-2">
                {GARMENTS.map((g) => (
                  <button
                    key={g.key}
                    type="button"
                    title={g.label}
                    aria-label={g.label}
                    onClick={() => update("garment", g.key)}
                    className={`h-9 w-9 rounded-full border-2 transition ${
                      design.garment === g.key ? "border-gold scale-110" : "border-line hover:border-mist"
                    }`}
                    style={{ background: g.hex }}
                  />
                ))}
              </div>
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-3">
              <div>
                <label className="mb-2 block text-xs text-mist">Size (unisex)</label>
                <div className="flex flex-wrap gap-2">
                  {SIZES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSize(s)}
                      className={`min-w-11 rounded-md border px-3 py-2 font-mono text-xs uppercase transition ${
                        size === s ? "border-gold bg-ink text-star" : "border-line text-mist hover:border-mist"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-2 block text-xs text-mist">Qty</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
                  className="field w-20"
                />
              </div>
            </div>
          </fieldset>

          <div className="rounded-lg border border-line bg-panel p-5">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-mist">
                {quantity} × Sidereal tee, {garment.label}, {size.toUpperCase()}
              </span>
              <span className="font-display text-3xl text-star">${total}</span>
            </div>
            <p className="mt-1 text-xs text-mist">
              Shipping from ${(SHIPPING_OPTIONS[0].cents / 100).toFixed(2)}, chosen at checkout. Printed within 2–3 business days.
            </p>
            <button type="button" onClick={checkout} disabled={checkingOut} className="btn-primary mt-4 w-full">
              {checkingOut ? "Opening secure checkout…" : "Checkout"}
            </button>
            {checkoutError && <p className="mt-2 text-xs text-red-400">{checkoutError}</p>}
            <p className="mt-3 text-center text-[11px] text-mist">Payment by Stripe. We only print after payment succeeds.</p>
          </div>
        </div>

        {/* ---------- Preview ---------- */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-lg border border-line bg-panel p-4">
            <ShirtMockup garment={design.garment} svg={svg} />
            {previewError && <p className="mt-2 text-xs text-red-400">Preview failed: {previewError}</p>}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg border border-line bg-panel p-4">
              <p className="eyebrow">Overhead</p>
              <p className="font-display mt-1 text-3xl text-star">{sky ? sky.visibleStars.toLocaleString() : "—"}</p>
              <p className="text-xs text-mist">catalogue stars above the horizon</p>
            </div>
            <div className="rounded-lg border border-line bg-panel p-4">
              <p className="eyebrow">Instant</p>
              <p className="mt-1 font-mono text-xs text-fog">{sky ? sky.utc.replace(".000Z", "Z") : "—"}</p>
              <p className="text-xs text-mist">that local time, in UTC</p>
            </div>
            <div className="col-span-2 rounded-lg border border-line bg-panel p-4">
              <p className="eyebrow">High in the sky</p>
              <p className="mt-1 text-xs leading-relaxed text-fog">{sky?.constellations.join(" · ") || "—"}</p>
            </div>
          </div>
          <div className="mt-4 flex gap-4 text-xs text-mist">
            <a className="underline hover:text-fog" href={`/api/print?d=${encoded}`} target="_blank" rel="noreferrer">
              Open print-ready file (4680 × 5790)
            </a>
            <a className="underline hover:text-fog" href={`/api/preview?d=${encoded}&png=1&w=1200`} target="_blank" rel="noreferrer">
              Share image
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
