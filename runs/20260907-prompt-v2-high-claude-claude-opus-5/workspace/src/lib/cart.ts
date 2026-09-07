import { COLORS, SIZES, getDesign, unitPriceCents } from './catalog';

export type CartLine = { slug: string; color: string; size: string; qty: number };

export const MAX_LINES = 20;
export const MAX_QTY = 10;

/** Compact, metadata-safe encoding: `slug|color|size|qty` joined by `;`. */
export function encodeCart(lines: CartLine[]): string {
  return lines.map((l) => `${l.slug}|${l.color}|${l.size}|${l.qty}`).join(';');
}

export function decodeCart(s: string): CartLine[] {
  if (!s) return [];
  return s
    .split(';')
    .filter(Boolean)
    .map((part) => {
      const [slug, color, size, qty] = part.split('|');
      return { slug, color, size, qty: Number(qty) };
    });
}

/** Drops anything that is not a real, orderable variant. Never trust the client. */
export function sanitizeCart(input: unknown): CartLine[] {
  if (!Array.isArray(input)) return [];
  const out: CartLine[] = [];
  for (const raw of input.slice(0, MAX_LINES)) {
    if (!raw || typeof raw !== 'object') continue;
    const l = raw as Record<string, unknown>;
    const slug = String(l.slug ?? '');
    const color = String(l.color ?? '');
    const size = String(l.size ?? '');
    const qty = Math.floor(Number(l.qty ?? 0));
    if (!getDesign(slug)) continue;
    if (!COLORS.some((c) => c.id === color)) continue;
    if (!(SIZES as readonly string[]).includes(size)) continue;
    if (!Number.isFinite(qty) || qty < 1) continue;
    const existing = out.find((o) => o.slug === slug && o.color === color && o.size === size);
    if (existing) existing.qty = Math.min(MAX_QTY, existing.qty + qty);
    else out.push({ slug, color, size, qty: Math.min(MAX_QTY, qty) });
  }
  return out;
}

export function cartSubtotalCents(lines: CartLine[]) {
  return lines.reduce((sum, l) => sum + unitPriceCents(l.size) * l.qty, 0);
}

/** Split a long cart string across Stripe metadata values (500 char limit each). */
export function chunkForMetadata(s: string, key = 'cart'): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0, n = 0; i < s.length; i += 480, n++) out[`${key}${n}`] = s.slice(i, i + 480);
  return out;
}

export function joinMetadataChunks(md: Record<string, string> | null | undefined, key = 'cart') {
  if (!md) return '';
  let out = '';
  for (let n = 0; md[`${key}${n}`] !== undefined; n++) out += md[`${key}${n}`];
  return out;
}
