import { createHash } from 'node:crypto';
import { PALETTE_IDS } from './palettes';
import { MAX_QTY, SHIPS_TO, SHIRT_COLORS, SHIRT_SIZES } from './product';
import type { DesignParams, OrderPayload, ProductChoice, ShippingInfo } from './types';

type Errors = Record<string, string>;
type Result<T> = { ok: true; value: T } | { ok: false; errors: Errors };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function str(v: unknown, max: number): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

function num(v: unknown): number | null {
  const n = typeof v === 'string' ? parseFloat(v) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) ? n : null;
}

export function validateDesign(raw: unknown): Result<DesignParams> {
  const o = (raw ?? {}) as Record<string, unknown>;
  const errors: Errors = {};

  const name = str(o.name, 24);
  if (!name) errors.name = 'Add a name for the shirt (up to 24 characters).';

  const caption = str(o.caption, 48);

  const date = str(o.date, 10);
  if (!DATE_RE.test(date) || Number.isNaN(Date.parse(date))) {
    errors.date = 'Pick a valid date.';
  } else {
    const t = Date.parse(date);
    if (t < Date.UTC(1900, 0, 1) || t > Date.now() + 86400000) {
      errors.date = 'Pick a date between 1900 and today.';
    }
  }

  const time = TIME_RE.test(str(o.time, 5)) ? str(o.time, 5) : '';
  if (!time) errors.time = 'Pick a valid time.';

  const lat = num(o.lat);
  const lng = num(o.lng);
  if (lat === null || lat < -90 || lat > 90) errors.lat = 'Choose a location for the sky.';
  if (lng === null || lng < -180 || lng > 180) errors.lng = 'Choose a location for the sky.';

  const placeLabel = str(o.placeLabel, 60);
  if (!placeLabel) errors.placeLabel = 'Choose a location for the sky.';

  const palette = str(o.palette, 12);
  if (!PALETTE_IDS.includes(palette as (typeof PALETTE_IDS)[number])) errors.palette = 'Unknown palette.';

  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    value: {
      name,
      caption,
      date,
      time,
      lat: lat as number,
      lng: lng as number,
      placeLabel,
      palette: palette as DesignParams['palette'],
      showLines: o.showLines !== false && o.showLines !== 'false',
      showLabels: o.showLabels !== false && o.showLabels !== 'false',
    },
  };
}

export function validateProduct(raw: unknown): Result<ProductChoice> {
  const o = (raw ?? {}) as Record<string, unknown>;
  const errors: Errors = {};
  const color = str(o.color, 40);
  if (!SHIRT_COLORS.some((c) => c.id === color)) errors.color = 'Choose a shirt colour.';
  const size = str(o.size, 8);
  if (!SHIRT_SIZES.some((s) => s.id === size)) errors.size = 'Choose a size.';
  const qty = Math.floor(num(o.qty) ?? 1);
  if (qty < 1 || qty > MAX_QTY) errors.qty = `Quantity must be 1–${MAX_QTY}.`;
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { color, size, qty } };
}

export function validateShipping(raw: unknown): Result<ShippingInfo> {
  const o = (raw ?? {}) as Record<string, unknown>;
  const errors: Errors = {};
  const fullName = str(o.fullName, 120);
  if (fullName.length < 2) errors.fullName = 'Enter the recipient name.';
  const email = str(o.email, 160);
  if (!EMAIL_RE.test(email)) errors.email = 'Enter a valid email.';
  const line1 = str(o.line1, 120);
  if (line1.length < 2) errors.line1 = 'Enter a street address.';
  const line2 = str(o.line2, 120) || undefined;
  const city = str(o.city, 80);
  if (!city) errors.city = 'Enter a city.';
  const postalCode = str(o.postalCode, 12);
  if (postalCode.length < 2) errors.postalCode = 'Enter a postal / ZIP code.';
  const country = str(o.country, 2).toUpperCase();
  if (!SHIPS_TO.includes(country)) {
    errors.country = "We can't print & ship this garment to that country yet.";
  }
  const state = str(o.state, 80) || undefined;
  if ((country === 'US' || country === 'CA') && !state) {
    errors.state = 'State / province is required for US & Canada.';
  }
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { fullName, email, line1, line2, city, state, postalCode, country } };
}

export function validateOrder(raw: unknown): Result<OrderPayload> {
  const o = (raw ?? {}) as Record<string, unknown>;
  const d = validateDesign(o.design);
  const p = validateProduct(o.product);
  const s = validateShipping(o.shipping);
  const errors: Errors = {};
  if (!d.ok) Object.assign(errors, d.errors);
  if (!p.ok) Object.assign(errors, p.errors);
  if (!s.ok) Object.assign(errors, s.errors);
  const orderRef = str(o.orderRef, 20);
  if (!/^NL-[A-Z0-9]{4,12}$/.test(orderRef)) errors.orderRef = 'Bad order reference.';
  const attemptId = str(o.attemptId, 64);
  if (!attemptId) errors.attemptId = 'Bad checkout attempt.';
  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    value: {
      orderRef,
      attemptId,
      design: (d as { ok: true; value: DesignParams }).value,
      product: (p as { ok: true; value: ProductChoice }).value,
      shipping: (s as { ok: true; value: ShippingInfo }).value,
    },
  };
}

export function makeOrderRef(attemptId: string): string {
  const h = createHash('sha256').update(attemptId).digest();
  const n = h.readBigUInt64BE(0);
  return `NL-${n.toString(36).toUpperCase().padStart(6, '0').slice(-8)}`;
}
