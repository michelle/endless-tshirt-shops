// Core brand + product data for Night Shift Cryptids.
// Every shirt design is generated as an SVG badge from the data below, then
// rasterized (see scripts/generate-art.mjs) into PNGs used both as on-site
// preview art and as the print-ready asset sent to the Prodigi Print API.

export type ShirtColor = {
  key: "black" | "white" | "navy blue";
  label: string;
  hex: string;
  // Attribute value expected by the Prodigi product GLOBAL-TEE-GIL-64000
  prodigiAttribute: string;
};

export const SHIRT_COLORS: ShirtColor[] = [
  { key: "black", label: "Black", hex: "#111114", prodigiAttribute: "black" },
  { key: "white", label: "White", hex: "#f5f4f0", prodigiAttribute: "white" },
  { key: "navy blue", label: "Navy", hex: "#1b2436", prodigiAttribute: "navy blue" },
];

export type ShirtSize = "s" | "m" | "l" | "xl" | "2xl";
export const SHIRT_SIZES: { key: ShirtSize; label: string }[] = [
  { key: "s", label: "S" },
  { key: "m", label: "M" },
  { key: "l", label: "L" },
  { key: "xl", label: "XL" },
  { key: "2xl", label: "2XL" },
];

// Prodigi product SKU for the Gildan 64000 Unisex Softstyle Tee (verified
// against the Prodigi sandbox /v4.0/products endpoint).
export const PRODIGI_SKU = "GLOBAL-TEE-GIL-64000";

export type Design = {
  slug: string;
  name: string;
  jobTitle: string;
  blurb: string;
  price: number; // USD
  ink: string; // patch background disc
  accent: string; // creature + primary text color
  glow: string; // secondary accent (eyes / highlight)
  icon: "coffee" | "flashlight" | "wifi" | "headphones" | "box" | "pulse";
};

export const DESIGNS: Design[] = [
  {
    slug: "bigfoot-graveyard-barista",
    name: "Bigfoot",
    jobTitle: "Graveyard Shift Barista",
    blurb:
      "Eight feet tall, allergic to sunlight, and the only one who can work the espresso machine at 3am without complaint.",
    price: 32,
    ink: "#1b1b1f",
    accent: "#f2a93b",
    glow: "#ffd88a",
    icon: "coffee",
  },
  {
    slug: "mothman-night-security",
    name: "Mothman",
    jobTitle: "Night Security",
    blurb:
      "Point Pleasant's finest. Patrols the parking structure so you don't have to. Eyes glow so the flashlight is mostly for show.",
    price: 32,
    ink: "#101014",
    accent: "#b6ff3c",
    glow: "#ff3b3b",
    icon: "flashlight",
  },
  {
    slug: "nessie-it-support",
    name: "Nessie",
    jobTitle: "24-Hr IT Support",
    blurb:
      "Lives in the server room. Nobody has actually seen her fix the router, but the wifi always comes back on.",
    price: 32,
    ink: "#0b1b2b",
    accent: "#33d2c0",
    glow: "#9df3ea",
    icon: "wifi",
  },
  {
    slug: "chupacabra-late-night-dj",
    name: "Chupacabra",
    jobTitle: "Late Night DJ",
    blurb:
      "Drains the energy out of a crowd until 4am, then disappears before the lights come up. Requests are ignored.",
    price: 32,
    ink: "#160a1e",
    accent: "#c93bff",
    glow: "#f2b8ff",
    icon: "headphones",
  },
  {
    slug: "yeti-overnight-stock",
    name: "Yeti",
    jobTitle: "Overnight Stock Crew",
    blurb:
      "Came down from the mountain for the health benefits. Can carry six boxes at once. Aisle 7 fears him.",
    price: 32,
    ink: "#0a1420",
    accent: "#8fe3ff",
    glow: "#e4f9ff",
    icon: "box",
  },
  {
    slug: "jackalope-night-nurse",
    name: "Jackalope",
    jobTitle: "Night Shift Nurse",
    blurb:
      "Antlers make the hats complicated, but nobody in the ward sleeps better than the patients on her rotation.",
    price: 32,
    ink: "#241222",
    accent: "#ff6f91",
    glow: "#ffd0dc",
    icon: "pulse",
  },
];

export function getDesign(slug: string): Design | undefined {
  return DESIGNS.find((d) => d.slug === slug);
}
