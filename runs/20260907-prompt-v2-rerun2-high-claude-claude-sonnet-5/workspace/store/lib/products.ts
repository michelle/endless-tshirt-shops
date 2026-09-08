export type IconType =
  | "bigfoot"
  | "nessie"
  | "chupacabra"
  | "mothman"
  | "jackalope"
  | "yeti";

export interface Product {
  slug: string;
  name: string; // creature name, shown big on the badge
  role: string; // "job title" ribbon text
  dept: string; // department line
  fileNo: string; // flavor "file number"
  established: string; // "EST. 1958" style stamp
  price: number; // cents
  icon: IconType;
  ringColor: string; // outer ring / text color
  bgColor: string; // inner badge face color
  silhouetteColor: string; // creature icon primary color
  accentColor: string; // ribbon + accent color
  tagline: string; // short punchy line for product cards
  description: string; // longer "personnel file" copy
}

export const BRAND = {
  name: "The Bureau of Ordinary Monsters",
  short: "B.O.M.",
  tagline: "Paperwork for the Unexplained.",
  domainCopy:
    "A fictional federal agency that gives cryptids something far scarier than a search party: a performance review. Every shirt is a retro employee badge for a monster who never wanted a desk job.",
};

export const COLORS = [
  { name: "White", value: "white", swatch: "#f5f4f0" },
  { name: "Black", value: "black", swatch: "#1a1a1a" },
  { name: "Sport Grey", value: "sport grey", swatch: "#9a9a9a" },
  { name: "Navy Blue", value: "navy blue", swatch: "#1f2740" },
];

export const SIZES = ["s", "m", "l", "xl", "2xl"];

export const PRODUCTS: Product[] = [
  {
    slug: "bigfoot-eotm",
    name: "BIGFOOT",
    role: "EMPLOYEE OF THE MONTH",
    dept: "FIELD OPERATIONS DIV.",
    fileNo: "FILE NO. 07-SQUATCH",
    established: "EST. 1958",
    price: 2900,
    icon: "bigfoot",
    ringColor: "#2b2118",
    bgColor: "#ecdfc4",
    silhouetteColor: "#4a3728",
    accentColor: "#c1962f",
    tagline: "17 years running. Still can't find him for the ceremony.",
    description:
      "Nominated every month since 1958 for 'Excellence in Not Being Seen.' HR has never successfully scheduled his review. Comes with a laurel wreath he will never claim in person.",
  },
  {
    slug: "nessie-compliance",
    name: "NESSIE",
    role: "UNDERWATER COMPLIANCE",
    dept: "LOCH & LAKES DIVISION",
    fileNo: "FILE NO. 33-LOCH",
    established: "EST. 1933",
    price: 2900,
    icon: "nessie",
    ringColor: "#0b3d3a",
    bgColor: "#d8ede9",
    silhouetteColor: "#12665f",
    accentColor: "#dcb93f",
    tagline: "Surfaces just often enough to keep the paperwork ambiguous.",
    description:
      "Regional inspector for all things submerged. Has filed the same incident report, in triplicate, ninety-one years running. Tourists remain a Level 2 containment concern.",
  },
  {
    slug: "chupacabra-loss-prevention",
    name: "CHUPACABRA",
    role: "LIVESTOCK LOSS PREVENTION",
    dept: "RANCH RELATIONS DIVISION",
    fileNo: "FILE NO. 95-GOAT",
    established: "EST. 1995",
    price: 2900,
    icon: "chupacabra",
    ringColor: "#3a1212",
    bgColor: "#f1e2d3",
    silhouetteColor: "#7a2a23",
    accentColor: "#d97b29",
    tagline: "Technically the one causing the losses. Nobody's fixed the org chart.",
    description:
      "Hired to prevent livestock loss. Statistically responsible for most of it. The Bureau's longest-running conflict-of-interest case remains open, unresolved, and fully spiky.",
  },
  {
    slug: "mothman-night-shift",
    name: "MOTHMAN",
    role: "NIGHT SHIFT SUPERVISOR",
    dept: "POINT PLEASANT OFFICE",
    fileNo: "FILE NO. 66-TFT",
    established: "EST. 1966",
    price: 2900,
    icon: "mothman",
    ringColor: "#241c38",
    bgColor: "#e6dcf5",
    silhouetteColor: "#4b3b6b",
    accentColor: "#e0483e",
    tagline: "Warns of bridge collapses. Still can't warn HR he's running late.",
    description:
      "Supervises a shift nobody else will take. Glowing red eyes rated Bureau-standard for pre-dawn parking structure inspections. Never once clocked out on time.",
  },
  {
    slug: "jackalope-liaison",
    name: "JACKALOPE",
    role: "RURAL WILDLIFE LIAISON",
    dept: "PLAINS & PRAIRIE DIVISION",
    fileNo: "FILE NO. 29-HORN",
    established: "EST. 1829",
    price: 2900,
    icon: "jackalope",
    ringColor: "#3d2b1f",
    bgColor: "#f2e9d5",
    silhouetteColor: "#8a5a34",
    accentColor: "#5f8a4a",
    tagline: "Liaises between rural legend and municipal zoning board.",
    description:
      "Diplomatic envoy between prairie folklore and the county permit office. Antlers are load-bearing for morale purposes only. Fastest thing on the org chart.",
  },
  {
    slug: "yeti-cold-storage",
    name: "YETI",
    role: "COLD STORAGE & LOGISTICS",
    dept: "HIGH ALTITUDE OFFICE",
    fileNo: "FILE NO. 21-FROST",
    established: "EST. 1921",
    price: 2900,
    icon: "yeti",
    ringColor: "#1c2b3a",
    bgColor: "#e3eef5",
    silhouetteColor: "#8fb2c4",
    accentColor: "#2d6a8f",
    tagline: "Runs the walk-in freezer. Refuses to say what's in aisle 4.",
    description:
      "Manages inventory at 19,000 feet with zero complaints and zero visible supply chain. Warm, if you can find him. Currently overdue for a performance review, permanently.",
  },
];

export function getProduct(slug: string): Product | undefined {
  return PRODUCTS.find((p) => p.slug === slug);
}

export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
