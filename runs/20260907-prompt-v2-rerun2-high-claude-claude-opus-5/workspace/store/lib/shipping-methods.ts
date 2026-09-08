export type ShippingMethodId = "Budget" | "Standard" | "Express";

export const SHIPPING_METHODS: { id: ShippingMethodId; label: string; note: string }[] = [
  { id: "Budget", label: "Budget", note: "Tracked where available · slowest, cheapest" },
  { id: "Standard", label: "Standard", note: "Tracked · the usual choice" },
  { id: "Express", label: "Express", note: "Fastest available to your address" },
];
