import type Stripe from "stripe";

// A broad-but-explicit allowlist of countries Prodigi can print & ship a
// DTG tee to, restricted to the set Stripe Checkout's address collector
// supports. Stripe requires an explicit list (no "all countries" wildcard).
export const ALLOWED_SHIPPING_COUNTRIES: Stripe.Checkout.SessionCreateParams.ShippingAddressCollection["allowed_countries"] =
  [
    "US",
    "CA",
    "GB",
    "IE",
    "AU",
    "NZ",
    "DE",
    "FR",
    "ES",
    "IT",
    "NL",
    "BE",
    "AT",
    "CH",
    "SE",
    "NO",
    "DK",
    "FI",
    "PT",
    "PL",
    "CZ",
    "GR",
    "HU",
    "RO",
    "JP",
    "SG",
    "HK",
    "KR",
    "MX",
    "BR",
    "IN",
    "AE",
    "ZA",
  ];
