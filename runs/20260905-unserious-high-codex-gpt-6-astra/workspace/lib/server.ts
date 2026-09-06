import Stripe from 'stripe';
import { createHmac, timingSafeEqual, createHash } from 'node:crypto';
import { momentSchema, type Moment } from './catalog';

export function required(name: string): string { const value = process.env[name]; if (!value) throw new Error(`Missing configuration: ${name}`); return value; }
export function isTestMode() { return process.env.COMMERCE_MODE !== 'live'; }
export function appUrl() { return required('APP_URL').replace(/\/$/, ''); }
export function storeId() { return createHash('sha256').update(appUrl()).digest('hex').slice(0, 24); }
export function stripeClient() {
  const key = required('STRIPE_SECRET_KEY');
  if (isTestMode() !== key.includes('_test_')) throw new Error('Commerce mode and Stripe key do not match');
  return new Stripe(key, { maxNetworkRetries: 2, timeout: 15000 });
}
export function signMoment(moment: Moment) {
  const data = Buffer.from(JSON.stringify({ ...momentSchema.parse(moment), version: 1 })).toString('base64url');
  return `${data}.${createHmac('sha256', required('ARTWORK_SIGNING_SECRET')).update(data).digest('base64url')}`;
}
export function verifyMoment(token: string): Moment {
  if (token.length > 600) throw new Error('Invalid moment');
  const [data, signature, extra] = token.split('.');
  if (!data || !signature || extra) throw new Error('Invalid moment');
  const expected = createHmac('sha256', required('ARTWORK_SIGNING_SECRET')).update(data).digest();
  const actual = Buffer.from(signature, 'base64url');
  if (actual.length !== expected.length || !timingSafeEqual(expected, actual)) throw new Error('Invalid moment');
  const parsed = JSON.parse(Buffer.from(data, 'base64url').toString());
  if (parsed.version !== 1) throw new Error('Unknown artwork version');
  return momentSchema.parse(parsed);
}
export function checkOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (origin && origin !== appUrl() && origin !== new URL(request.url).origin && !(process.env.NODE_ENV === 'development' && /^http:\/\/localhost:\d+$/.test(origin))) throw new Error('Origin not allowed');
}
export function safeError(context: string, error: unknown) {
  const e = error as { type?: string; code?: string; statusCode?: number; message?: string };
  console.error(context, { type: e?.type || 'Error', code: e?.code, status: e?.statusCode });
}
