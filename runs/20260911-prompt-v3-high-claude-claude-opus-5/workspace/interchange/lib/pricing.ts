import { Spec } from "./spec";

export const CURRENCY = "usd";
export const BASE_CENTS = 3900;
export const BACK_PRINT_CENTS = 900;

export type ShippingOptionId = "standard" | "express";

export const SHIPPING: Record<ShippingOptionId, {
  id: ShippingOptionId;
  label: string;
  detail: string;
  cents: number;
  prodigiMethod: "Standard" | "Express";
}> = {
  standard: {
    id: "standard",
    label: "Standard",
    detail: "Printed in 2-4 days, then 4-7 days in transit",
    cents: 695,
    prodigiMethod: "Standard",
  },
  express: {
    id: "express",
    label: "Express",
    detail: "Printed in 2-4 days, then 1-3 days in transit",
    cents: 1695,
    prodigiMethod: "Express",
  },
};

export function unitCents(spec: Spec): number {
  return BASE_CENTS + (spec.backPrint ? BACK_PRINT_CENTS : 0);
}

export function totals(spec: Spec, qty: number, shipping: ShippingOptionId) {
  const q = Math.max(1, Math.min(10, Math.floor(qty) || 1));
  const sub = unitCents(spec) * q;
  const ship = SHIPPING[shipping].cents;
  return { qty: q, unit: unitCents(spec), subtotal: sub, shipping: ship, total: sub + ship };
}

export const money = (cents: number) =>
  (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
