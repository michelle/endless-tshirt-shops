import Stripe from 'stripe';
import { createHmac, timingSafeEqual } from 'node:crypto';

export function stripeClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('Stripe is not configured');
  return new Stripe(key);
}
export function siteUrl() { return (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, ''); }
export function signSession(id: string) {
  if (!process.env.ART_SIGNING_SECRET) throw new Error('Artwork signing is not configured');
  return createHmac('sha256', process.env.ART_SIGNING_SECRET).update(id).digest('hex');
}
export function verifySession(id: string, sig: string) {
  const expected = Buffer.from(signSession(id), 'hex');
  const actual = /^[a-f0-9]{64}$/.test(sig) ? Buffer.from(sig, 'hex') : Buffer.alloc(0);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
