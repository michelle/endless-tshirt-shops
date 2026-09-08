import type Stripe from "stripe";
import { CURRENCY } from "./design";

/** Countries we offer at checkout (all served by the Prodigi GLOBAL-TEE range). */
export const ALLOWED_COUNTRIES: Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[] = [
  "US", "CA", "GB", "IE", "AU", "NZ", "DE", "FR", "ES", "PT", "IT", "NL", "BE", "AT", "CH", "DK", "SE", "NO", "FI",
  "PL", "CZ", "SK", "SI", "HR", "HU", "RO", "GR", "LT", "LV", "EE", "LU", "MT", "CY", "IS", "JP", "SG", "HK", "KR",
  "MX", "BR", "ZA", "AE", "IL", "TR", "IN", "PH", "MY", "TH", "ID", "CL", "AR", "CO", "PE",
];

/** Flat-rate shipping choices shown in Stripe Checkout, mapped to Prodigi shipping methods via metadata. */
export const SHIPPING_OPTIONS: Stripe.Checkout.SessionCreateParams.ShippingOption[] = [
  {
    shipping_rate_data: {
      type: "fixed_amount",
      display_name: "Standard tracked",
      fixed_amount: { amount: 595, currency: CURRENCY },
      delivery_estimate: { minimum: { unit: "business_day", value: 5 }, maximum: { unit: "business_day", value: 12 } },
      metadata: { prodigi_method: "Standard" },
    },
  },
  {
    shipping_rate_data: {
      type: "fixed_amount",
      display_name: "Express",
      fixed_amount: { amount: 1495, currency: CURRENCY },
      delivery_estimate: { minimum: { unit: "business_day", value: 2 }, maximum: { unit: "business_day", value: 6 } },
      metadata: { prodigi_method: "Express" },
    },
  },
];
