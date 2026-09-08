// We deliberately don't run a database: the Stripe PaymentIntent *is* the
// order record. All the design + shipping inputs live in its metadata
// (written when the PaymentIntent is created, before payment), and the
// webhook flips `fulfillment_status` once the shirt has been sent to
// Prodigi. This keeps the whole app stateless and means the order can never
// exist without a corresponding payment.

import type Stripe from "stripe";
import type { ColorKey, SizeKey, StyleKey } from "./catalog";

export type FulfillmentStatus = "pending" | "processing" | "submitted" | "failed";

export type OrderRecord = {
  style: StyleKey;
  color: ColorKey;
  size: SizeKey;
  skyDateISO: string;
  skyLat: number;
  skyLon: number;
  skyLocation: string;
  skyCaption: string;
  shipName: string;
  shipEmail: string;
  shipPhone: string;
  shipLine1: string;
  shipLine2: string;
  shipCity: string;
  shipState: string;
  shipPostal: string;
  shipCountry: string;
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  fulfillmentStatus: FulfillmentStatus;
  prodigiOrderId: string;
  fulfillmentError: string;
};

// Stripe metadata values are capped at 500 chars and keys at 40 chars, max
// 50 keys -- everything here comfortably fits in a handful of short fields.
export function buildMetadata(o: Omit<OrderRecord, "fulfillmentStatus" | "prodigiOrderId" | "fulfillmentError">): Record<string, string> {
  return {
    style: o.style,
    color: o.color,
    size: o.size,
    sky_date: o.skyDateISO,
    sky_lat: String(o.skyLat),
    sky_lon: String(o.skyLon),
    sky_location: o.skyLocation.slice(0, 200),
    sky_caption: o.skyCaption.slice(0, 60),
    ship_name: o.shipName.slice(0, 200),
    ship_email: o.shipEmail.slice(0, 200),
    ship_phone: o.shipPhone.slice(0, 40),
    ship_line1: o.shipLine1.slice(0, 200),
    ship_line2: o.shipLine2.slice(0, 200),
    ship_city: o.shipCity.slice(0, 100),
    ship_state: o.shipState.slice(0, 100),
    ship_postal: o.shipPostal.slice(0, 30),
    ship_country: o.shipCountry.slice(0, 2),
    subtotal_cents: String(o.subtotalCents),
    shipping_cents: String(o.shippingCents),
    total_cents: String(o.totalCents),
    fulfillment_status: "pending",
  };
}

export function parseMetadata(metadata: Stripe.Metadata): OrderRecord | null {
  if (!metadata.style || !metadata.sky_date) return null;
  return {
    style: metadata.style as StyleKey,
    color: metadata.color as ColorKey,
    size: metadata.size as SizeKey,
    skyDateISO: metadata.sky_date,
    skyLat: Number(metadata.sky_lat),
    skyLon: Number(metadata.sky_lon),
    skyLocation: metadata.sky_location ?? "",
    skyCaption: metadata.sky_caption ?? "",
    shipName: metadata.ship_name ?? "",
    shipEmail: metadata.ship_email ?? "",
    shipPhone: metadata.ship_phone ?? "",
    shipLine1: metadata.ship_line1 ?? "",
    shipLine2: metadata.ship_line2 ?? "",
    shipCity: metadata.ship_city ?? "",
    shipState: metadata.ship_state ?? "",
    shipPostal: metadata.ship_postal ?? "",
    shipCountry: metadata.ship_country ?? "",
    subtotalCents: Number(metadata.subtotal_cents ?? 0),
    shippingCents: Number(metadata.shipping_cents ?? 0),
    totalCents: Number(metadata.total_cents ?? 0),
    fulfillmentStatus: (metadata.fulfillment_status as FulfillmentStatus) ?? "pending",
    prodigiOrderId: metadata.prodigi_order_id ?? "",
    fulfillmentError: metadata.fulfillment_error ?? "",
  };
}

// Prodigi rejects optional string fields sent as "" (it wants them omitted
// or null). Stripe metadata can't store `null`, so blanks come back as "".
export function blankToNull(s: string | undefined | null): string | null {
  if (s === undefined || s === null) return null;
  const trimmed = s.trim();
  return trimmed.length === 0 ? null : trimmed;
}
