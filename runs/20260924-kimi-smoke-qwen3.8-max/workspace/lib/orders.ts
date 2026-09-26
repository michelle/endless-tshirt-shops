/**
 * Order payload: everything needed to take payment and fulfil with Prodigi,
 * carried through checkout as an HMAC-signed token (see lib/tokens.ts).
 */
import crypto from 'node:crypto';
import type { Design } from './design';
import { GARMENT_COLORS, SIZES, sanitizeDesign } from './design';
import { COUNTRY_CODES, priceOrder, type Pricing } from './pricing';
import { signToken, verifyToken } from './tokens';

export type Shipping = {
  name: string;
  email: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  zip: string;
  country: string; // ISO-3166-1 alpha-2
};

export type OrderPayload = {
  v: 1;
  orderId: string;
  issuedAt: number;
  design: Design;
  product: {
    color: string; // Prodigi attribute value
    size: string; // Prodigi attribute value
    qty: number;
  };
  shipping: Shipping;
  pricing: Pricing;
  payment: {
    provider: 'stripe' | 'testpay';
    reference?: string;
    paidAt?: number;
  };
};

function cleanStr(v: unknown, max: number): string {
  if (typeof v !== 'string') return '';
  return v.replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
}

export function validateShipping(input: unknown): Shipping | null {
  if (!input || typeof input !== 'object') return null;
  const o = input as Record<string, unknown>;
  const shipping: Shipping = {
    name: cleanStr(o.name, 80),
    email: cleanStr(o.email, 160).toLowerCase(),
    phone: cleanStr(o.phone, 32),
    line1: cleanStr(o.line1, 120),
    line2: cleanStr(o.line2, 120),
    city: cleanStr(o.city, 80),
    state: cleanStr(o.state, 80),
    zip: cleanStr(o.zip, 16),
    country: cleanStr(o.country, 2).toUpperCase(),
  };
  if (shipping.name.length < 2) return null;
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(shipping.email)) return null;
  if (shipping.line1.length < 3) return null;
  if (shipping.city.length < 1) return null;
  if (shipping.zip.length < 3) return null;
  if (!COUNTRY_CODES.includes(shipping.country)) return null;
  return shipping;
}

export function newOrderId(): string {
  const t = Date.now().toString(36).toUpperCase();
  const r = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `LOL-${t}-${r}`;
}

export type CreateOrderInput = {
  design: unknown;
  product: { color: unknown; size: unknown; qty: unknown };
  shipping: unknown;
};

export function buildOrder(input: CreateOrderInput): { order?: OrderPayload; token?: string; error?: string } {
  const design = sanitizeDesign(input.design);
  if (!design) return { error: 'Invalid design.' };

  const color = String(input.product?.color ?? '');
  if (!GARMENT_COLORS.some((c) => c.id === color)) return { error: 'Invalid garment colour.' };

  const size = String(input.product?.size ?? '');
  if (!SIZES.includes(size as (typeof SIZES)[number])) return { error: 'Invalid size.' };

  const qty = Math.floor(Number(input.product?.qty ?? 1));
  if (!Number.isFinite(qty) || qty < 1 || qty > 3) return { error: 'Quantity must be 1–3.' };

  const shipping = validateShipping(input.shipping);
  if (!shipping) return { error: 'Please complete the shipping address.' };

  const pricing = priceOrder(shipping.country, qty);
  const order: OrderPayload = {
    v: 1,
    orderId: newOrderId(),
    issuedAt: Date.now(),
    design,
    product: { color, size, qty },
    shipping,
    pricing,
    payment: { provider: paymentMode() },
  };
  return { order, token: signToken(order) };
}

export function verifyOrderToken(token: string): OrderPayload | null {
  const payload = verifyToken<OrderPayload>(token);
  if (!payload || payload.v !== 1 || !payload.orderId) return null;
  // re-validate the essentials — cheap defence in depth
  if (!sanitizeDesign(payload.design)) return null;
  if (!GARMENT_COLORS.some((c) => c.id === payload.product?.color)) return null;
  if (!SIZES.includes(payload.product?.size as (typeof SIZES)[number])) return null;
  return payload;
}

export function paymentMode(): 'stripe' | 'testpay' {
  return process.env.STRIPE_SECRET_KEY ? 'stripe' : 'testpay';
}
