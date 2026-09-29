// Curated palettes for ONE OF ONE STUDIO.
// Each palette: id, display name, ink colors, recommended shirt colors, blurb.

export const PALETTES = [
  {
    id: "ember",
    name: "Ember",
    blurb: "Slow-burning reds, gold leaf, and coal smoke.",
    inks: ["#ff5d3b", "#ffb15e", "#ffd97a", "#c22f2f", "#7a1f2b", "#f4e3c1"],
    shirts: ["black", "navy blue", "burgundy"],
    dark: true,
  },
  {
    id: "glacier",
    name: "Glacier",
    blurb: "Arctic blues and meltwater silver.",
    inks: ["#bfe8ff", "#5fb8e6", "#2a6fb8", "#0f3d6e", "#eaf7ff", "#8fd0c8"],
    shirts: ["navy blue", "black", "royal blue"],
    dark: true,
  },
  {
    id: "moss",
    name: "Moss",
    blurb: "Forest floor after rain.",
    inks: ["#9fbf6b", "#4c7a3f", "#1f4a2e", "#d9e4b0", "#b08d57", "#e8f0da"],
    shirts: ["black", "military green", "natural"],
    dark: true,
  },
  {
    id: "ultraviolet",
    name: "Ultraviolet",
    blurb: "Club lights at 3am.",
    inks: ["#c77dff", "#7b2ff2", "#f72585", "#4cc9f0", "#ffd6ff", "#3a0ca3"],
    shirts: ["black", "navy blue", "purple"],
    dark: true,
  },
  {
    id: "sunset",
    name: "Sunset",
    blurb: "The last ten minutes of a good day.",
    inks: ["#ff9e7a", "#ff5d8f", "#ffc15e", "#b565d8", "#ffe3b3", "#6d2e5e"],
    shirts: ["black", "navy blue", "cream"],
    dark: true,
  },
  {
    id: "paper",
    name: "Paper & Ink",
    blurb: "Charcoal studies on cotton stock.",
    inks: ["#1c1c1c", "#4a4a48", "#8a857b", "#c9c2b4", "#6b4f3a", "#2f2f2e"],
    shirts: ["white", "natural", "athletic grey heather"],
    dark: false,
  },
  {
    id: "signal",
    name: "Signal",
    blurb: "One frequency, amplified.",
    inks: ["#ffffff", "#e8e8e8", "#bdbdbd", "#7a7a7a", "#f5f5f0", "#444444"],
    shirts: ["black", "navy blue", "red"],
    dark: true,
  },
];

export function getPalette(id) {
  return PALETTES.find((p) => p.id === id) || PALETTES[0];
}

// Bella+Canvas 3001 attributes (Prodigi GLOBAL-TEE-BC-3001)
export const SHIRT_COLORS = [
  "black",
  "white",
  "navy blue",
  "natural",
  "athletic grey heather",
  "royal blue",
  "burgundy",
  "military green",
  "purple",
  "red",
  "cream",
];

export const SHIRT_SIZES = ["xs", "s", "m", "l", "xl", "2xl", "3xl", "4xl"];

export const SHIRT_COLOR_HEX = {
  black: "#232323",
  white: "#f6f6f2",
  "navy blue": "#1f2a44",
  natural: "#ece5d3",
  "athletic grey heather": "#a7aab0",
  "royal blue": "#27408b",
  burgundy: "#5e2233",
  "military green": "#4a4a38",
  purple: "#5b3a7a",
  red: "#a92c34",
  cream: "#f1e6cc",
};

export const PRICE_USD = 3600; // $36.00, shipping included
