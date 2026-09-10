import Stripe from 'stripe';

let cached: Stripe | null = null;

export function stripe(): Stripe {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
  cached = new Stripe(key, { apiVersion: '2025-08-27.basil' });
  return cached;
}

/** Stripe caps a metadata value at 500 characters; long values are split. */
export function chunkMeta(key: string, value: string): Record<string, string> {
  const out: Record<string, string> = {};
  const size = 480;
  if (value.length <= size) {
    out[key] = value;
    return out;
  }
  for (let i = 0; i * size < value.length; i++) {
    out[`${key}${i}`] = value.slice(i * size, (i + 1) * size);
  }
  return out;
}

export function readMeta(meta: Stripe.Metadata | null | undefined, key: string): string {
  if (!meta) return '';
  if (typeof meta[key] === 'string') return meta[key] as string;
  let out = '';
  for (let i = 0; ; i++) {
    const part = meta[`${key}${i}`];
    if (typeof part !== 'string') break;
    out += part;
  }
  return out;
}
