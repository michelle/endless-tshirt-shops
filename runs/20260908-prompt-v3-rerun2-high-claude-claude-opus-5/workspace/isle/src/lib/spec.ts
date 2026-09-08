import crypto from 'node:crypto';
import { SIZES, SHIRTS, clean, normalize, unengravable, type Spec, type ShirtKey, type SizeKey } from './chart';

export const PRODUCT = {
  sku: 'GLOBAL-TEE-GIL-64000',
  title: 'The Isle of You',
  blurb: 'Unisex heavyweight softstyle tee, 100% ringspun cotton, Gildan 64000',
  unitAmount: 4800, // USD cents
  currency: 'usd',
  maxQty: 5,
};

export const SHIPPING = {
  standard: { label: 'Standard (7-12 business days)', amount: 0, prodigi: 'Budget' },
  express: { label: 'Express (3-5 business days)', amount: 1400, prodigi: 'Express' },
} as const;
export type ShippingKey = keyof typeof SHIPPING;

/** Prodigi ships the Gildan 64000 to these; Stripe collects an address in the same set. */
export const SHIP_TO = [
  'US', 'CA', 'GB', 'IE', 'AU', 'NZ', 'DE', 'FR', 'ES', 'IT', 'NL', 'BE', 'AT',
  'DK', 'SE', 'NO', 'FI', 'PT', 'PL', 'CZ', 'CH', 'JP', 'SG', 'AE',
] as const;

/**
 * The whole order is described by these few short strings, so the design travels
 * inside the Stripe session's metadata and no database is needed to reprint it.
 */
export function parseSpec(input: unknown): Spec {
  const o = (input ?? {}) as Record<string, unknown>;
  const str = (k: string) => clean(typeof o[k] === 'string' ? (o[k] as string) : '', 20);
  const shirt = String(o.shirt ?? '');
  const size = String(o.size ?? '');
  return {
    name: str('name'),
    port: str('port'),
    peak: str('peak'),
    dread: str('dread'),
    bay: str('bay'),
    wilds: str('wilds'),
    year: clean(String(o.year ?? ''), 4).replace(/[^0-9]/g, ''),
    shirt: (Object.prototype.hasOwnProperty.call(SHIRTS, shirt) ? shirt : 'natural') as ShirtKey,
    size: ((SIZES as readonly string[]).includes(size) ? size : 'm') as SizeKey,
  };
}

/** Every question must be answered before we will engrave a plate. */
export function specErrors(spec: Spec): string[] {
  const missing: string[] = [];
  const fields: [keyof Spec, string][] = [
    ['name', 'your name'],
    ['port', 'where you are from'],
    ['peak', 'what you are chasing'],
    ['dread', 'what you avoid'],
    ['bay', 'where you feel safest'],
    ['wilds', 'where your hours go'],
  ];
  for (const [k, human] of fields) if (!String(spec[k]).trim()) missing.push(human);
  if (!/^\d{4}$/.test(spec.year)) missing.push('a four-digit year');

  const bad = new Set<string>();
  for (const [k] of fields) for (const ch of unengravable(String(spec[k]))) bad.add(ch);
  if (bad.size) {
    missing.push(
      `the engraving font cannot set ${Array.from(bad).join(' ')} - please use the Latin alphabet`
    );
  }
  return missing;
}

export function encodeSpec(spec: Spec): string {
  return Buffer.from(JSON.stringify(spec), 'utf8').toString('base64url');
}
export function decodeSpec(payload: string): Spec {
  return parseSpec(JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')));
}

function secret(): string {
  const s = process.env.ART_SIGNING_SECRET;
  if (!s) throw new Error('ART_SIGNING_SECRET is not set');
  return s;
}
export function signPayload(payload: string): string {
  return crypto.createHmac('sha256', secret()).update(payload).digest('hex');
}
/**
 * The print-file endpoint is public (Prodigi fetches it), so it only renders
 * payloads this server signed. Otherwise it is an open image-rendering proxy.
 */
export function verifyPayload(payload: string, sig: string): boolean {
  const want = Buffer.from(signPayload(payload), 'hex');
  const got = Buffer.from(String(sig || ''), 'hex');
  return want.length === got.length && crypto.timingSafeEqual(want, got);
}

/** Human-readable summary for the Stripe line item and the order page. */
export function describe(spec: Spec): string {
  const n = normalize(spec);
  return `The Isle of ${n.name} - ${SHIRTS[spec.shirt].label}, size ${spec.size.toUpperCase()}`;
}

export function specToMetadata(spec: Spec): Record<string, string> {
  return {
    isle_name: spec.name,
    isle_port: spec.port,
    isle_peak: spec.peak,
    isle_dread: spec.dread,
    isle_bay: spec.bay,
    isle_wilds: spec.wilds,
    isle_year: spec.year,
    isle_shirt: spec.shirt,
    isle_size: spec.size,
  };
}
export function specFromMetadata(md: Record<string, string> | null | undefined): Spec {
  const m = md ?? {};
  return parseSpec({
    name: m.isle_name,
    port: m.isle_port,
    peak: m.isle_peak,
    dread: m.isle_dread,
    bay: m.isle_bay,
    wilds: m.isle_wilds,
    year: m.isle_year,
    shirt: m.isle_shirt,
    size: m.isle_size,
  });
}

/** Absolute origin for asset URLs handed to Prodigi. */
export function siteUrl(req?: Request): string {
  const configured = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/+$/, '');
  if (req) {
    const h = new Headers(req.headers);
    const host = h.get('x-forwarded-host') || h.get('host');
    if (host) return `${h.get('x-forwarded-proto') || 'https'}://${host}`;
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return 'http://localhost:3210';
}

export function artUrl(spec: Spec, origin: string, width = 3120): string {
  const d = encodeSpec(spec);
  return `${origin}/api/art?d=${d}&sig=${signPayload(d)}&w=${width}`;
}
