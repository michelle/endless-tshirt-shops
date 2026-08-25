/**
 * The whole catalogue. One product, two cuts, five sizes.
 *
 * Prices are in the smallest currency unit and only ever come from here — the
 * client sends a style/size, never an amount.
 */

export const CURRENCY = 'usd';
export const PRICE_CENTS = 2250;
export const LIST_PRICE_CENTS = 3000;
export const SHIPPING_CENTS = 0;

export const STYLE_IDS = ['fitted', 'unisex'] as const;
export type StyleId = (typeof STYLE_IDS)[number];

export const SIZE_IDS = ['S', 'M', 'L', 'XL', '2XL'] as const;
export type SizeId = (typeof SIZE_IDS)[number];

type Style = {
  label: string;
  /** Prodigi catalogue SKU. */
  sku: string;
  garment: string;
  sizes: readonly SizeId[];
};

export const STYLES: Record<StyleId, Style> = {
  fitted: {
    label: 'Fitted',
    sku: 'GLOBAL-TEE-BC-6004',
    garment: "Bella + Canvas 6004 women's favourite tee",
    sizes: ['S', 'M', 'L', 'XL', '2XL'],
  },
  unisex: {
    label: 'Unisex',
    sku: 'GLOBAL-TEE-BC-3001',
    garment: 'Bella + Canvas 3001 unisex classic tee',
    sizes: ['S', 'M', 'L', 'XL', '2XL'],
  },
};

/** Prodigi wants lowercase size attributes. */
export const PRODIGI_SIZE: Record<SizeId, string> = {
  S: 's',
  M: 'm',
  L: 'l',
  XL: 'xl',
  '2XL': '2xl',
};

export const GARMENT_COLOR = 'black';
export const PRODIGI_PRINT_AREA = 'front';
export const PRODIGI_SHIPPING_METHOD = 'Standard';

/**
 * Prodigi prints locally in a lot of places, but every extra country is a
 * support surface. This is the list we quote, collect and ship to.
 */
export const ALLOWED_COUNTRIES = [
  'US', 'CA', 'GB', 'IE', 'AU', 'NZ', 'DE', 'FR', 'ES', 'IT',
  'NL', 'BE', 'AT', 'CH', 'SE', 'DK', 'NO', 'FI', 'PT', 'PL',
] as const;

export function isStyleId(value: unknown): value is StyleId {
  return typeof value === 'string' && (STYLE_IDS as readonly string[]).includes(value);
}

export function isSizeId(value: unknown): value is SizeId {
  return typeof value === 'string' && (SIZE_IDS as readonly string[]).includes(value);
}

export function formatMoney(cents: number, currency = CURRENCY): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}
