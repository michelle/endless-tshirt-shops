'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { SafeSvg } from '@/components/safe-svg';
import {
  defaultInput,
  HEADLINE_OPTIONS,
  PALETTE_OPTIONS,
  type DesignInput,
} from '@/lib/design';
import {
  COLORS,
  SIZES,
  PRODUCTS,
  formatPrice,
  defaultSku,
} from '@/lib/products';

const SAMPLE_LOCATIONS: Array<{ label: string; lat: number; lng: number }> = [
  { label: 'Paris, France', lat: 48.8566, lng: 2.3522 },
  { label: 'New York, USA', lat: 40.7128, lng: -74.0060 },
  { label: 'Tokyo, Japan', lat: 35.6762, lng: 139.6503 },
  { label: 'S\u00E3o Paulo, Brazil', lat: -23.5505, lng: -46.6333 },
  { label: 'Cape Town, South Africa', lat: -33.9249, lng: 18.4241 },
  { label: 'Reykjav\u00EDk, Iceland', lat: 64.1466, lng: -21.9426 },
];

type FormState = {
  when: Date;
  locationName: string;
  latitudeDeg: number;
  longitudeDeg: number;
  message: string;
  headline: string;
  palette: DesignInput['palette'];
  productSku: string;
  color: typeof COLORS[number]['value'];
  size: typeof SIZES[number]['value'];
  copies: number;
  recipient: {
    name: string;
    email: string;
    line1: string;
    line2: string;
    townOrCity: string;
    stateOrCounty: string;
    postalOrZipCode: string;
    countryCode: string;
  };
};

function todayLocalDate(): { date: string; time: string } {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return { date: `${yyyy}-${mm}-${dd}`, time: `${hh}:${mi}` };
}

export default function CustomizePage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => initialFormState(defaultInput()));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const debounceRef = useRef<number | null>(null);

  // Live preview state: SVG string produced by /api/preview.
  const [previewSvg, setPreviewSvg] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Debounced preview refresh.
  const refreshPreview = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      try {
        setPreviewError(null);
        const designPayload: DesignInput = {
          when: form.when,
          latitudeDeg: form.latitudeDeg,
          longitudeDeg: form.longitudeDeg,
          locationName: form.locationName,
          message: form.message,
          headline: form.headline,
          palette: form.palette,
        };
        const res = await fetch('/api/preview?format=svg&size=preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(designPayload),
        });
        if (!res.ok) {
          setPreviewError(`preview failed (${res.status})`);
          return;
        }
        const text = await res.text();
        setPreviewSvg(text);
      } catch (err: any) {
        setPreviewError(err?.message ?? String(err));
      }
    }, 200);
  }, [form]);

  useEffect(() => {
    refreshPreview();
  }, [refreshPreview]);

  // Date <-> input bindings
  const localParts = useMemo(() => splitDate(form.when), [form.when]);

  const onDateInputChange = (dateStr: string, timeStr: string) => {
    if (!dateStr) return;
    const [h, m] = timeStr.split(':');
    const when = new Date(`${dateStr}T${h || '00'}:${m || '00'}:00Z`);
    if (!Number.isNaN(when.getTime())) {
      update('when', when);
    }
  };

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((s) => ({ ...s, [key]: value }));
  }

  function setLocation(label: string, lat: number, lng: number) {
    setForm((s) => ({ ...s, locationName: label, latitudeDeg: lat, longitudeDeg: lng }));
  }

  async function onSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      const product = PRODUCTS.find((p) => p.sku === form.productSku) ?? PRODUCTS[0];
      const payload = {
        design: {
          when: form.when.toISOString(),
          latitudeDeg: form.latitudeDeg,
          longitudeDeg: form.longitudeDeg,
          locationName: form.locationName,
          message: form.message,
          headline: form.headline,
          palette: form.palette,
        },
        productSku: form.productSku,
        color: form.color,
        size: form.size,
        copies: form.copies,
        recipient: {
          name: form.recipient.name,
          email: form.recipient.email || undefined,
          address: {
            line1: form.recipient.line1,
            line2: form.recipient.line2 || undefined,
            townOrCity: form.recipient.townOrCity,
            stateOrCounty: form.recipient.stateOrCounty || undefined,
            postalOrZipCode: form.recipient.postalOrZipCode,
            countryCode: form.recipient.countryCode.toUpperCase(),
          },
        },
      };
      const res = await fetch('/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.checkoutUrl) {
        throw new Error(json?.error ?? 'order creation failed');
      }
      // Both Stripe and demo paths return a fully resolvable URL.
      window.location.href = json.checkoutUrl;
    } catch (err: any) {
      setError(err?.message ?? 'unknown error');
      setSubmitting(false);
    }
  }

  const product = PRODUCTS.find((p) => p.sku === form.productSku) ?? PRODUCTS[0];
  const total = product.retailUsd * form.copies;

  return (
    <main className="min-h-screen">
      <Header />
      <div className="mx-auto max-w-7xl px-6 py-12 grid gap-12 lg:grid-cols-[minmax(0,1fr)_480px] xl:grid-cols-[minmax(0,1fr)_540px]">
        <PreviewPanel
          svg={previewSvg}
          error={previewError}
          product={product}
          color={form.color}
        />
        <FormPanel
          form={form}
          update={update}
          setLocation={setLocation}
          onDateInputChange={onDateInputChange}
          localParts={localParts}
          error={error}
          submitting={submitting}
          onSubmit={onSubmit}
          total={total}
        />
      </div>
      <Footer />
    </main>
  );
}

function PreviewPanel({
  svg,
  error,
  product,
  color,
}: {
  svg: string | null;
  error: string | null;
  product: typeof PRODUCTS[number];
  color: typeof COLORS[number]['value'];
}) {
  const colorHex = COLORS.find((c) => c.value === color)?.hex ?? '#f5f3ec';
  return (
    <div className="rounded-xl bg-ink-900/40 border border-ink-700/80 p-6 lg:p-8 lg:sticky lg:top-6 self-start">
      <div className="flex items-baseline justify-between mb-6">
        <h2 className="font-display text-2xl text-gold-500">Live preview</h2>
        <div className="text-xs uppercase tracking-widest text-ink-400">
          {product.name} · {color}
        </div>
      </div>
      <div className="relative">
        {/* Shirt background */}
        <div
          className="absolute inset-0 rounded-xl overflow-hidden shadow-2xl shadow-black/40 ring-1 ring-ink-700/60"
          style={{ background: colorHex }}
        >
          <ShirtSilhouette />
        </div>
        {/* Design overlay */}
        <div className="relative mx-auto" style={{ maxWidth: 460 }}>
          <div
            className="aspect-[1200/1508]"
            style={
              svg
                ? undefined
                : {
                    background: '#0c101a',
                    borderRadius: 12,
                  }
            }
          >
            {svg ? (
              <SafeSvg svg={svg} className="h-full w-full" />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-ink-400">
                {error ?? 'rendering…'}
              </div>
            )}
          </div>
        </div>
      </div>
      <p className="mt-6 text-xs text-ink-400 leading-relaxed">
        ✨ Preview is unmounted from the printed tee; the printed design matches the
        rectangle shown above. Actual color may vary slightly based on the tensor.
      </p>
    </div>
  );
}

/**
 * ShirtSilhouette - an SVG outline of a folded/unisex t-shirt so the live
 * preview shows the design on a recognizable garment shape.
 */
function ShirtSilhouette() {
  return (
    <svg viewBox="0 0 460 540" className="w-full h-full" preserveAspectRatio="xMidYMid">
      <defs>
        <linearGradient id="shirtShadow" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="rgba(0,0,0,0.15)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </linearGradient>
      </defs>
      <path
        d="M 90 60
           q 30 -40 70 -40
           q 40 0 70 40
           q 30 0 60 12
           l 22 22
           l -28 26
           q -8 -2 -16 -2
           l 0 320
           q 0 22 -22 22
           l -180 0
           q -22 0 -22 -22
           l 0 -320
           q -8 0 -16 2
           l -28 -26
           l 22 -22
           q 30 -12 60 -12 z"
        fill="rgba(255,255,255,0.0)"
        stroke="rgba(0,0,0,0.18)"
        strokeWidth="2"
      />
      <rect width="460" height="110" fill="url(#shirtShadow)" />
    </svg>
  );
}

function FormPanel({
  form,
  update,
  setLocation,
  onDateInputChange,
  localParts,
  error,
  submitting,
  onSubmit,
  total,
}: {
  form: FormState;
  update: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  setLocation: (label: string, lat: number, lng: number) => void;
  onDateInputChange: (date: string, time: string) => void;
  localParts: { date: string; time: string };
  error: string | null;
  submitting: boolean;
  onSubmit: () => void;
  total: number;
}) {
  return (
    <div className="space-y-10">
      <Section title="The moment" subtitle="When the sky you want to wear.">
        <div className="grid grid-cols-2 gap-3">
          <InputLabel label="Date">
            <input
              type="date"
              className="input-field"
              value={localParts.date}
              onChange={(e) => onDateInputChange(e.target.value, localParts.time)}
            />
          </InputLabel>
          <InputLabel label="Time (UTC)">
            <input
              type="time"
              className="input-field"
              value={localParts.time}
              onChange={(e) => onDateInputChange(localParts.date, e.target.value)}
            />
          </InputLabel>
        </div>
      </Section>

      <Section title="The place" subtitle="Where the sky hung in this moment.">
        <InputLabel label="Location name">
          <input
            className="input-field"
            value={form.locationName}
            onChange={(e) => update('locationName', e.target.value)}
            placeholder="Paris, France"
            maxLength={80}
          />
        </InputLabel>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <InputLabel label="Latitude">
            <input
              className="input-field"
              type="number"
              step="0.0001"
              value={form.latitudeDeg}
              onChange={(e) => update('latitudeDeg', Number(e.target.value))}
            />
          </InputLabel>
          <InputLabel label="Longitude">
            <input
              className="input-field"
              type="number"
              step="0.0001"
              value={form.longitudeDeg}
              onChange={(e) => update('longitudeDeg', Number(e.target.value))}
            />
          </InputLabel>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {SAMPLE_LOCATIONS.map((s) => (
            <button
              type="button"
              key={s.label}
              onClick={() => setLocation(s.label, s.lat, s.lng)}
              className="px-3 py-1.5 rounded-full border border-ink-700 hover:border-gold-500 text-xs text-ink-200 hover:text-gold-500 transition-colors"
            >
              {s.label}
            </button>
          ))}
        </div>
      </Section>

      <Section title="The words" subtitle="A small personal note that becomes part of the print.">
        <InputLabel label="Headline">
          <input
            className="input-field"
            value={form.headline}
            onChange={(e) => update('headline', e.target.value)}
            placeholder="The Night We Met"
            maxLength={60}
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {HEADLINE_OPTIONS.map((h) => (
              <button
                type="button"
                key={h}
                onClick={() => update('headline', h)}
                className="px-3 py-1 rounded-full border border-ink-700 hover:border-gold-500 text-xs text-ink-200 hover:text-gold-500 transition-colors"
              >
                {h}
              </button>
            ))}
          </div>
        </InputLabel>
        <InputLabel label="Message (up to 4 lines)" className="mt-3">
          <textarea
            className="input-field min-h-[120px] font-display italic text-lg"
            value={form.message}
            onChange={(e) => update('message', e.target.value)}
            placeholder={'And so\nthe adventure\nbegan.'}
            maxLength={300}
          />
        </InputLabel>
      </Section>

      <Section title="Style" subtitle="Pick a palette. The garment color is recommended to fit.">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {PALETTE_OPTIONS.map((p) => (
            <button
              type="button"
              key={p.value}
              onClick={() => update('palette', p.value)}
              className={
                'rounded-lg border p-3 text-left transition-colors ' +
                (form.palette === p.value
                  ? 'border-gold-500 bg-gold-500/5'
                  : 'border-ink-700 hover:border-ink-500')
              }
            >
              <PaletteSwatch value={p.value} />
              <div className="mt-2 font-medium">{p.label}</div>
              <div className="text-xs text-ink-400">{p.description}</div>
            </button>
          ))}
        </div>
      </Section>

      <Section title="Garment" subtitle="We print on a Bella + Canvas 3001; pick a color and size.">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {COLORS.map((c) => (
            <button
              type="button"
              key={c.value}
              onClick={() => update('color', c.value)}
              className={
                'rounded-lg border p-3 text-left transition-colors ' +
                (form.color === c.value
                  ? 'border-gold-500 bg-gold-500/5'
                  : 'border-ink-700 hover:border-ink-500')
              }
            >
              <div
                className="w-full aspect-square rounded border border-ink-700"
                style={{ background: c.hex }}
              />
              <div className="mt-2 text-sm font-medium">{c.label}</div>
            </button>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 md:grid-cols-6">
          {SIZES.map((s) => (
            <button
              type="button"
              key={s.value}
              onClick={() => update('size', s.value)}
              className={
                'rounded-md border py-2 text-sm text-center transition-colors ' +
                (form.size === s.value
                  ? 'border-gold-500 bg-gold-500/5'
                  : 'border-ink-700 hover:border-ink-500')
              }
            >
              {s.label} · {s.chestIn}
            </button>
          ))}
        </div>
        <div className="mt-3">
          <InputLabel label="Quantity">
            <input
              type="number"
              min={1}
              max={20}
              className="input-field w-24"
              value={form.copies}
              onChange={(e) => update('copies', Math.max(1, Math.min(20, Number(e.target.value))))}
            />
          </InputLabel>
        </div>
      </Section>

      <Section title="Shipping" subtitle="Where to send the parcel.">
        <div className="grid grid-cols-2 gap-3">
          <InputLabel label="Full name">
            <input
              className="input-field"
              value={form.recipient.name}
              onChange={(e) =>
                setFormState(form, update, {
                  recipient: { ...form.recipient, name: e.target.value },
                })
              }
            />
          </InputLabel>
          <InputLabel label="Email">
            <input
              className="input-field"
              value={form.recipient.email}
              onChange={(e) =>
                setFormState(form, update, {
                  recipient: { ...form.recipient, email: e.target.value },
                })
              }
            />
          </InputLabel>
          <InputLabel label="Address line 1">
            <input
              className="input-field"
              value={form.recipient.line1}
              onChange={(e) =>
                setFormState(form, update, {
                  recipient: { ...form.recipient, line1: e.target.value },
                })
              }
            />
          </InputLabel>
          <InputLabel label="Address line 2">
            <input
              className="input-field"
              value={form.recipient.line2}
              onChange={(e) =>
                setFormState(form, update, {
                  recipient: { ...form.recipient, line2: e.target.value },
                })
              }
            />
          </InputLabel>
          <InputLabel label="City">
            <input
              className="input-field"
              value={form.recipient.townOrCity}
              onChange={(e) =>
                setFormState(form, update, {
                  recipient: { ...form.recipient, townOrCity: e.target.value },
                })
              }
            />
          </InputLabel>
          <InputLabel label="State / Province">
            <input
              className="input-field"
              value={form.recipient.stateOrCounty}
              onChange={(e) =>
                setFormState(form, update, {
                  recipient: { ...form.recipient, stateOrCounty: e.target.value },
                })
              }
            />
          </InputLabel>
          <InputLabel label="Postal code">
            <input
              className="input-field"
              value={form.recipient.postalOrZipCode}
              onChange={(e) =>
                setFormState(form, update, {
                  recipient: { ...form.recipient, postalOrZipCode: e.target.value },
                })
              }
            />
          </InputLabel>
          <InputLabel label="Country (ISO 2-letter)">
            <input
              className="input-field uppercase"
              value={form.recipient.countryCode}
              onChange={(e) =>
                setFormState(form, update, {
                  recipient: { ...form.recipient, countryCode: e.target.value.slice(0, 2) },
                })
              }
            />
          </InputLabel>
        </div>
      </Section>

      <div className="rounded-xl border border-ink-700 bg-ink-900/50 p-5">
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-xs uppercase tracking-widest text-ink-400">
              Order total
            </div>
            <div className="text-3xl font-display">{formatPrice(total)}</div>
            <div className="text-xs text-ink-400 mt-1">
              Includes shipping worldwide · printed on demand
            </div>
          </div>
          <button
            onClick={onSubmit}
            disabled={submitting}
            className="btn-primary"
          >
            {submitting ? 'Preparing checkout…' : 'Checkout →'}
          </button>
        </div>
        {error && (
          <p className="mt-3 text-sm text-rose-400">⚠\uFE0F {error}</p>
        )}
      </div>
    </div>
  );
}

function PaletteSwatch({ value }: { value: NonNullable<DesignInput['palette']> }) {
  const map: Record<typeof value, string[]> = {
    ink: ['#0c101a', '#d4a857', '#e8edf5'],
    ivory: ['#f3ecdf', '#b5893c', '#1d2638'],
    rose: ['#1a141c', '#e08b8a', '#fbe6e4'],
    sage: ['#0f1a18', '#b8c89a', '#dde7df'],
  };
  const [bg, accent, fg] = map[value];
  return (
    <div
      className="aspect-[2/1] rounded border border-ink-700"
      style={{
        background: `linear-gradient(135deg, ${bg}, ${accent}66 80%)`,
      }}
    >
      <div className="h-full w-full flex items-center justify-center">
        <span
          className="block h-2 w-2 rounded-full"
          style={{ background: fg }}
        />
      </div>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3">
        <h2 className="font-display text-xl">{title}</h2>
        {subtitle && (
          <p className="text-sm text-ink-400 mt-1">{subtitle}</p>
        )}
      </div>
      {children}
    </section>
  );
}

function InputLabel({
  label,
  children,
  className = '',
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={'block ' + className}>
      <span className="label-eyebrow">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function stripXml(svg: string): string {
  return svg
    .replace(/^<\?xml[^>]*\?>/, '')
    .replace(/^\s*<svg/, '<svg');
}

function initialFormState(input: DesignInput): FormState {
  return {
    when: input.when,
    locationName: input.locationName,
    latitudeDeg: input.latitudeDeg,
    longitudeDeg: input.longitudeDeg,
    message: input.message,
    headline: input.headline ?? '',
    palette: input.palette ?? 'ink',
    productSku: defaultSku(),
    color: 'white',
    size: 'm',
    copies: 1,
    recipient: {
      name: '',
      email: '',
      line1: '',
      line2: '',
      townOrCity: '',
      stateOrCounty: '',
      postalOrZipCode: '',
      countryCode: 'US',
    },
  };
}

function setFormState<K extends keyof FormState>(
  _form: FormState,
  update: <K2 extends keyof FormState>(key: K2, value: FormState[K2]) => void,
  patch: Partial<FormState>
) {
  // Cast keys for type-safety; consumers only use this for typed partials.
  update('recipient' as keyof FormState, patch.recipient as FormState['recipient']);
  // Also handle top-level keys like productSku, copies, etc.
  for (const k of Object.keys(patch) as Array<keyof FormState>) {
    if (k === 'recipient') continue;
    update(k, patch[k] as FormState[typeof k]);
  }
}

function splitDate(d: Date): { date: string; time: string } {
  // Use UTC since the input UI says the time is in UTC.
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mi = String(d.getUTCMinutes()).padStart(2, '0');
  return { date: `${yyyy}-${mm}-${dd}`, time: `${hh}:${mi}` };
}
