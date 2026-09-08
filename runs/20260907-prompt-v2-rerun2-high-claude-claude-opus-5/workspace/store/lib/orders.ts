import "server-only";
import { randomUUID, createHash } from "node:crypto";
import { SKU, GARMENTS, printUrl } from "./catalog";
import { createOrder, type OrderItem, type Recipient, type ShippingMethod } from "./prodigi";
import type { PricedLine } from "./cart";

export type Address = {
  name: string; email: string; phone?: string;
  line1: string; line2?: string; city: string; state?: string; postcode: string; country: string;
};

export function validateAddress(input: unknown): { address: Address } | { error: string } {
  const a = (input ?? {}) as Record<string, unknown>;
  const str = (k: string) => String(a[k] ?? "").trim();
  const name = str("name"), email = str("email"), line1 = str("line1");
  const city = str("city"), postcode = str("postcode");
  const country = str("country").toUpperCase();

  if (name.length < 2) return { error: "Enter the recipient's full name" };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email)) return { error: "Enter a valid email address" };
  if (line1.length < 3) return { error: "Enter a street address" };
  if (city.length < 2) return { error: "Enter a town or city" };
  if (postcode.length < 3) return { error: "Enter a postal or ZIP code" };
  if (!/^[A-Z]{2}$/.test(country)) return { error: "Choose a destination country" };
  if (country === "US" && !str("state")) return { error: "Enter a US state (two letters, e.g. CA)" };

  return {
    address: {
      name, email, phone: str("phone") || undefined,
      line1, line2: str("line2") || undefined,
      city, state: str("state") || undefined, postcode, country,
    },
  };
}

export const toRecipient = (a: Address): Recipient => ({
  name: a.name,
  email: a.email,
  phoneNumber: a.phone,
  address: {
    line1: a.line1,
    line2: a.line2,
    townOrCity: a.city,
    stateOrCounty: a.state,
    postalOrZipCode: a.postcode,
    countryCode: a.country,
  },
});

export function toOrderItems(lines: PricedLine[], origin: string): OrderItem[] {
  return lines.map((l) => {
    const tone = GARMENTS.find((g) => g.id === l.color)?.tone ?? "dark";
    return {
      merchantReference: `${l.slug}|${l.color}|${l.size}`,
      sku: SKU,
      copies: l.qty,
      sizing: "fitPrintArea" as const,
      attributes: { color: l.color, size: l.size },
      assets: [{ printArea: "front", url: printUrl(origin, l.slug, tone) }],
    };
  });
}

/** Stable key so a retry (or a replayed webhook) never prints the same order twice. */
export function idempotencyKeyFor(seed: string) {
  return createHash("sha256").update(seed).digest("hex").slice(0, 32);
}

export const newReference = () => `OSD-${new Date().toISOString().slice(0, 10)}-${randomUUID().slice(0, 8).toUpperCase()}`;

export async function placeProdigiOrder(args: {
  lines: PricedLine[];
  address: Address;
  shippingMethod: ShippingMethod;
  origin: string;
  reference: string;
  idempotencySeed: string;
}) {
  return createOrder({
    merchantReference: args.reference,
    shippingMethod: args.shippingMethod,
    recipient: toRecipient(args.address),
    items: toOrderItems(args.lines, args.origin),
    idempotencyKey: idempotencyKeyFor(args.idempotencySeed),
  });
}
