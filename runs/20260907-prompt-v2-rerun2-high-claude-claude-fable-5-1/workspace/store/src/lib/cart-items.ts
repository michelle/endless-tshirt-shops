import { getColor, getProduct, getSize, PRICE_CENTS, type SizeId } from "./catalog";

export type CartItem = { slug: string; color: string; size: SizeId; qty: number };

export const MAX_QTY = 10;
export const MAX_LINES = 20;

/** Compact encoding for Stripe metadata (500 char limit per value): slug:color:size:qty|... */
export function encodeItems(items: CartItem[]): string {
  return items.map((i) => [i.slug, i.color, i.size, i.qty].join(":")).join("|");
}

export function decodeItems(s: string): CartItem[] {
  if (!s) return [];
  return s.split("|").map((part) => {
    const [slug, color, size, qty] = part.split(":");
    return { slug, color, size: size as SizeId, qty: Number(qty) };
  });
}

/** Validates against the catalog and returns normalised items, or throws. */
export function validateItems(raw: unknown): CartItem[] {
  if (!Array.isArray(raw) || raw.length === 0) throw new Error("Cart is empty");
  if (raw.length > MAX_LINES) throw new Error("Too many lines in cart");
  const out: CartItem[] = [];
  for (const r of raw) {
    const item = r as Partial<CartItem>;
    const product = getProduct(String(item.slug));
    const color = getColor(String(item.color));
    const size = getSize(String(item.size));
    const qty = Math.floor(Number(item.qty));
    if (!product) throw new Error(`Unknown product: ${item.slug}`);
    if (!color || !product.colors.includes(color.id)) throw new Error(`Colour not available for ${product.bureau}`);
    if (!size) throw new Error(`Unknown size: ${item.size}`);
    if (!Number.isFinite(qty) || qty < 1 || qty > MAX_QTY) throw new Error("Quantity must be between 1 and 10");
    const existing = out.find((o) => o.slug === product.slug && o.color === color.id && o.size === size.id);
    if (existing) existing.qty = Math.min(MAX_QTY, existing.qty + qty);
    else out.push({ slug: product.slug, color: color.id, size: size.id, qty });
  }
  return out;
}

export function subtotalCents(items: CartItem[]) {
  return items.reduce((sum, i) => sum + i.qty * PRICE_CENTS, 0);
}
