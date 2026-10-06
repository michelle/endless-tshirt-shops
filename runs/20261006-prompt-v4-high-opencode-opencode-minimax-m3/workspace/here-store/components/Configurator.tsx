'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  DesignConfig,
  ShirtColor,
  ShirtSize,
  ShippingDetails,
} from '@/lib/types';
import { PRICE_CENTS } from '@/lib/products';
import type { PresetPlace } from '@/lib/places';
import type { ShirtOption } from '@/lib/products';

interface Props {
  labels: string[];
  places: PresetPlace[];
  shirts: ShirtOption[];
  sizes: ShirtSize[];
}

const COUNTRY_OPTIONS = [
  { code: 'US', label: 'United States' },
  { code: 'CA', label: 'Canada' },
  { code: 'GB', label: 'United Kingdom' },
  { code: 'AU', label: 'Australia' },
  { code: 'DE', label: 'Germany' },
  { code: 'FR', label: 'France' },
  { code: 'JP', label: 'Japan' },
];

const STYLE_OPTIONS: Array<{ id: DesignConfig['variant']; label: string; description: string }> = [
  { id: 'classic', label: 'Classic', description: 'Serif title, monospaced coordinates' },
  { id: 'minimal', label: 'Minimal', description: 'Just the numbers' },
  { id: 'nautical', label: 'Nautical', description: 'Crosshair & grid style' },
];

function isValidLatLng(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

export function Configurator({ labels, places, shirts, sizes }: Props) {
  const [step, setStep] = useState<'design' | 'shipping'>('design');

  const [label, setLabel] = useState<string>('Where We Met');
  const [city, setCity] = useState<string>('Paris, France');
  const [latitude, setLatitude] = useState<number>(48.8566);
  const [longitude, setLongitude] = useState<number>(2.3522);
  const [year, setYear] = useState<string>('2018');
  const [personalName, setPersonalName] = useState<string>('');
  const [variant, setVariant] = useState<DesignConfig['variant']>('classic');
  const [color, setColor] = useState<ShirtColor>('white');
  const [size, setSize] = useState<ShirtSize>('m');

  const [shipping, setShipping] = useState<ShippingDetails>({
    name: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    postalCode: '',
    countryCode: 'US',
    email: '',
    phone: '',
  });

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const previewRef = useRef<HTMLDivElement | null>(null);
  const shirt = shirts.find((s) => s.color === color) ?? shirts[0];
  const isDark = shirt.ink === 'light';
  const inkColor = isDark ? '#f5f1ea' : '#0c0c0d';

  const design = useMemo<DesignConfig>(
    () => ({ label, city, latitude, longitude, year, personalName, variant }),
    [label, city, latitude, longitude, year, personalName, variant]
  );

  const coordsValid = isValidLatLng(latitude, longitude);
  const shippingValid =
    !!shipping.name.trim() &&
    !!shipping.line1.trim() &&
    !!shipping.city.trim() &&
    !!shipping.postalCode.trim() &&
    !!shipping.countryCode;

  // Fetch a low-res preview (rasterized server-side, scaled for the browser).
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams();
    params.set('label', label);
    params.set('city', city);
    params.set('lat', String(latitude));
    params.set('lng', String(longitude));
    params.set('year', year);
    params.set('name', personalName);
    params.set('variant', variant);
    params.set('ink', inkColor);
    params.set('bg', isDark ? 'dark' : 'light');
    params.set('w', '900');
    const t = setTimeout(() => {
      fetch(`/api/design?${params.toString()}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => { if (!cancelled) setPreviewUrl(j?.url ?? null); })
        .catch(() => { /* keep prior */ });
    }, 220);
    return () => { cancelled = true; clearTimeout(t); };
  }, [label, city, latitude, longitude, year, personalName, variant, inkColor, isDark]);

  const placePreview = (p: PresetPlace) => {
    setLatitude(p.lat);
    setLongitude(p.lng);
    setCity(`${p.city}, ${p.country}`);
  };

  const handleCheckout = async () => {
    setError(null);
    setWarning(null);
    if (!coordsValid) { setError('Coordinates are not valid.'); return; }
    if (!shippingValid) { setError('Please complete the shipping address.'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          design,
          variant: { sku: 'GLOBAL-TEE-GIL-5000', color, size },
          shipping,
          priceCents: PRICE_CENTS,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? 'Could not create checkout session.');
        setSubmitting(false);
        return;
      }
      if (data?.warning) setWarning(data.warning);
      if (data?.url) {
        window.location.href = data.url;
      } else if (data?.mock) {
        window.location.href = `/success?mock=1&order=${encodeURIComponent(data.orderId)}&session=${encodeURIComponent(data.sessionId)}`;
      } else {
        setError('Unexpected response from server.');
        setSubmitting(false);
      }
    } catch (e: any) {
      setError(e?.message ?? 'Checkout failed.');
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-6 pb-24 grid lg:grid-cols-12 gap-8">
      {/* LEFT — controls */}
      <section className="lg:col-span-7 space-y-10">
        {/* Step 1: Design */}
        <Pane open title="The story" subtitle="What does this place mean to you?">
          <div className="grid sm:grid-cols-2 gap-5">
            <Field label="Label">
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="WHERE WE MET"
                maxLength={32}
                className="w-full bg-transparent border-b border-ink/30 focus:border-ink focus:outline-none py-2 text-lg"
              />
            </Field>
            <Field label="Year (optional)">
              <input
                value={year}
                onChange={(e) => setYear(e.target.value.slice(0, 4))}
                placeholder="2018"
                inputMode="numeric"
                className="w-full bg-transparent border-b border-ink/30 focus:border-ink focus:outline-none py-2 text-lg"
              />
            </Field>
            <Field label="Personal name (optional)" full>
              <input
                value={personalName}
                onChange={(e) => setPersonalName(e.target.value)}
                placeholder="—K & J"
                maxLength={20}
                className="w-full bg-transparent border-b border-ink/30 focus:border-ink focus:outline-none py-2 text-lg"
              />
            </Field>
          </div>

          <div className="mt-6">
            <Label>Label inspiration</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {labels.slice(0, 14).map((l) => (
                <button
                  key={l}
                  onClick={() => setLabel(l.replace(/\b\w/g, (c) => c.toUpperCase()))}
                  className="text-xs border border-ink/20 px-3 py-1.5 rounded-full hover:bg-ink hover:text-bone transition"
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        </Pane>

        <Pane open title="The place" subtitle="Pick a city, plug in your own, or find it on a map.">
          <div className="mt-2 grid sm:grid-cols-2 gap-5">
            <Field label="City, Country">
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Paris, France"
                className="w-full bg-transparent border-b border-ink/30 focus:border-ink focus:outline-none py-2 text-lg"
              />
            </Field>
            <Field label="Latitude">
              <input
                type="number"
                step="0.0001"
                value={latitude}
                onChange={(e) => setLatitude(Number(e.target.value))}
                className="w-full bg-transparent border-b border-ink/30 focus:border-ink focus:outline-none py-2 text-lg font-mono"
              />
            </Field>
            <Field label="Longitude">
              <input
                type="number"
                step="0.0001"
                value={longitude}
                onChange={(e) => setLongitude(Number(e.target.value))}
                className="w-full bg-transparent border-b border-ink/30 focus:border-ink focus:outline-none py-2 text-lg font-mono"
              />
            </Field>
          </div>

          <div className="mt-6">
            <Label>Quick picks</Label>
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-auto pr-1">
              {places.map((p) => (
                <button
                  key={p.id}
                  onClick={() => placePreview(p)}
                  className="text-left border border-ink/15 rounded-lg p-3 hover:bg-sand transition"
                >
                  <div className="text-xl">{p.glyph}</div>
                  <div className="font-serif text-base leading-tight">{p.city}</div>
                  <div className="font-mono text-[10px] text-ink/60">{p.lat.toFixed(2)}°, {p.lng.toFixed(2)}°</div>
                </button>
              ))}
            </div>
          </div>
        </Pane>

        <Pane title="The shirt" subtitle="Pick the canvas." open>
          <div className="mt-4 space-y-6">
            <div>
              <Label>Color</Label>
              <div className="mt-2 flex flex-wrap gap-3">
                {shirts.map((s) => (
                  <button
                    key={s.color}
                    onClick={() => setColor(s.color)}
                    className={`group relative w-14 h-14 rounded-full border border-ink/20 transition
                      ${color === s.color ? 'ring-2 ring-rust ring-offset-2 ring-offset-bone' : ''}`}
                    style={{ backgroundColor: s.swatch }}
                    aria-pressed={color === s.color}
                  >
                    <span className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition">
                      {s.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Size</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {sizes.map((sz) => (
                  <button
                    key={sz}
                    onClick={() => setSize(sz)}
                    className={`px-4 py-2 text-sm border rounded-full transition
                      ${size === sz ? 'bg-ink text-bone border-ink' : 'border-ink/20 hover:border-ink/40'}`}
                  >
                    {sz.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Style</Label>
              <div className="mt-2 grid sm:grid-cols-3 gap-2">
                {STYLE_OPTIONS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setVariant(s.id)}
                    className={`text-left border rounded-lg p-3 transition
                      ${variant === s.id ? 'border-ink bg-sand' : 'border-ink/15 hover:border-ink/40'}`}
                  >
                    <div className="font-serif text-base">{s.label}</div>
                    <div className="text-xs text-ink/60">{s.description}</div>
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-ink/50 mt-2 font-mono uppercase tracking-widest">All three styles print the same data — only the layout varies.</p>
            </div>
          </div>
        </Pane>

        <Pane title="Shipping" subtitle="Where shall we send it?">
          <div className="mt-2 grid sm:grid-cols-2 gap-4">
            <Field label="Full name" full>
              <input
                value={shipping.name}
                onChange={(e) => setShipping({ ...shipping, name: e.target.value })}
                placeholder="Jane Doe"
                className="w-full bg-transparent border-b border-ink/30 focus:border-ink focus:outline-none py-2"
              />
            </Field>
            <Field label="Email">
              <input
                value={shipping.email ?? ''}
                onChange={(e) => setShipping({ ...shipping, email: e.target.value })}
                placeholder="jane@example.com"
                type="email"
                className="w-full bg-transparent border-b border-ink/30 focus:border-ink focus:outline-none py-2"
              />
            </Field>
            <Field label="Address line 1" full>
              <input
                value={shipping.line1}
                onChange={(e) => setShipping({ ...shipping, line1: e.target.value })}
                placeholder="123 Main St"
                className="w-full bg-transparent border-b border-ink/30 focus:border-ink focus:outline-none py-2"
              />
            </Field>
            <Field label="Address line 2">
              <input
                value={shipping.line2 ?? ''}
                onChange={(e) => setShipping({ ...shipping, line2: e.target.value })}
                placeholder="Apt 4"
                className="w-full bg-transparent border-b border-ink/30 focus:border-ink focus:outline-none py-2"
              />
            </Field>
            <Field label="City">
              <input
                value={shipping.city}
                onChange={(e) => setShipping({ ...shipping, city: e.target.value })}
                placeholder="San Francisco"
                className="w-full bg-transparent border-b border-ink/30 focus:border-ink focus:outline-none py-2"
              />
            </Field>
            <Field label="State / Region">
              <input
                value={shipping.state ?? ''}
                onChange={(e) => setShipping({ ...shipping, state: e.target.value })}
                placeholder="CA"
                className="w-full bg-transparent border-b border-ink/30 focus:border-ink focus:outline-none py-2"
              />
            </Field>
            <Field label="Postal code">
              <input
                value={shipping.postalCode}
                onChange={(e) => setShipping({ ...shipping, postalCode: e.target.value })}
                placeholder="94110"
                className="w-full bg-transparent border-b border-ink/30 focus:border-ink focus:outline-none py-2"
              />
            </Field>
            <Field label="Country">
              <select
                value={shipping.countryCode}
                onChange={(e) => setShipping({ ...shipping, countryCode: e.target.value })}
                className="w-full bg-transparent border-b border-ink/30 focus:border-ink focus:outline-none py-2"
              >
                {COUNTRY_OPTIONS.map((c) => (
                  <option key={c.code} value={c.code}>{c.label}</option>
                ))}
              </select>
            </Field>
          </div>
        </Pane>

        <div className="space-y-4">
          {error && (
            <div className="bg-rust/10 border border-rust/40 text-rust px-4 py-3 rounded-lg text-sm">{error}</div>
          )}
          {warning && (
            <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded-lg text-sm">{warning}</div>
          )}
          <button
            onClick={handleCheckout}
            disabled={submitting || !coordsValid || !shippingValid}
            className="w-full bg-ink text-bone py-4 rounded-full font-medium tracking-wide hover:bg-rust transition disabled:bg-ink/30"
          >
            {submitting ? 'Routing you to checkout…' : `Pay $${(PRICE_CENTS / 100).toFixed(2)} & order shirt`}
          </button>
          <p className="text-xs text-ink/60 text-center">Payment is processed by Stripe. Your shirt is printed by Prodigi after we receive your payment.</p>
        </div>
      </section>

      {/* RIGHT — preview (sticky) */}
      <aside className="lg:col-span-5">
        <div className="sticky top-20">
          <div className="font-mono text-xs uppercase tracking-widest text-ink/60 mb-3">Live preview</div>
          <div className="relative aspect-[5/6] rounded-2xl border border-ink/15 overflow-hidden shadow-xl">
            <div
              className="absolute inset-0 grid-bg"
              style={{ opacity: isDark ? 0.15 : 0.5 }}
            />
            {/* "Shirt" backdrop */}
            <div
              className="absolute inset-0 mx-auto my-6 w-[88%] rounded-2xl shadow-md flex flex-col items-center justify-between p-6 relative overflow-hidden"
              style={{ backgroundColor: shirt.swatch, color: inkColor, borderTop: isDark ? '1px solid rgba(255,255,255,0.04)' : '1px solid rgba(0,0,0,0.06)' }}
            >
              <div className="absolute top-3 left-3 text-[10px] font-mono uppercase tracking-widest opacity-50">N · 0001</div>
              <div className="absolute top-3 right-3 text-[10px] font-mono uppercase tracking-widest opacity-50">{color.split(' ').map((p) => p[0]).join('')}</div>

              <div className="text-center mt-2">
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] opacity-70">↑ N</div>
                <div
                  className="font-serif font-bold mt-1 leading-[1.05] tracking-tight"
                  style={{ fontSize: 'clamp(20px, 3.2vw, 30px)' }}
                >
                  {(label || 'YOUR LABEL').toUpperCase()}
                </div>
                <div className="font-mono text-[11px] uppercase tracking-widest opacity-70 mt-1">
                  {city || 'City, Country'}
                </div>
              </div>

              <div className="flex-1 w-full flex flex-col items-center justify-center px-2 my-3 text-center">
                <div
                  className="font-mono leading-none"
                  style={{ fontSize: 'clamp(20px, 3.4vw, 30px)' }}
                >
                  {Math.abs(latitude).toFixed(4)}° {latitude >= 0 ? 'N' : 'S'}
                </div>
                <div
                  className="font-mono leading-none mt-2"
                  style={{ fontSize: 'clamp(20px, 3.4vw, 30px)' }}
                >
                  {Math.abs(longitude).toFixed(4)}° {longitude >= 0 ? 'E' : 'W'}
                </div>
              </div>

              <div className="text-center">
                {year.trim() && (
                  <div className="font-mono text-[10px] uppercase tracking-widest opacity-70">
                    Est. {year.trim()}
                  </div>
                )}
                {personalName.trim() && (
                  <div
                    className="font-serif font-bold mt-1 tracking-tight"
                    style={{ fontSize: 'clamp(14px, 2vw, 18px)' }}
                  >
                    {personalName.trim()}
                  </div>
                )}
                <div className="font-mono text-[10px] uppercase tracking-widest opacity-50 mt-3">
                  HERE · WEAR YOUR PLACE
                </div>
              </div>
            </div>
          </div>
          <div className="text-xs font-mono text-ink/60 mt-3 text-center">
            {previewUrl ? (
              <a href={previewUrl} target="_blank" rel="noreferrer" className="underline">
                Open full resolution preview ↗
              </a>
            ) : 'Preparing print-quality preview…'}
          </div>
          <div className="text-xs text-ink/60 mt-6 space-y-1">
            <div>· Premium Gildan 5000 · 100% cotton · 5.3 oz</div>
            <div>· DTG print · full-color, full-bleed front</div>
            <div>· Ships in 3–5 business days</div>
          </div>
        </div>
      </aside>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink/60">{children}</div>;
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <Label>{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function Pane({ title, subtitle, children, open }: { title: string; subtitle: string; children: React.ReactNode; open?: boolean }) {
  const [isOpen, setIsOpen] = useState<boolean>(open ?? true);
  return (
    <div>
      <header className="flex items-end justify-between">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-widest text-rust">SECTION</div>
          <h2 className="font-serif text-3xl mt-1 tracking-tight">{title}</h2>
          <p className="text-ink/70 text-sm">{subtitle}</p>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-xs font-mono uppercase tracking-widest border border-ink/20 rounded-full px-3 py-1 hover:border-ink/60"
        >
          {isOpen ? 'collapse' : 'expand'}
        </button>
      </header>
      {isOpen && <div className="mt-5">{children}</div>}
      <div className="h-px bg-ink/10 mt-10" />
    </div>
  );
}
