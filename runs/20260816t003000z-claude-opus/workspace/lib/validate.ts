/** Request validation for the checkout endpoints. Everything the client sends
 *  is untrusted, including the price-bearing fields, which we ignore entirely. */

import { isSize, isStyle, type Size, type Style } from './catalog';
import type { ShippingAddress } from './scalablepress';

export class ValidationError extends Error {
  readonly status = 400;
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/** Max decoded artwork size. A 300 DPI print render lands well under this. */
const MAX_ARTWORK_BYTES = 4 * 1024 * 1024;

function str(obj: Record<string, unknown>, key: string, label: string, max: number): string {
  const value = obj[key];
  if (typeof value !== 'string' || !value.trim()) {
    throw new ValidationError(`${label} is required.`);
  }
  const trimmed = value.trim();
  if (trimmed.length > max) throw new ValidationError(`${label} is too long.`);
  return trimmed;
}

function optionalStr(obj: Record<string, unknown>, key: string, max: number): string {
  const value = obj[key];
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (trimmed.length > max) throw new ValidationError('Address line 2 is too long.');
  return trimmed;
}

function asObject(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ValidationError(`${label} is missing.`);
  }
  return value as Record<string, unknown>;
}

export interface QuoteRequest {
  style: Style;
  size: Size;
  timestamp: number;
  email: string;
  address: ShippingAddress;
  artwork: Buffer;
}

export function parseQuoteRequest(raw: unknown): QuoteRequest {
  const body = asObject(raw, 'Request body');
  const shirt = asObject(body.shirt, 'Shirt selection');

  if (!isStyle(shirt.style)) throw new ValidationError('Pick a shirt style.');
  if (!isSize(shirt.size)) throw new ValidationError('Pick a size.');

  const timestamp = Number(shirt.timestamp);
  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    throw new ValidationError('The shirt timestamp is missing.');
  }

  const email = str(body, 'email', 'Email', 254);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ValidationError('Enter a valid email address.');
  }

  const addr = asObject(body.address, 'Shipping address');
  const zip = str(addr, 'zip', 'Postal code', 12);
  const state = str(addr, 'state', 'State', 32);

  // Scalable Press DTG fulfillment for this catalog is US-only.
  if (!/^\d{5}(-\d{4})?$/.test(zip)) {
    throw new ValidationError('Enter a valid US postal code (we only ship to the US right now).');
  }
  if (!/^[A-Za-z]{2}$/.test(state)) {
    throw new ValidationError('Enter the two-letter state code, e.g. CA.');
  }

  const address: ShippingAddress = {
    name: str(addr, 'name', 'Name', 120),
    address1: str(addr, 'address1', 'Shipping address', 160),
    address2: optionalStr(addr, 'address2', 160),
    city: str(addr, 'city', 'City', 80),
    state: state.toUpperCase(),
    zip,
    country: 'US',
  };

  return {
    style: shirt.style,
    size: shirt.size,
    timestamp,
    email,
    address,
    artwork: parseArtwork(shirt.artwork),
  };
}

/** Decodes a `data:image/png;base64,...` URL into a validated PNG buffer. */
export function parseArtwork(value: unknown): Buffer {
  if (typeof value !== 'string') throw new ValidationError('The shirt artwork is missing.');

  const match = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(value);
  if (!match) throw new ValidationError('The shirt artwork must be a PNG data URL.');

  const buffer = Buffer.from(match[1], 'base64');
  if (buffer.length === 0) throw new ValidationError('The shirt artwork is empty.');
  if (buffer.length > MAX_ARTWORK_BYTES) throw new ValidationError('The shirt artwork is too large.');

  const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (!buffer.subarray(0, 8).equals(PNG_MAGIC)) {
    throw new ValidationError('The shirt artwork is not a valid PNG.');
  }
  return buffer;
}
