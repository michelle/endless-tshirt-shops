// The product catalog. Prices are in USD cents and are the single source of truth
// (the server re-prices every cart from this file; it never trusts client totals).

export type Design = {
  slug: string;
  name: string;
  tagline: string;
  est: number;
  accent: string;
  ink: string;
  paper: string;
  blurb: string;
  story: string;
};

export const STORE_NAME = "Deprecated Parks";
export const STORE_TAGLINE = "Vintage travel posters for the technology we left behind.";

export const designs: Design[] = [
  {
    slug: "dial-up-canyon",
    name: "Dial-Up Canyon",
    tagline: "Connecting at 56 kbps of natural wonder",
    est: 1996,
    accent: "#c94a3a",
    ink: "#3b1d2e",
    paper: "#f4e7c9",
    blurb: "Sunset over the canyon, a telephone line, and the sound of a handshake echoing off the walls.",
    story:
      "Visitors are reminded that the canyon can only be entered by one member of the household at a time. Picking up the phone in the visitor center will disconnect everyone.",
  },
  {
    slug: "floppy-disk-falls",
    name: "Floppy Disk Falls",
    tagline: "1.44 MB of untouched wilderness",
    est: 1987,
    accent: "#c94a3a",
    ink: "#1e2d3a",
    paper: "#f1ecdc",
    blurb: "A waterfall pours from the shutter of a 3.5-inch cliff into a pool of pristine, write-protected water.",
    story:
      "The falls were once the primary way to move anything from one side of the valley to the other. Rangers still recommend bringing a second one, just in case.",
  },
  {
    slug: "crt-ridge",
    name: "CRT Ridge",
    tagline: "Refresh rate 60 Hz · Degauss daily",
    est: 1981,
    accent: "#b6559a",
    ink: "#1f0c3a",
    paper: "#efe6f2",
    blurb: "A purple mountain range under scanlined skies, with a pixel-perfect foreground ridge.",
    story:
      "The ridge glows faintly for a few seconds after sunset. Please do not press your face against the glass, and give the park a moment to warm up in the morning.",
  },
  {
    slug: "fax-machine-forest",
    name: "Fax Machine Forest",
    tagline: "Please hold for tone",
    est: 1964,
    accent: "#d86f6b",
    ink: "#14202f",
    paper: "#f5e9dc",
    blurb: "Dusk over rows of pines, with a fresh page of thermal paper curling out of the forest floor.",
    story:
      "The forest transmits a full copy of itself to the neighboring county every evening. It arrives slightly crooked and a little too dark, but it arrives.",
  },
  {
    slug: "pager-point",
    name: "Pager Point",
    tagline: "Beeping since 1949 · Call me back",
    est: 1949,
    accent: "#c94a3a",
    ink: "#0b1c36",
    paper: "#e9eef3",
    blurb: "A pager-shaped lighthouse sweeps its beam over the water, screen reading 911.",
    story:
      "The lighthouse cannot tell you anything, only that someone, somewhere, would like you to find a phone. Nearest phone: Dial-Up Canyon, 40 miles.",
  },
  {
    slug: "cassette-cove",
    name: "Cassette Cove",
    tagline: "Side A · Please rewind before leaving",
    est: 1963,
    accent: "#e8773f",
    ink: "#3d2a2a",
    paper: "#f6ebce",
    blurb: "A tape-reel sun sets over ribbon-brown water while a small cassette sails home.",
    story:
      "The cove has two sides, and visitors must physically walk around to see the second one. A pencil is available at the ranger station for anyone who gets tangled.",
  },
  {
    slug: "dot-matrix-desert",
    name: "Dot Matrix Desert",
    tagline: "Tractor-feed trails · Ribbon required",
    est: 1970,
    accent: "#c25b3d",
    ink: "#3a1630",
    paper: "#fbf0d6",
    blurb: "Dunes in nine-pin sunset colors, framed by the tear-off strips of continuous form paper.",
    story:
      "The desert is loud, slow, and prints one line at a time. Guests are asked to tear carefully along the perforation on their way out.",
  },
  {
    slug: "blue-screen-bay",
    name: "Blue Screen Bay",
    tagline: "Press any key to continue your stay",
    est: 1993,
    accent: "#2f4fd0",
    ink: "#0000aa",
    paper: "#e6e9ff",
    blurb: "A moonlit bay in one exact shade of blue, with a friendly system message in the sky.",
    story:
      "A problem has been detected and the weekend has been shut down to prevent damage to your mood. The bay will restart automatically. Any unsaved plans will be lost.",
  },
];

export function getDesign(slug: string): Design | undefined {
  return designs.find((d) => d.slug === slug);
}

// Shirt colors. `prodigi` is the exact attribute value Prodigi expects for GLOBAL-TEE-GIL-64000.
export type ShirtColor = { id: string; name: string; hex: string; prodigi: string; dark: boolean };
export const colors: ShirtColor[] = [
  { id: "black", name: "Black", hex: "#1c1c1e", prodigi: "black", dark: true },
  { id: "navy", name: "Navy", hex: "#1f2a44", prodigi: "navy blue", dark: true },
  { id: "forest", name: "Forest Green", hex: "#2e4a35", prodigi: "forest green", dark: true },
  { id: "maroon", name: "Maroon", hex: "#5c2233", prodigi: "maroon", dark: true },
  { id: "sport-grey", name: "Sport Grey", hex: "#b9b9b3", prodigi: "sport grey", dark: false },
  { id: "sand", name: "Sand", hex: "#d9caa8", prodigi: "sand", dark: false },
  { id: "white", name: "White", hex: "#f4f4f1", prodigi: "white", dark: false },
];
export function getColor(id: string) {
  return colors.find((c) => c.id === id);
}

export const sizes = ["xs", "s", "m", "l", "xl", "2xl", "3xl"] as const;
export type Size = (typeof sizes)[number];

export const PRODIGI_SKU = "GLOBAL-TEE-GIL-64000"; // Gildan 64000 Softstyle, unisex, 100% cotton
export const CURRENCY = "USD";
export const BASE_PRICE_CENTS = 3400;
export const PLUS_SIZE_SURCHARGE_CENTS = 300; // 2xl and 3xl

export function unitPriceCents(size: Size): number {
  return BASE_PRICE_CENTS + (size === "2xl" || size === "3xl" ? PLUS_SIZE_SURCHARGE_CENTS : 0);
}

export function formatMoney(cents: number, currency = CURRENCY) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

export type CartLine = { slug: string; color: string; size: Size; qty: number };

export function lineKey(l: Pick<CartLine, "slug" | "color" | "size">) {
  return `${l.slug}|${l.color}|${l.size}`;
}

/** Validate and normalise raw cart input from the client. Throws on anything not in the catalog. */
export function normaliseCart(input: unknown): CartLine[] {
  if (!Array.isArray(input) || input.length === 0) throw new Error("Cart is empty");
  if (input.length > 20) throw new Error("Too many line items");
  const merged = new Map<string, CartLine>();
  for (const raw of input) {
    const r = raw as Partial<CartLine>;
    if (!r || typeof r !== "object") throw new Error("Bad line");
    if (!getDesign(String(r.slug))) throw new Error(`Unknown design: ${r.slug}`);
    if (!getColor(String(r.color))) throw new Error(`Unknown color: ${r.color}`);
    if (!sizes.includes(r.size as Size)) throw new Error(`Unknown size: ${r.size}`);
    const qty = Math.floor(Number(r.qty));
    if (!Number.isFinite(qty) || qty < 1 || qty > 10) throw new Error("Quantity must be 1–10");
    const line: CartLine = { slug: r.slug!, color: r.color!, size: r.size as Size, qty };
    const k = lineKey(line);
    const existing = merged.get(k);
    if (existing) existing.qty = Math.min(10, existing.qty + qty);
    else merged.set(k, line);
  }
  return [...merged.values()];
}

export function cartSubtotalCents(lines: CartLine[]) {
  return lines.reduce((sum, l) => sum + unitPriceCents(l.size) * l.qty, 0);
}
