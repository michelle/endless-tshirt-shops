import { describe, expect, it } from 'vitest';
import {
  LIST_PRICE_CENTS,
  PRICE_CENTS,
  PRINT_WIDTH_PX,
  SHIRT_SIZES,
  SP_SIZE_CODES,
  STYLE_SPECS,
  SHIRT_STYLES,
  formatUsd,
  isShirtSize,
  isShirtStyle,
} from '@/lib/catalog';

describe('catalog', () => {
  it('maps every offered size to a Scalable Press size code', () => {
    for (const size of SHIRT_SIZES) {
      expect(SP_SIZE_CODES[size]).toMatch(/^[a-z]+$/);
    }
    expect(Object.keys(SP_SIZE_CODES)).toHaveLength(SHIRT_SIZES.length);
  });

  it('maps every style to a distinct Scalable Press product', () => {
    const productIds = SHIRT_STYLES.map((s) => STYLE_SPECS[s].productId);
    expect(new Set(productIds).size).toBe(productIds.length);
    for (const id of productIds) expect(id).toMatch(/^[a-z0-9-]+$/);
  });

  it('prints on black, which is what the white artwork assumes', () => {
    for (const style of SHIRT_STYLES) expect(STYLE_SPECS[style].color).toBe('Black');
  });

  it('is actually a discount', () => {
    expect(PRICE_CENTS).toBeLessThan(LIST_PRICE_CENTS);
  });

  it('renders artwork at 300dpi across an 8 inch chest', () => {
    expect(PRINT_WIDTH_PX).toBe(2400);
  });

  it('formats prices as USD', () => {
    expect(formatUsd(2250)).toBe('$22.50');
    expect(formatUsd(3000)).toBe('$30.00');
    expect(formatUsd(0)).toBe('$0.00');
  });

  it('guards style and size at the boundary', () => {
    expect(isShirtStyle('fitted')).toBe(true);
    expect(isShirtStyle('FITTED')).toBe(false);
    expect(isShirtStyle(undefined)).toBe(false);
    expect(isShirtSize('3XL')).toBe(true);
    expect(isShirtSize('4XL')).toBe(false);
  });
});
