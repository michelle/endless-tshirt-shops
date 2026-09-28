// Stripe Checkout helpers + the small structural answer for this app:
// we send the live customization to Stripe via `payment_intent_data.metadata`,
// and recover it server-side from the webhook. We also keep a base64 token
// inside `metadata.design_token` so design details can be looked up even if
// a re-delivery of the webhook arrives days later.

import Stripe from "stripe";

export const STRIPE_API_VERSION = "2025-02-24.acacia" as const;

let _stripe: Stripe | null = null;
export function stripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  _stripe = new Stripe(key, { apiVersion: STRIPE_API_VERSION });
  return _stripe;
}

export function stripeReady() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

/** Stripe price in cents. Computed at module-load so the client never sees server cost details. */
export const SHIRT_PRICE_CENTS = 3895; // $38.95 — covers materials, print, and modest margin. Excludes shipping which Stripe collects.

export interface CheckoutItemsInput {
  customization: import("./render").Customization;
  designToken: string;
  successUrl: string;
  cancelUrl: string;
}

export async function createCheckoutSession(input: CheckoutItemsInput) {
  const stripeMetadata: Record<string, string> = {
    design_token: input.designToken,
    phrase: input.customization.phrase.slice(0, 28),
    phrase2: input.customization.phrase2.slice(0, 28),
    place: input.customization.place.slice(0, 32),
    isoDate: input.customization.date,
    lat: String(input.customization.lat),
    lon: String(input.customization.lon),
    color: input.customization.color,
    size: input.customization.size,
  };

  const s = stripe();
  return s.checkout.sessions.create({
    mode: "payment",
    success_url: input.successUrl + "?session_id={CHECKOUT_SESSION_ID}",
    cancel_url: input.cancelUrl,
    shipping_address_collection: {
      // Prodigi fulfils internationally; give the customer the choice.
      allowed_countries: [
        "US", "CA", "GB", "IE", "FR", "DE", "ES", "IT", "NL", "BE",
        "DK", "SE", "NO", "FI", "PT", "AT", "CH", "AU", "NZ", "JP",
        "SG", "HK", "MX",
      ],
    },
    // No shipping_options: Stripe defaults to free shipping. We pass recipientCost via Prodigi
    // and absorb shipping into our list price to keep checkout frictionless.
    payment_intent_data: {
      metadata: stripeMetadata,
    },
    metadata: stripeMetadata,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: SHIRT_PRICE_CENTS,
          product_data: {
            name: `GNOMON — ${input.customization.phrase}`,
            description: [
              `Personalized sundial for ${input.customization.place} at ${input.customization.date.replace("T", " ").slice(0, 16)} UTC`,
              `Bella+Canvas 3001, ${input.customization.color}, size ${input.customization.size}`,
            ].join(" \u00b7 "),
          },
        },
      },
    ],
    allow_promotion_codes: true,
  });
}
