// A design is fully described by the token in its URL — there is no design
// database. The same token drives the on-screen preview, the print file that
// Prodigi downloads, and the Stripe line item.

import { COLOR_BY_ID, SIZE_BY_ID, MAX_QTY } from './catalog';
import { PALETTE_BY_ID } from './palettes';

export type Design = {
  n: string;  // name
  d: string;  // date, YYYY-MM-DD
  p: string;  // place
  pal: string;
  col: string;
  sz: string;
  q: number;
};

export const DEFAULT_DESIGN: Design = {
  n: '', d: '', p: '', pal: 'auto', col: 'natural', sz: 'm', q: 1,
};

function b64urlEncode(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  const b64 = typeof btoa === 'function' ? btoa(bin) : Buffer.from(bytes).toString('base64');
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(s: string): string {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  if (typeof atob === 'function') {
    const bin = atob(b64);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }
  return Buffer.from(b64, 'base64').toString('utf8');
}

export function encodeDesign(d: Design): string {
  return b64urlEncode(JSON.stringify(sanitiseDesign(d)));
}

export function decodeDesign(token: string): Design | null {
  try {
    const raw = JSON.parse(b64urlDecode(token));
    if (!raw || typeof raw !== 'object') return null;
    return sanitiseDesign(raw as Partial<Design>);
  } catch {
    return null;
  }
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const CONTROL_OR_MARKUP = new RegExp('[' + '\u0000-\u001f\u007f<>' + ']', 'g');

/**
 * Clamps every field to something we are willing to print. Runs on both sides
 * of the wire, so a hand-edited token can never widen what ends up on a shirt.
 */
export function sanitiseDesign(d: Partial<Design>): Design {
  const clean = (v: unknown, max: number) =>
    String(v ?? '')
      .replace(CONTROL_OR_MARKUP, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, max);

  const date = ISO_DATE.test(String(d.d ?? '')) ? String(d.d) : '';
  const q = Math.min(MAX_QTY, Math.max(1, Math.floor(Number(d.q) || 1)));

  return {
    n: clean(d.n, 40),
    d: date,
    p: clean(d.p, 40),
    pal: PALETTE_BY_ID[String(d.pal)] ? String(d.pal) : 'auto',
    col: COLOR_BY_ID[String(d.col)] ? String(d.col) : DEFAULT_DESIGN.col,
    sz: SIZE_BY_ID[String(d.sz)] ? String(d.sz) : DEFAULT_DESIGN.sz,
    q,
  };
}

/** A design is only orderable once it names a specimen. */
export function designErrors(d: Design): string[] {
  const errs: string[] = [];
  if (d.n.replace(/[^A-Za-zÀ-ɏ]/g, '').length < 2) {
    errs.push('Enter a name of at least two letters.');
  }
  if (!d.d) {
    errs.push('Choose a date.');
  } else {
    const y = Number(d.d.slice(0, 4));
    const m = Number(d.d.slice(5, 7));
    const day = Number(d.d.slice(8, 10));
    if (y < 1800 || y > 2100 || m < 1 || m > 12 || day < 1 || day > 31) {
      errs.push('Choose a real date between 1800 and 2100.');
    }
  }
  if (d.p.trim().length < 2) errs.push('Enter a place.');
  return errs;
}

export function unitPriceCents(d: Design): number {
  return SIZE_BY_ID[d.sz]?.priceCents ?? 4400;
}

export function formatMoney(cents: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}
