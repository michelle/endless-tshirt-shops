export type ShirtStyle = 'fitted' | 'unisex';
export type ShirtSize = 'S' | 'M' | 'L' | 'XL';

export const PRICE_CENTS = 2250;
export const LIST_PRICE_CENTS = 3000;

export const STYLE_LABELS: Record<ShirtStyle, string> = {
  fitted: 'Fitted',
  unisex: 'Unisex',
};

export const STYLE_DESCRIPTIONS: Record<ShirtStyle, string> = {
  fitted: 'Bella + Canvas Ladies Favorite Tee',
  unisex: 'Next Level Unisex Fitted Crew',
};

// Scalable Press product ids, keyed by shirt style.
export const SCALABLE_PRESS_PRODUCTS: Record<ShirtStyle, string> = {
  fitted: 'bella-ladies-favorite-t-shirt',
  unisex: 'next-level-fitted-crew',
};

// Scalable Press size codes, keyed by our display size.
export const SCALABLE_PRESS_SIZES: Record<ShirtSize, string> = {
  S: 'sml',
  M: 'med',
  L: 'lrg',
  XL: 'xlg',
};

export const SIZES: ShirtSize[] = ['S', 'M', 'L', 'XL'];
export const STYLES: ShirtStyle[] = ['fitted', 'unisex'];
