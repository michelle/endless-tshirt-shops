import { packDesign, unpackDesign, parseCartItem, type CartItem } from "./design";
import { SIZES, type Size } from "./catalog";

/** Cart items are stored in Stripe Checkout Session metadata, so Stripe is the system of record. */
export function itemsToMetadata(items: CartItem[]): Record<string, string> {
  const m: Record<string, string> = { n: String(items.length) };
  items.forEach((it, i) => {
    const packed = packDesign(it.design);
    if (packed.length > 480) throw new Error("Design too large for metadata");
    m[`i${i}`] = packed;
    m[`q${i}`] = `${it.size}:${it.qty}`;
  });
  return m;
}

export function itemsFromMetadata(m: Record<string, string> | null | undefined): CartItem[] | null {
  const n = Number(m?.n);
  if (!m || !(n >= 1 && n <= 20)) return null;
  const items: CartItem[] = [];
  for (let i = 0; i < n; i++) {
    const design = unpackDesign(m[`i${i}`] ?? "");
    const [size, qty] = (m[`q${i}`] ?? "").split(":");
    if (!design) return null;
    const item = parseCartItem({ design, size: (SIZES as readonly string[]).includes(size) ? (size as Size) : "", qty: Number(qty) });
    if (!item) return null;
    items.push(item);
  }
  return items;
}
