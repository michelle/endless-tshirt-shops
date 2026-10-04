/** Shipping is passed through at Prodigi's quoted cost, rounded up to the next $0.50. */
export function shippingChargeCents(costCents: number) {
  return Math.ceil(costCents / 50) * 50;
}
