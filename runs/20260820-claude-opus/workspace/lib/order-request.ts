/**
 * Validation and normalisation for an incoming checkout request.
 * Everything here runs on the server and treats the request body as hostile.
 */

import { isSize, isStyle, type Size, type Style } from './catalog';
import type { ShippingAddress } from './scalablepress';

export class ValidationError extends Error {
  readonly statusCode = 400;
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export interface CheckoutRequest {
  style: Style;
  size: Size;
  email: string;
  address: ShippingAddress;
  artwork: Buffer;
  /** Epoch millis printed on the shirt, echoed back for receipts. */
  capturedAt: number;
}

/** Artwork is a ~300dpi PNG; anything much larger is a red flag. */
const MAX_ARTWORK_BYTES = 6 * 1024 * 1024;

function str(body: Record<string, unknown>, key: string, max: number, label: string): string {
  const raw = body[key];
  if (typeof raw !== 'string' || !raw.trim()) {
    throw new ValidationError(`${label} is required.`);
  }
  const value = raw.trim();
  if (value.length > max) {
    throw new ValidationError(`${label} must be ${max} characters or fewer.`);
  }
  return value;
}

function optionalStr(
  body: Record<string, unknown>,
  key: string,
  max: number,
  label: string,
): string | undefined {
  const raw = body[key];
  if (raw === undefined || raw === null || raw === '') return undefined;
  if (typeof raw !== 'string') throw new ValidationError(`${label} must be text.`);
  const value = raw.trim();
  if (!value) return undefined;
  if (value.length > max) {
    throw new ValidationError(`${label} must be ${max} characters or fewer.`);
  }
  return value;
}

function decodeArtwork(raw: unknown): Buffer {
  if (typeof raw !== 'string' || !raw) {
    throw new ValidationError('Shirt artwork is missing.');
  }
  const match = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(raw);
  if (!match) {
    throw new ValidationError('Shirt artwork must be a base64 PNG data URL.');
  }
  const buffer = Buffer.from(match[1], 'base64');
  if (buffer.length === 0) {
    throw new ValidationError('Shirt artwork is empty.');
  }
  if (buffer.length > MAX_ARTWORK_BYTES) {
    throw new ValidationError('Shirt artwork is too large.');
  }
  // Verify the PNG magic number rather than trusting the data URL prefix.
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (!buffer.subarray(0, 8).equals(signature)) {
    throw new ValidationError('Shirt artwork is not a valid PNG.');
  }
  return buffer;
}

export function parseCheckoutRequest(input: unknown): CheckoutRequest {
  if (typeof input !== 'object' || input === null) {
    throw new ValidationError('Expected a JSON object.');
  }
  const body = input as Record<string, unknown>;

  const shirt = (body.shirt ?? {}) as Record<string, unknown>;
  const address = (body.address ?? {}) as Record<string, unknown>;

  if (!isStyle(shirt.style)) throw new ValidationError('Pick a shirt style.');
  if (!isSize(shirt.size)) throw new ValidationError('Pick a shirt size.');

  const email = str(body, 'email', 254, 'Email');
  if (!/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(email)) {
    throw new ValidationError('Enter a valid email address.');
  }

  const zip = str(address, 'zip', 10, 'Postal code');
  if (!/^\d{5}(-\d{4})?$/.test(zip)) {
    throw new ValidationError('Enter a valid US ZIP code.');
  }

  const state = str(address, 'state', 2, 'State').toUpperCase();
  if (!/^[A-Z]{2}$/.test(state)) {
    throw new ValidationError('Enter a two-letter US state code.');
  }

  const capturedAt = typeof body.capturedAt === 'number' ? body.capturedAt : Date.now();

  return {
    style: shirt.style,
    size: shirt.size,
    email,
    capturedAt,
    artwork: decodeArtwork(shirt.artwork),
    address: {
      name: str(address, 'name', 120, 'Name'),
      address1: str(address, 'address1', 120, 'Shipping address'),
      address2: optionalStr(address, 'address2', 120, 'Apartment or suite'),
      city: str(address, 'city', 80, 'City'),
      state,
      zip,
      country: 'US',
      email,
    },
  };
}
