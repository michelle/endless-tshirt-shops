// Client-safe design vocabulary (no font imports).

export const SCENES = {
  mountains: "Mountains",
  desert: "Desert mesas",
  coast: "Rocky coast",
  forest: "Lake & forest",
} as const;
export type Scene = keyof typeof SCENES;

export interface Palette {
  label: string;
  sky: string;
  halo: string;
  sun: string;
  layers: [string, string, string, string]; // far → near
  ink: string;
  cream: string;
  ribbon: string;
  night?: boolean;
}

export const PALETTES: Record<string, Palette> = {
  golden: {
    label: "Golden hour",
    sky: "#F9D9A0",
    halo: "#F6B868",
    sun: "#FFF4D6",
    layers: ["#E9845E", "#BF5B4A", "#7E3B47", "#3E2638"],
    ink: "#2A1A26",
    cream: "#FFF4DE",
    ribbon: "#D9583B",
  },
  dusk: {
    label: "Dusk",
    sky: "#FBC8B4",
    halo: "#F59A90",
    sun: "#FFE9C7",
    layers: ["#B9869A", "#7C5D85", "#4D3E66", "#2A2444"],
    ink: "#1C1830",
    cream: "#FFF1E4",
    ribbon: "#E0636B",
  },
  night: {
    label: "Starry night",
    sky: "#1E3A5F",
    halo: "#27507A",
    sun: "#F6F1DC",
    layers: ["#4B7BA0", "#30607F", "#1E4562", "#0F2A3F"],
    ink: "#0A1826",
    cream: "#F6F1DC",
    ribbon: "#E2533F",
    night: true,
  },
  alpine: {
    label: "Alpine morning",
    sky: "#CBE7F6",
    halo: "#A6D3EE",
    sun: "#FFF7DA",
    layers: ["#86B7CF", "#5E9A88", "#2F6B55", "#173F31"],
    ink: "#0E2A20",
    cream: "#FFF9E6",
    ribbon: "#E36B3C",
  },
  sage: {
    label: "Sagebrush",
    sky: "#EEEFCF",
    halo: "#DCE0AE",
    sun: "#FFFBE8",
    layers: ["#C3B58F", "#93986A", "#62703F", "#353F27"],
    ink: "#1F2617",
    cream: "#FFFBE8",
    ribbon: "#BC6C25",
  },
};
export type PaletteKey = keyof typeof PALETTES;

export interface Design {
  name: string; // the park's name, e.g. "MAYA’S BACKYARD"
  year: string; // "" or 4 digits
  motto: string; // "" or short line arched across the top
  scene: Scene;
  palette: PaletteKey;
  v: number; // re-survey counter: lets customers reroll the terrain
}

export const DEFAULT_DESIGN: Design = {
  name: "Maya’s Backyard",
  year: "1991",
  motto: "Wild, free & mostly supervised",
  scene: "mountains",
  palette: "golden",
  v: 0,
};

export const LIMITS = { name: 22, motto: 34 };

