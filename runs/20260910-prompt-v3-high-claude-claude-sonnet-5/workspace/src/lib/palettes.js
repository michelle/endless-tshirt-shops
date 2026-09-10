// Curated color palettes for the generative constellation artwork.
// Each palette has a "dark" ink set (glowing, for dark garments) and a
// "light" ink set (deep, saturated, for light garments) so the artwork
// always reads with strong contrast against the chosen shirt color.

export const PALETTES = [
  {
    key: "nebula",
    name: "Nebula",
    swatch: "linear-gradient(135deg, #7c3aed, #22d3ee)",
    dark: {
      stars: ["#c4b5fd", "#67e8f9", "#f0abfc", "#e0e7ff"],
      line: "#a78bfa",
      text: "#f5f3ff",
      glow: "rgba(167,139,250,0.55)",
    },
    light: {
      stars: ["#4c1d95", "#0e7490", "#86198f", "#312e81"],
      line: "#6d28d9",
      text: "#2e1065",
      glow: "rgba(109,40,217,0.25)",
    },
  },
  {
    key: "ember",
    name: "Ember",
    swatch: "linear-gradient(135deg, #f97316, #f43f5e)",
    dark: {
      stars: ["#fed7aa", "#fda4af", "#fde68a", "#fff7ed"],
      line: "#fb923c",
      text: "#fff7ed",
      glow: "rgba(251,146,60,0.55)",
    },
    light: {
      stars: ["#9a3412", "#9f1239", "#92400e", "#7c2d12"],
      line: "#c2410c",
      text: "#431407",
      glow: "rgba(194,65,12,0.25)",
    },
  },
  {
    key: "aurora",
    name: "Aurora",
    swatch: "linear-gradient(135deg, #10b981, #3b82f6)",
    dark: {
      stars: ["#a7f3d0", "#93c5fd", "#5eead4", "#ecfeff"],
      line: "#34d399",
      text: "#ecfeff",
      glow: "rgba(52,211,153,0.55)",
    },
    light: {
      stars: ["#065f46", "#1e3a8a", "#115e59", "#134e4a"],
      line: "#047857",
      text: "#022c22",
      glow: "rgba(4,120,87,0.25)",
    },
  },
  {
    key: "mono",
    name: "Monochrome",
    swatch: "linear-gradient(135deg, #e5e7eb, #6b7280)",
    dark: {
      stars: ["#f9fafb", "#e5e7eb", "#d1d5db", "#ffffff"],
      line: "#cbd5e1",
      text: "#ffffff",
      glow: "rgba(255,255,255,0.5)",
    },
    light: {
      stars: ["#111827", "#1f2937", "#374151", "#000000"],
      line: "#111827",
      text: "#000000",
      glow: "rgba(17,24,39,0.2)",
    },
  },
  {
    key: "sunflare",
    name: "Sunflare",
    swatch: "linear-gradient(135deg, #facc15, #f59e0b)",
    dark: {
      stars: ["#fef08a", "#fde68a", "#fff1c1", "#ffffff"],
      line: "#fbbf24",
      text: "#fffbeb",
      glow: "rgba(251,191,36,0.55)",
    },
    light: {
      stars: ["#854d0e", "#92400e", "#713f12", "#78350f"],
      line: "#a16207",
      text: "#422006",
      glow: "rgba(161,98,7,0.25)",
    },
  },
];

export function getPalette(key) {
  return PALETTES.find((p) => p.key === key) || PALETTES[0];
}
