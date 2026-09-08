import { GARMENTS, PRICE_CENTS, SAINTS, SIZES, type Size } from "./catalog";

export type LineInput = { slug: string; color: string; size: string; qty: number };

export type PricedLine = LineInput & {
  name: string;
  epithet: string;
  colorLabel: string;
  tone: "dark" | "light";
  unitCents: number;
  lineCents: number;
};

export const MAX_QTY = 10;

/** Re-derives every line from the server catalogue; the client never sets prices. */
export function priceCart(input: unknown): { lines: PricedLine[]; subtotalCents: number; errors: string[] } {
  const errors: string[] = [];
  const raw = Array.isArray(input) ? input : [];
  const lines: PricedLine[] = [];

  for (const item of raw.slice(0, 50)) {
    const it = item as Partial<LineInput>;
    const saint = SAINTS.find((s) => s.slug === it.slug);
    const g = GARMENTS.find((x) => x.id === it.color);
    const size = SIZES.includes(it.size as Size) ? (it.size as string) : null;
    const qty = Math.floor(Number(it.qty));

    if (!saint) { errors.push(`Unknown design: ${String(it.slug)}`); continue; }
    if (!g) { errors.push(`Unknown colour: ${String(it.color)}`); continue; }
    if (!size) { errors.push(`Unknown size: ${String(it.size)}`); continue; }
    if (!Number.isFinite(qty) || qty < 1 || qty > MAX_QTY) { errors.push(`Bad quantity for ${saint.name}`); continue; }

    const existing = lines.find((l) => l.slug === saint.slug && l.color === g.id && l.size === size);
    if (existing) {
      existing.qty = Math.min(MAX_QTY, existing.qty + qty);
      existing.lineCents = existing.unitCents * existing.qty;
      continue;
    }
    lines.push({
      slug: saint.slug, color: g.id, size, qty,
      name: saint.name, epithet: saint.epithet, colorLabel: g.label, tone: g.tone,
      unitCents: PRICE_CENTS, lineCents: PRICE_CENTS * qty,
    });
  }
  return { lines, subtotalCents: lines.reduce((a, l) => a + l.lineCents, 0), errors };
}

/**
 * Stripe metadata values cap at 500 characters, so the cart travels to the
 * webhook as compact indices rather than JSON.
 */
export function encodeCart(lines: PricedLine[]): string {
  return lines
    .map((l) => [
      SAINTS.findIndex((s) => s.slug === l.slug),
      GARMENTS.findIndex((g) => g.id === l.color),
      SIZES.indexOf(l.size as Size),
      l.qty,
    ].join("."))
    .join(",");
}

export function decodeCart(encoded: string): LineInput[] {
  return encoded
    .split(",")
    .filter(Boolean)
    .map((chunk) => {
      const [si, gi, zi, q] = chunk.split(".").map(Number);
      return {
        slug: SAINTS[si]?.slug ?? "",
        color: GARMENTS[gi]?.id ?? "",
        size: SIZES[zi] ?? "",
        qty: q,
      };
    })
    .filter((l) => l.slug && l.color && l.size);
}
