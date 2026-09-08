export type Climate = "meadow" | "alpine" | "desert" | "tropical" | "nocturne";

export interface Palette {
  leaves: string[];
  petals: string[];
  centers: string[];
  accent: string; // berries / buds
  stem: string;
}

export interface ClimateInfo {
  key: Climate;
  label: string;
  tagline: string;
  habitat: string;
  epithets: string[];
  palette: Palette;
}

export const CLIMATES: Record<Climate, ClimateInfo> = {
  meadow: {
    key: "meadow",
    label: "Meadow",
    tagline: "Soft greens, blush and cream",
    habitat: "Lowland meadows and hedgerows",
    epithets: ["pratensis", "sylvestris", "vernalis", "campestris", "gracilis", "amabilis"],
    palette: {
      leaves: ["#5f7d4a", "#7f9c5a", "#a3b86e", "#4b6a3d"],
      petals: ["#e8a0b4", "#f2c7c2", "#f6e3b0", "#d98aa0"],
      centers: ["#d9a441", "#b8862e"],
      accent: "#b34a5c",
      stem: "#4f6a3c",
    },
  },
  alpine: {
    key: "alpine",
    label: "Alpine",
    tagline: "Cool blues, violet and snow",
    habitat: "Alpine slopes, 1,800 m and above",
    epithets: ["alpina", "montana", "glacialis", "borealis", "nivalis", "saxatilis"],
    palette: {
      leaves: ["#5c7c6f", "#83a191", "#a6bfb0", "#46655a"],
      petals: ["#7e8ec9", "#b7a5d6", "#f2f0f7", "#5c6fb5"],
      centers: ["#e6c86e", "#f3e4a8"],
      accent: "#4b5aa3",
      stem: "#4c6a5e",
    },
  },
  desert: {
    key: "desert",
    label: "Desert",
    tagline: "Sage, ochre and terracotta",
    habitat: "Dry scrub and sun-baked canyons",
    epithets: ["arenaria", "aurea", "solaris", "deserti", "ignea", "robusta"],
    palette: {
      leaves: ["#8c9a6e", "#b0a878", "#c9bf8d", "#6f7d52"],
      petals: ["#d9764a", "#e2a24a", "#f0c98a", "#c4553a"],
      centers: ["#6b3d2e", "#8f5138"],
      accent: "#c4553a",
      stem: "#7a7a4e",
    },
  },
  tropical: {
    key: "tropical",
    label: "Tropical",
    tagline: "Deep greens, magenta and flame",
    palette: {
      leaves: ["#2f6b4f", "#3f8c5e", "#6bb076", "#245240"],
      petals: ["#e0447f", "#f28a2e", "#ffd35c", "#c62f6a"],
      centers: ["#3a1f2e", "#5c2a3f"],
      accent: "#f28a2e",
      stem: "#2c5a44",
    },
    habitat: "Cloud forest and river margins",
    epithets: ["tropica", "splendens", "fervida", "radiata", "insularis", "magnifica"],
  },
  nocturne: {
    key: "nocturne",
    label: "Nocturne",
    tagline: "Silver, moonlit petals, made for dark shirts",
    habitat: "Night gardens, flowering after dusk",
    epithets: ["nocturna", "lunaris", "stellata", "umbrosa", "vesperina", "argentea"],
    palette: {
      leaves: ["#8fb3ad", "#b8d0c9", "#d6e3dd", "#6f948e"],
      petals: ["#f6f1e6", "#dfc7ee", "#f4d8b0", "#cdb6e8"],
      centers: ["#f0c060", "#f7dc9a"],
      accent: "#dfc7ee",
      stem: "#8aa9a2",
    },
  },
};

export const CLIMATE_KEYS = Object.keys(CLIMATES) as Climate[];

/** Mix a hex color toward another by t (0..1). */
export function mix(hex: string, toward: string, t: number): string {
  const a = parse(hex);
  const b = parse(toward);
  const r = Math.round(a[0] + (b[0] - a[0]) * t);
  const g = Math.round(a[1] + (b[1] - a[1]) * t);
  const bl = Math.round(a[2] + (b[2] - a[2]) * t);
  return `#${[r, g, bl].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

function parse(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function luminance(hex: string): number {
  const [r, g, b] = parse(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
