'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { buildDesignSvg } from '@/lib/design';
import { PALETTES } from '@/lib/palettes';
import {
  COUNTRY_LABELS,
  SHIPPING_PRICE_CENTS,
  SHIRT_COLORS,
  SHIRT_PRICE_CENTS,
  SHIRT_SIZES,
  SHIPS_TO,
} from '@/lib/product';
import { formatDateLong, formatUSD } from '@/lib/format';
import type { DesignParams, ProductChoice, ShippingInfo } from '@/lib/types';
import { DRAFT_KEY } from '@/components/Studio';
import ShirtMock from '@/components/ShirtMock';

interface Draft {
  design: DesignParams;
  product: ProductChoice;
}

const EMPTY_SHIPPING: ShippingInfo = {
  fullName: '',
  email: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'US',
};

function CheckoutInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [shipping, setShipping] = useState<ShippingInfo>(EMPTY_SHIPPING);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const attemptId = useRef<string>('');

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (raw) setDraft(JSON.parse(raw) as Draft);
    } catch {
      /* no draft */
    }
    attemptId.current =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `a-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }, []);

  const svg = useMemo(() => {
    if (!draft) return null;
    try {
      return buildDesignSvg(draft.design);
    } catch {
      return null;
    }
  }, [draft]);

  function patch(p: Partial<ShippingInfo>) {
    setShipping((s) => ({ ...s, ...p }));
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (shipping.fullName.trim().length < 2) e.fullName = 'Required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shipping.email)) e.email = 'Valid email required';
    if (shipping.line1.trim().length < 2) e.line1 = 'Required';
    if (!shipping.city.trim()) e.city = 'Required';
    if (shipping.postalCode.trim().length < 2) e.postalCode = 'Required';
    if (!SHIPS_TO.includes(shipping.country)) e.country = 'Not shipped yet';
    if ((shipping.country === 'US' || shipping.country === 'CA') && !shipping.state?.trim())
      e.state = 'Required for US/CA';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    setFormError(null);
    if (!draft || !validate()) return;
    setBusy(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          design: draft.design,
          product: draft.product,
          shipping: {
            ...shipping,
            fullName: shipping.fullName.trim(),
            line2: shipping.line2?.trim() || undefined,
            state: shipping.state?.trim() || undefined,
          },
          attemptId: attemptId.current,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBusy(false);
        if (data?.errors) setErrors(data.errors);
        setFormError(data?.error ?? 'Checkout failed. Please try again.');
        return;
      }
      // Hand off to the payment provider. Nothing is sent to the print
      // studio until the payment succeeds (webhook / sandbox pay step).
      window.location.href = data.mode === 'stripe' ? data.url : data.payUrl;
    } catch {
      setBusy(false);
      setFormError('Network error — please try again.');
    }
  }

  if (!draft) {
    return (
      <div className="panel p-10 text-center">
        <div className="font-display text-[18px] tracking-[0.18em] uppercase mb-3">
          Nothing to check out — yet
        </div>
        <p className="muted text-[13.5px] mb-6">Design your sky first; it takes a minute.</p>
        <Link href="/#studio" className="nl-btn nl-btn-primary">Design your shirt</Link>
      </div>
    );
  }

  const garment = SHIRT_COLORS.find((c) => c.id === draft.product.color) ?? SHIRT_COLORS[0];
  const sizeLabel = SHIRT_SIZES.find((s) => s.id === draft.product.size)?.label ?? draft.product.size;
  const qty = draft.product.qty;
  const total = qty * SHIRT_PRICE_CENTS + SHIPPING_PRICE_CENTS;
  const canceled = params.get('canceled') === '1';

  const countryList = SHIPS_TO.map((cc) => ({
    cc,
    label: COUNTRY_LABELS[cc] ?? cc,
  })).sort((a, b) => (a.cc === 'US' ? -1 : b.cc === 'US' ? 1 : a.label.localeCompare(b.label)));

  return (
    <div className="grid lg:grid-cols-[1fr_480px] gap-10 items-start">
      <form onSubmit={submit} className="panel p-6 md:p-8 space-y-6" noValidate>
        {canceled && (
          <div className="rounded-xl border border-[var(--line)] px-4 py-3 text-[13px] muted">
            Checkout was canceled — nothing was charged. Ready when you are.
          </div>
        )}
        <div className="divider-star text-[11px] tracked">ship to</div>
        <div className="grid md:grid-cols-2 gap-5">
          <div className="md:col-span-2">
            <label className="nl-label">Full name</label>
            <input
              className="nl-input"
              value={shipping.fullName}
              aria-invalid={errors.fullName ? 'true' : undefined}
              onChange={(e) => patch({ fullName: e.target.value })}
              autoComplete="name"
            />
            {errors.fullName && <div className="nl-error">{errors.fullName}</div>}
          </div>
          <div className="md:col-span-2">
            <label className="nl-label">Email (order updates)</label>
            <input
              className="nl-input"
              type="email"
              value={shipping.email}
              aria-invalid={errors.email ? 'true' : undefined}
              onChange={(e) => patch({ email: e.target.value })}
              autoComplete="email"
            />
            {errors.email && <div className="nl-error">{errors.email}</div>}
          </div>
          <div className="md:col-span-2">
            <label className="nl-label">Address line 1</label>
            <input
              className="nl-input"
              value={shipping.line1}
              aria-invalid={errors.line1 ? 'true' : undefined}
              onChange={(e) => patch({ line1: e.target.value })}
              autoComplete="address-line1"
            />
            {errors.line1 && <div className="nl-error">{errors.line1}</div>}
          </div>
          <div className="md:col-span-2">
            <label className="nl-label">Address line 2 (optional)</label>
            <input
              className="nl-input"
              value={shipping.line2 ?? ''}
              onChange={(e) => patch({ line2: e.target.value })}
              autoComplete="address-line2"
            />
          </div>
          <div>
            <label className="nl-label">City</label>
            <input
              className="nl-input"
              value={shipping.city}
              aria-invalid={errors.city ? 'true' : undefined}
              onChange={(e) => patch({ city: e.target.value })}
              autoComplete="address-level2"
            />
            {errors.city && <div className="nl-error">{errors.city}</div>}
          </div>
          <div>
            <label className="nl-label">State / province (US &amp; CA)</label>
            <input
              className="nl-input"
              value={shipping.state ?? ''}
              aria-invalid={errors.state ? 'true' : undefined}
              onChange={(e) => patch({ state: e.target.value })}
              autoComplete="address-level1"
            />
            {errors.state && <div className="nl-error">{errors.state}</div>}
          </div>
          <div>
            <label className="nl-label">Postal / ZIP code</label>
            <input
              className="nl-input"
              value={shipping.postalCode}
              aria-invalid={errors.postalCode ? 'true' : undefined}
              onChange={(e) => patch({ postalCode: e.target.value })}
              autoComplete="postal-code"
            />
            {errors.postalCode && <div className="nl-error">{errors.postalCode}</div>}
          </div>
          <div>
            <label className="nl-label">Country</label>
            <select
              className="nl-input"
              value={shipping.country}
              aria-invalid={errors.country ? 'true' : undefined}
              onChange={(e) => patch({ country: e.target.value })}
              autoComplete="country"
            >
              {countryList.map((c) => (
                <option key={c.cc} value={c.cc}>
                  {c.label}
                </option>
              ))}
            </select>
            {errors.country && <div className="nl-error">{errors.country}</div>}
          </div>
        </div>

        {formError && (
          <div className="rounded-xl border border-[rgba(255,157,157,0.4)] bg-[rgba(255,157,157,0.06)] px-4 py-3 text-[13px] text-[var(--danger)]">
            {formError}
          </div>
        )}

        <button type="submit" className="nl-btn nl-btn-primary w-full" disabled={busy}>
          {busy ? 'Opening secure payment…' : `Pay ${formatUSD(total)} →`}
        </button>
        <p className="text-[11px] faint text-center leading-relaxed">
          Payment is processed by Stripe. Your shirt is sent to the print studio
          <span className="text-[var(--gold)]"> only after payment succeeds</span>.
        </p>
      </form>

      {/* summary */}
      <div className="lg:sticky lg:top-24 panel p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] tracked muted">your one-of-one</span>
          <button
            type="button"
            className="text-[11px] tracked gold hover:underline"
            onClick={() => router.push('/#studio')}
          >
            edit design
          </button>
        </div>
        <div className="mx-auto max-w-[300px]">
          {svg && <ShirtMock garmentHex={garment.hex} designSvg={svg} uid="co" />}
        </div>
        <div className="mt-4 text-[12.5px] muted space-y-1.5 border-t hairline pt-4">
          <div className="flex justify-between">
            <span>Name</span>
            <span className="text-[var(--ink)]">{draft.design.name}</span>
          </div>
          <div className="flex justify-between">
            <span>Night</span>
            <span className="text-[var(--ink)]">
              {formatDateLong(draft.design.date)} · {draft.design.time}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Place</span>
            <span className="text-[var(--ink)]">{draft.design.placeLabel}</span>
          </div>
          <div className="flex justify-between">
            <span>Palette</span>
            <span className="text-[var(--ink)]">{PALETTES[draft.design.palette].label}</span>
          </div>
          <div className="flex justify-between">
            <span>Tee</span>
            <span className="text-[var(--ink)]">
              {garment.label} · {sizeLabel} × {qty}
            </span>
          </div>
        </div>
        <div className="mt-4 border-t hairline pt-4 space-y-2 text-[13px]">
          <div className="flex justify-between muted">
            <span>Subtotal</span>
            <span>{formatUSD(qty * SHIRT_PRICE_CENTS)}</span>
          </div>
          <div className="flex justify-between muted">
            <span>Shipping</span>
            <span>{formatUSD(SHIPPING_PRICE_CENTS)}</span>
          </div>
          <div className="flex justify-between text-[15px] text-[var(--ink)] pt-1">
            <span>Total</span>
            <span className="gold">{formatUSD(total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutForm() {
  return (
    <Suspense
      fallback={
        <div className="panel p-10 text-center faint text-[13px]">loading checkout…</div>
      }
    >
      <CheckoutInner />
    </Suspense>
  );
}
