export const COLORS = [
  { id: "black", name: "Black", hex: "#171717", ink: "light" },
  { id: "navy blue", name: "Navy", hex: "#1c2944", ink: "light" },
  { id: "asphalt", name: "Asphalt", hex: "#3a3a3a", ink: "light" },
  { id: "burgundy", name: "Burgundy", hex: "#6b2a38", ink: "light" },
  { id: "military green", name: "Military", hex: "#3d4633", ink: "light" },
  { id: "white", name: "White", hex: "#f4f4f2", ink: "dark" },
  { id: "cream", name: "Cream", hex: "#f1e3cb", ink: "dark" },
  { id: "natural", name: "Natural", hex: "#e6d3b6", ink: "dark" },
  { id: "light blue", name: "Light Blue", hex: "#c7d9e8", ink: "dark" },
  { id: "athletic grey heather", name: "Heather", hex: "#9aa1a8", ink: "dark" },
];

export const INK = {
  light: {
    star: "#F6F1E8",
    bright: "#FFF9F1",
    line: "#E4C58A",
    ring: "#F6F1E8",
    title: "#F7F2EA",
    meta: "#E8DCCB",
    accent: "#E4C58A",
    mark: "#D4BC96",
  },
  dark: {
    star: "#1A2330",
    bright: "#101720",
    line: "#8E4F34",
    ring: "#1A2330",
    title: "#17202C",
    meta: "#3C4656",
    accent: "#8E4F34",
    mark: "#7A5A40",
  },
};

export function colorById(id) {
  return COLORS.find((c) => c.id === id) || COLORS[0];
}

export function inkFor(colorId) {
  return INK[colorById(colorId).ink];
}

export function shift(hex, amt) {
  const n = hex.replace("#", "");
  const ch = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16));
  const out = ch.map((c) => Math.max(0, Math.min(255, Math.round(c + amt * 255))));
  return `#${out.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

export const SIZES = [
  { id: "xs", label: "XS", chest: "31\"", length: "27\"" },
  { id: "s", label: "S", chest: "34\"", length: "28\"" },
  { id: "m", label: "M", chest: "38\"", length: "29\"" },
  { id: "l", label: "L", chest: "43\"", length: "30\"" },
  { id: "xl", label: "XL", chest: "46\"", length: "31\"" },
  { id: "2xl", label: "2XL", chest: "50\"", length: "32\"" },
  { id: "3xl", label: "3XL", chest: "54\"", length: "33\"" },
  { id: "4xl", label: "4XL", chest: "58\"", length: "34\"" },
];

export const SHIRT_CENTS = 5400;
export const SHIPPING_CENTS = 900;

export function money(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}
