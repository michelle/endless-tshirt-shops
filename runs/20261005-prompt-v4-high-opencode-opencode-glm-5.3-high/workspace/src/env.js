import { readFileSync } from "node:fs";

export function mustLoadEnv() {
  const missing = [];
  if (!process.env.PRODIGI_API_KEY) missing.push("PRODIGI_API_KEY");
  if (missing.length) {
    console.error(`Missing required env: ${missing.join(", ")}`);
    process.exit(1);
  }
}

export const PRODIGI_KEY = process.env.PRODIGI_API_KEY;

export const PORT = Number(process.env.PORT) || 8787;

// Base URL for print files Prodigi downloads. Derived per-request from the
// Host header when behind the tunnel; override with BASE_URL if needed.
export const BASE_URL_OVERRIDE = process.env.BASE_URL || null;

// Store config — single hero product (Gildan 64000 via Prodigi).
export const STORE = {
  name: "Starloom",
  tagline: "The night sky above your moment — printed on a heavyweight tee.",
  product: {
    sku: "GLOBAL-TEE-GIL-64000",
    description: "Gildan Softstyle 64000 — 100% ringspun cotton, direct-to-garment printed",
    printArea: { w: 4677, h: 5881, dpi: 300 },
    // offered colors (Prodigi attribute values) with display metadata
    colors: [
      { id: "black", label: "Black", swatch: "#17181a", dark: true },
      { id: "navy blue", label: "Navy", swatch: "#1e2a45", dark: true },
      { id: "white", label: "White", swatch: "#f3f1ea", dark: false },
    ],
    sizes: ["s", "m", "l", "xl", "2xl", "3xl"],
  },
  retail: {
    currency: "USD",
    item: 42.0,
    shipping: 7.0,
  },
};

// Payment driver: real Stripe Checkout when keys exist, otherwise the
// built-in sandbox test-checkout (clearly badged, zero real charges).
export const PAYMENT_DRIVER = process.env.STRIPE_SECRET_KEY ? "stripe" : "mock";
