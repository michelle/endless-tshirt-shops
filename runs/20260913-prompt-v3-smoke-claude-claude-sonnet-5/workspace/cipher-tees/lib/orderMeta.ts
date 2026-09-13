import { getSiteUrl } from "./site";
import type { CartItem, PaletteId, ShirtColorId, SizeId } from "./types";

// Stripe is the system of record for this store: instead of standing up a
// database, each order's design specs are packed into Checkout Session /
// PaymentIntent metadata (well under Stripe's 500-char-per-value limit),
// and the fulfillment status is written back onto the PaymentIntent after
// the webhook creates the Prodigi order.

export interface OrderItemMeta {
  phrase: string;
  palette: PaletteId;
  shirt: ShirtColorId;
  size: SizeId;
  qty: number;
}

export function encodeItemsToMetadata(items: CartItem[]): Record<string, string> {
  const meta: Record<string, string> = { item_count: String(items.length) };
  items.forEach((item, i) => {
    const packed: OrderItemMeta = {
      phrase: item.spec.phrase,
      palette: item.spec.paletteId,
      shirt: item.spec.shirtColorId,
      size: item.size,
      qty: item.qty,
    };
    meta[`item_${i}`] = JSON.stringify(packed);
  });
  return meta;
}

export function decodeItemsFromMetadata(
  metadata: Record<string, string> | null | undefined
): OrderItemMeta[] {
  if (!metadata) return [];
  const count = parseInt(metadata.item_count ?? "0", 10) || 0;
  const items: OrderItemMeta[] = [];
  for (let i = 0; i < count; i++) {
    const raw = metadata[`item_${i}`];
    if (!raw) continue;
    try {
      items.push(JSON.parse(raw) as OrderItemMeta);
    } catch {
      // skip malformed entry rather than fail the whole order
    }
  }
  return items;
}

export function artUrlForItem(siteUrl: string, item: OrderItemMeta): string {
  const params = new URLSearchParams({
    phrase: item.phrase,
    palette: item.palette,
    shirt: item.shirt,
  });
  return `${siteUrl}/api/art?${params.toString()}`;
}

export function artUrlForItemDefault(item: OrderItemMeta): string {
  return artUrlForItem(getSiteUrl(), item);
}

export interface OrderStatusResponse {
  paid: boolean;
  email: string | null;
  amountTotal: number | null;
  currency: string | null;
  shippingAddress: {
    line1?: string | null;
    city?: string | null;
    country?: string | null;
  } | null;
  shippingName: string | null;
  items: (OrderItemMeta & { previewUrl: string })[];
  prodigiOrderId: string | null;
  prodigiStatus: string | null;
  shipments: {
    carrier?: string;
    service?: string;
    trackingNumber?: string;
    trackingUrl?: string;
  }[];
  fulfillmentError: string | null;
}
