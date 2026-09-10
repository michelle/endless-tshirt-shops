import { getQuotes, type ShippingMethod } from './prodigi';
import type { Design } from './design';
import { unitPriceCents } from './design';

export type ShippingOption = {
  method: ShippingMethod;
  label: string;
  note: string;
  amountCents: number;
};

const LABELS: Record<string, { label: string; note: string }> = {
  Budget: { label: 'Standard', note: 'Pressed in 2–4 working days, then 5–8 days in transit' },
  Standard: { label: 'Standard', note: 'Pressed in 2–4 working days, then 4–7 days in transit' },
  Express: { label: 'Express', note: 'Pressed in 1–2 working days, then 2–4 days in transit' },
  Overnight: { label: 'Overnight', note: 'Pressed and dispatched next working day' },
};

/** Flat rates used only if Prodigi cannot be reached at quote time. */
const FALLBACK: ShippingOption[] = [
  { method: 'Budget', label: 'Standard', note: LABELS.Budget.note, amountCents: 695 },
  { method: 'Express', label: 'Express', note: LABELS.Express.note, amountCents: 1695 },
];

/**
 * Retail delivery prices. Prodigi's live cost is passed through, rounded up to
 * the nearest dollar to absorb currency drift.
 */
export async function shippingOptionsFor(
  design: Design,
  countryCode: string,
): Promise<{ options: ShippingOption[]; live: boolean }> {
  try {
    const quotes = await getQuotes(countryCode, design.sz, design.col, design.q);
    const options = quotes
      .map((q) => ({
        method: q.method,
        label: LABELS[q.method]?.label ?? q.method,
        note: LABELS[q.method]?.note ?? '',
        amountCents: Math.max(0, Math.ceil(q.shippingCents / 100) * 100),
      }))
      .filter((o, i, arr) => arr.findIndex((x) => x.method === o.method) === i);
    if (options.length) return { options, live: true };
  } catch (err) {
    console.error('shipping quote failed', err);
  }
  return { options: FALLBACK, live: false };
}

export function orderTotals(design: Design, shipping: ShippingOption) {
  const unit = unitPriceCents(design);
  const subtotal = unit * design.q;
  return {
    unitCents: unit,
    subtotalCents: subtotal,
    shippingCents: shipping.amountCents,
    totalCents: subtotal + shipping.amountCents,
  };
}
