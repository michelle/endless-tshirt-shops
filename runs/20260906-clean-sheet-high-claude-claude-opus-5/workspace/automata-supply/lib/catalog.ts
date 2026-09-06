import type { Design, InkId, Seeding, SizeId } from "./design";

export type CatalogItem = {
  slug: string;
  rule: number;
  name: string;
  /** One line for cards and listings. */
  tagline: string;
  /** Why this rule is worth wearing. */
  note: string;
  design: Design;
  /** Garment colour the piece was art-directed on. */
  garmentId: string;
};

function d(
  rule: number,
  seed: string,
  seeding: Seeding,
  ink: InkId,
  cells = 121,
): Design {
  return { rule, seed, seeding, ink, cells };
}

export const CATALOG: CatalogItem[] = [
  {
    slug: "rule-30",
    rule: 30,
    name: "Rule 30",
    tagline: "Order in, chaos out",
    note: "Three cells of deterministic arithmetic that nobody can shortcut. Wolfram liked it enough to use it as Mathematica's random number generator, and Cambridge North station wears it across the whole building.",
    design: d(30, "000001", "single", "bone", 141),
    garmentId: "black",
  },
  {
    slug: "rule-110",
    rule: 110,
    name: "Rule 110",
    tagline: "Turing complete",
    note: "Proven capable of universal computation by Matthew Cook. Anything your laptop can compute, this rule can compute too, given enough cells and enough patience.",
    design: d(110, "3F19A2", "random", "signal", 121),
    garmentId: "black",
  },
  {
    slug: "rule-90",
    rule: 90,
    name: "Rule 90",
    tagline: "Sierpinski, one row at a time",
    note: "Take the XOR of your two neighbours. From a single live cell, that simple instruction draws the Sierpinski triangle without ever being told what a triangle is.",
    design: d(90, "000001", "single", "bone", 161),
    garmentId: "navy",
  },
  {
    slug: "rule-184",
    rule: 184,
    name: "Rule 184",
    tagline: "The traffic model",
    note: "The canonical toy model of a traffic jam. Each cell is a car, each step is a second, and the diagonal stripes are shockwaves travelling backwards up the motorway.",
    design: d(184, "7C2B10", "random", "ember", 121),
    garmentId: "black",
  },
  {
    slug: "rule-150",
    rule: 150,
    name: "Rule 150",
    tagline: "Additive lattice",
    note: "The sum of all three neighbours, mod 2. Additive rules like this one are the reason cellular automata and linear algebra keep bumping into each other.",
    design: d(150, "000001", "single", "moss", 161),
    garmentId: "forest",
  },
  {
    slug: "rule-22",
    rule: 22,
    name: "Rule 22",
    tagline: "Fractal dust",
    note: "Sparser and stranger than Rule 90. It keeps the fractal skeleton but lets chaos eat the interior, which is why it prints like weathered lace.",
    design: d(22, "000001", "single", "bone", 161),
    garmentId: "charcoal",
  },
  {
    slug: "rule-54",
    rule: 54,
    name: "Rule 54",
    tagline: "Gliders and collisions",
    note: "A class-four rule: stable backgrounds crossed by travelling particles that scatter off each other. Widely suspected to be universal, not yet proven.",
    design: d(54, "A41D77", "random", "signal", 121),
    garmentId: "black",
  },
  {
    slug: "rule-60",
    rule: 60,
    name: "Rule 60",
    tagline: "Pascal's triangle, mod 2",
    note: "Binomial coefficients with the evens knocked out. The oldest pattern in the collection, drawn centuries before anyone called it an automaton.",
    design: d(60, "000001", "single", "ember", 141),
    garmentId: "maroon",
  },
];

export const CATALOG_BY_SLUG = Object.fromEntries(CATALOG.map((c) => [c.slug, c]));

/** Prices in USD cents. */
export const CATALOG_PRICE = 3800;
export const CUSTOM_PRICE = 4400;

/** Extended sizes cost the mill more, so they cost the customer more. */
export const SIZE_UPCHARGE: Partial<Record<SizeId, number>> = {
  "2xl": 300,
  "3xl": 500,
};

/**
 * A design counts as a catalogue piece only if it matches a listed one exactly;
 * anything the customer altered is priced as a one-of-one.
 */
export function priceFor(design: Design, size: SizeId): number {
  const listed = CATALOG.some(
    (c) =>
      c.design.rule === design.rule &&
      c.design.seed === design.seed &&
      c.design.seeding === design.seeding &&
      c.design.ink === design.ink &&
      c.design.cells === design.cells,
  );
  return (listed ? CATALOG_PRICE : CUSTOM_PRICE) + (SIZE_UPCHARGE[size] ?? 0);
}

export function isCatalogDesign(design: Design): boolean {
  return CATALOG.some(
    (c) =>
      c.design.rule === design.rule &&
      c.design.seed === design.seed &&
      c.design.seeding === design.seeding &&
      c.design.ink === design.ink &&
      c.design.cells === design.cells,
  );
}

export function formatUsd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
