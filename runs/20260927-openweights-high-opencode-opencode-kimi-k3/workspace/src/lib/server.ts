// Server-only helpers: base URL, Stripe REST API, Prodigi Print API.
import { encodeDesign, type DesignInput } from './design';

export function appBaseUrl(): string {
  if (process.env.APP_BASE_URL) return process.env.APP_BASE_URL.replace(/\/$/, '');
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL)
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}

// ---------------- Stripe ----------------

function formEncode(obj: Record<string, unknown>, prefix?: string): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (typeof v === 'object' && !Array.isArray(v)) {
      parts.push(formEncode(v as Record<string, unknown>, key));
    } else if (Array.isArray(v)) {
      v.forEach((item, i) => {
        if (typeof item === 'object' && item !== null) {
          parts.push(formEncode(item as Record<string, unknown>, `${key}[${i}]`));
        } else {
          parts.push(`${encodeURIComponent(`${key}[${i}]`)}=${encodeURIComponent(String(item))}`);
        }
      });
    } else {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`);
    }
  }
  return parts.filter(Boolean).join('&');
}

export class StripeError extends Error {}

export async function stripeApi<T = Record<string, unknown>>(
  path: string,
  method: 'GET' | 'POST' = 'GET',
  body?: Record<string, unknown>
): Promise<T> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new StripeError('STRIPE_SECRET_KEY is not configured');
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    },
    body: body ? formEncode(body) : undefined,
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown> & {
    error?: { message?: string };
  };
  if (!res.ok) {
    throw new StripeError(json.error?.message || `Stripe API error ${res.status}`);
  }
  return json as T;
}

// ---------------- Prodigi ----------------

const PRODIGI_BASE = () =>
  (process.env.PRODIGI_BASE_URL || 'https://api.sandbox.prodigi.com/v4.0').replace(/\/$/, '');

export class ProdigiError extends Error {}

async function prodigiApi<T = Record<string, unknown>>(
  path: string,
  method: 'GET' | 'POST' = 'GET',
  body?: unknown
): Promise<T> {
  const key = process.env.PRODIGI_API_KEY;
  if (!key) throw new ProdigiError('PRODIGI_API_KEY is not configured');
  const res = await fetch(`${PRODIGI_BASE()}${path}`, {
    method,
    headers: {
      'X-API-Key': key,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const msg =
      (json as { message?: string; error?: { message?: string } }).message ||
      (json as { error?: { message?: string } }).error?.message ||
      `Prodigi API error ${res.status}`;
    throw new ProdigiError(msg);
  }
  return json as T;
}

export interface ProdigiOrderResult {
  outcome: string;
  order?: { id: string; status?: { stage?: string } };
}

export function designAssetUrl(design: DesignInput, inkId: string): string {
  const d = encodeDesign(design);
  return `${appBaseUrl()}/api/design.png?d=${encodeURIComponent(d)}&ink=${encodeURIComponent(inkId)}`;
}

export async function prodigiCreateOrder(payload: Record<string, unknown>): Promise<ProdigiOrderResult> {
  return prodigiApi<ProdigiOrderResult>('/orders', 'POST', payload);
}

export async function prodigiGetOrder(id: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await prodigiApi<{ outcome: string; order?: Record<string, unknown> }>(
      `/orders/${encodeURIComponent(id)}`
    );
    return res.order ?? null;
  } catch {
    return null;
  }
}
