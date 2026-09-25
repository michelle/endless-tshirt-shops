// Retail pricing for SKYWRITER.

export const SHIRT_PRICE_CENTS = 3499; // $34.99
export const SHIPPING_CENTS = 495; // $4.95 flat
export const FREE_SHIPPING_OVER_CENTS = 7500; // free shipping on orders $75+

export function priceOrder(items) {
  // items: [{qty}] — single product, so unit price is constant
  const units = items.reduce((n, i) => n + (i.qty || 1), 0);
  const subtotal = units * SHIRT_PRICE_CENTS;
  const shipping = subtotal >= FREE_SHIPPING_OVER_CENTS ? 0 : SHIPPING_CENTS;
  return {
    units,
    subtotalCents: subtotal,
    shippingCents: shipping,
    totalCents: subtotal + shipping,
  };
}

export function usd(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}
