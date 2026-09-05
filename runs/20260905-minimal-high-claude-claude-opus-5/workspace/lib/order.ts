/**
 * Order model.
 *
 * There is no database here on purpose: an order is exactly one Stripe
 * PaymentIntent. Everything we need to fulfil it (the frozen timestamp, the
 * cut, the size, the shipping address) lives in that PaymentIntent's metadata,
 * and the Prodigi order id is written back to the same place. That gives us a
 * durable, auditable record and a single source of truth with no extra
 * infrastructure to provision or keep in sync.
 */

import type Stripe from 'stripe';
import {
  PRICE_CENTS,
  STYLE_SPECS,
  isShirtSize,
  isShirtStyle,
  prodigiSize,
  type ShirtSize,
  type ShirtStyle,
} from './products';
import { isValidTimestamp } from './artwork';

export type ShippingAddress = {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
};

export type OrderDraft = {
  ts: number;
  style: ShirtStyle;
  size: ShirtSize;
  email: string;
  address: ShippingAddress;
};

export type FulfillmentStatus =
  | 'awaiting_payment'
  | 'placing'
  | 'placed'
  | 'failed';

const EMAIL_RE = /^[^@\s]+@[^@\s.]+\.[^@\s]+$/;

export class ValidationError extends Error {
  constructor(
    message: string,
    readonly field?: string,
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

function str(v: unknown, field: string, { max = 200, required = true } = {}): string {
  const s = typeof v === 'string' ? v.trim() : '';
  if (!s) {
    if (required) throw new ValidationError(`${field} is required`, field);
    return '';
  }
  if (s.length > max) throw new ValidationError(`${field} is too long`, field);
  return s;
}

/** Parses and validates the untrusted checkout payload from the browser. */
export function parseOrderDraft(input: any): OrderDraft {
  const ts = Number(input?.ts);
  if (!isValidTimestamp(ts)) {
    throw new ValidationError('That timestamp does not look right', 'ts');
  }
  if (!isShirtStyle(input?.style)) {
    throw new ValidationError('Pick a shirt style', 'style');
  }
  if (!isShirtSize(input?.size)) {
    throw new ValidationError('Pick a size', 'size');
  }

  const email = str(input?.email, 'Email', { max: 254 });
  if (!EMAIL_RE.test(email)) {
    throw new ValidationError('That email address does not look right', 'email');
  }

  const a = input?.address ?? {};
  const country = str(a.country, 'Country', { max: 2 }).toUpperCase();
  if (!/^[A-Z]{2}$/.test(country)) {
    throw new ValidationError('Country must be a two-letter code', 'country');
  }

  return {
    ts,
    style: input.style,
    size: input.size,
    email,
    address: {
      name: str(a.name, 'Name'),
      line1: str(a.line1, 'Shipping address'),
      line2: str(a.line2, 'Address line 2', { required: false }) || undefined,
      city: str(a.city, 'City', { max: 100 }),
      state: str(a.state, 'State', { max: 100, required: false }) || undefined,
      postalCode: str(a.postalCode, 'Postal code', { max: 32 }),
      country,
    },
  };
}

/** Flattens a draft into Stripe metadata (values are capped at 500 chars). */
export function draftToMetadata(draft: OrderDraft): Stripe.MetadataParam {
  return {
    product: 'datetime-tee',
    ts: String(draft.ts),
    style: draft.style,
    size: draft.size,
    sku: STYLE_SPECS[draft.style].sku,
    email: draft.email,
    ship_name: draft.address.name,
    ship_line1: draft.address.line1,
    ship_line2: draft.address.line2 ?? '',
    ship_city: draft.address.city,
    ship_state: draft.address.state ?? '',
    ship_postal: draft.address.postalCode,
    ship_country: draft.address.country,
  };
}

/** Rebuilds a draft from PaymentIntent metadata, or null if it is incomplete. */
export function metadataToDraft(md: Stripe.Metadata | null): OrderDraft | null {
  if (!md) return null;
  const ts = Number(md.ts);
  if (!isValidTimestamp(ts) || !isShirtStyle(md.style) || !isShirtSize(md.size)) {
    return null;
  }
  if (!md.email || !md.ship_name || !md.ship_line1 || !md.ship_country) return null;

  return {
    ts,
    style: md.style,
    size: md.size,
    email: md.email,
    address: {
      name: md.ship_name,
      line1: md.ship_line1,
      line2: md.ship_line2 || undefined,
      city: md.ship_city || '',
      state: md.ship_state || undefined,
      postalCode: md.ship_postal || '',
      country: md.ship_country,
    },
  };
}

export function prodigiAttributes(draft: OrderDraft): Record<string, string> {
  return {
    color: STYLE_SPECS[draft.style].color,
    size: prodigiSize(draft.size),
  };
}

export const ORDER_AMOUNT_CENTS = PRICE_CENTS;
