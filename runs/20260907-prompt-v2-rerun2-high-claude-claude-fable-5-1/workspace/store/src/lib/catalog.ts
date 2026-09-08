// Product catalog for the Department of Obsolete Futures.
// Every design is printed on a Bella + Canvas 3001 via Prodigi.

export const PRODIGI_SKU = "GLOBAL-TEE-BC-3001";
export const PRICE_CENTS = 2800; // $28.00 per shirt
export const CURRENCY = "usd";

export type Ink = "light" | "dark";

export type ShirtColor = {
  id: string; // our id, used in cart/urls
  label: string;
  prodigi: string; // Prodigi attribute value for GLOBAL-TEE-BC-3001
  hex: string;
  ink: Ink; // which ink variant of the design prints legibly on this colour
};

export const COLORS: ShirtColor[] = [
  { id: "black", label: "Black", prodigi: "black", hex: "#1c1c1e", ink: "light" },
  { id: "navy", label: "Navy", prodigi: "navy blue", hex: "#1f2740", ink: "light" },
  { id: "maroon", label: "Maroon", prodigi: "maroon", hex: "#5b1f2b", ink: "light" },
  { id: "army", label: "Army", prodigi: "military green", hex: "#4a5140", ink: "light" },
  { id: "white", label: "White", prodigi: "white", hex: "#f5f4f0", ink: "dark" },
  { id: "natural", label: "Natural", prodigi: "natural", hex: "#e9e1cd", ink: "dark" },
  { id: "heather", label: "Athletic Heather", prodigi: "athletic grey heather", hex: "#b9b8b4", ink: "dark" },
];

export const SIZES = [
  { id: "xs", label: "XS", prodigi: "xs" },
  { id: "s", label: "S", prodigi: "s" },
  { id: "m", label: "M", prodigi: "m" },
  { id: "l", label: "L", prodigi: "l" },
  { id: "xl", label: "XL", prodigi: "xl" },
  { id: "2xl", label: "2XL", prodigi: "2xl" },
  { id: "3xl", label: "3XL", prodigi: "3xl" },
] as const;

export type SizeId = (typeof SIZES)[number]["id"];

export type Product = {
  slug: string;
  bureau: string; // short name shown on the shirt, two lines max
  titleLines: [string, string];
  ringText: string; // bottom arc of the seal
  established: string;
  tagline: string;
  blurb: string;
  accent: string; // accent ink colour used in the design
  colors: string[]; // ShirtColor ids offered
  defaultColor: string;
};

export const PRODUCTS: Product[] = [
  {
    slug: "jetpack-commuting",
    bureau: "Bureau of Jetpack Commuting",
    titleLines: ["JETPACK", "COMMUTING"],
    ringText: "STILL WAITING · FLIGHT LANE 4",
    established: "1962",
    tagline: "Your flight lane is being processed.",
    blurb:
      "Popular Science promised you'd be flying to work by 1975. The Bureau is still finalising the lane markings. Wear the seal of the agency that never cleared you for takeoff.",
    accent: "#f0742b",
    colors: ["black", "navy", "natural", "white"],
    defaultColor: "black",
  },
  {
    slug: "lunar-hotel-concierge",
    bureau: "Lunar Hotel Concierge Service",
    titleLines: ["LUNAR HOTEL", "CONCIERGE"],
    ringText: "SEA OF TRANQUILITY · VACANCY",
    established: "1969",
    tagline: "Checkout is at 06:00 lunar time.",
    blurb:
      "Reservations were being taken by 1968. The lobby is still under construction. The staff shirt for the finest resort that was never built, with the eternal VACANCY light.",
    accent: "#f5d34c",
    colors: ["navy", "black", "white", "heather"],
    defaultColor: "navy",
  },
  {
    slug: "flying-car-traffic",
    bureau: "Flying Car Traffic Division",
    titleLines: ["FLYING CAR", "TRAFFIC DIV."],
    ringText: "ALTITUDE PATROL · NO HOVERING",
    established: "1957",
    tagline: "Please keep your car in the sky lane.",
    blurb:
      "Every World's Fair since 1939 has shown you the flying car. The Traffic Division has been waiting just as long to write its first citation. Report for duty.",
    accent: "#5ac8e8",
    colors: ["black", "maroon", "white", "heather"],
    defaultColor: "black",
  },
  {
    slug: "meal-pill-nutrition",
    bureau: "Meal Pill Nutrition Board",
    titleLines: ["MEAL PILL", "NUTRITION BOARD"],
    ringText: "THREE COURSES · ONE CAPSULE",
    established: "1936",
    tagline: "Dinner is now a supplement.",
    blurb:
      "A full Thanksgiving dinner in a single capsule, coming soon since 1936. The Board still meets every Tuesday to taste-test. Chew thoroughly.",
    accent: "#e3557a",
    colors: ["natural", "white", "black", "army"],
    defaultColor: "natural",
  },
  {
    slug: "weather-control-authority",
    bureau: "Weather Control Authority",
    titleLines: ["WEATHER", "CONTROL AUTH."],
    ringText: "RAIN SCHEDULED TUESDAYS 02:00",
    established: "1947",
    tagline: "Sunny by decree.",
    blurb:
      "Scientists in 1947 assured Congress that weather would soon be scheduled like trains. The Authority still has the lever. It is still stuck on 'partly cloudy'.",
    accent: "#7fd1a8",
    colors: ["navy", "army", "white", "natural"],
    defaultColor: "army",
  },
  {
    slug: "household-robot-union",
    bureau: "Household Robot Union Local 2001",
    titleLines: ["HOUSEHOLD", "ROBOT UNION"],
    ringText: "LOCAL 2001 · DOMESTIC AUTOMATONS",
    established: "1959",
    tagline: "Solidarity in every kitchen.",
    blurb:
      "The robot butler was due in every home by the year 2000. The Union has been organising since 1959 and has yet to admit a single member. Support the cause.",
    accent: "#c9a4ff",
    colors: ["black", "maroon", "heather", "white"],
    defaultColor: "maroon",
  },
  {
    slug: "undersea-city-planning",
    bureau: "Undersea City Planning Commission",
    titleLines: ["UNDERSEA CITY", "PLANNING"],
    ringText: "ZONING FOR 20,000 LEAGUES",
    established: "1964",
    tagline: "Waterfront property, all sides.",
    blurb:
      "Domed cities on the continental shelf were zoned in 1964. The Commission is still reviewing the drainage plan. A seal for those who never got their sea-floor lot.",
    accent: "#4cc9f0",
    colors: ["navy", "black", "white", "heather"],
    defaultColor: "navy",
  },
];

export function getProduct(slug: string): Product | undefined {
  return PRODUCTS.find((p) => p.slug === slug);
}

export function getColor(id: string): ShirtColor | undefined {
  return COLORS.find((c) => c.id === id);
}

export function getSize(id: string) {
  return SIZES.find((s) => s.id === id);
}

export function formatPrice(cents: number, currency = CURRENCY) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}
