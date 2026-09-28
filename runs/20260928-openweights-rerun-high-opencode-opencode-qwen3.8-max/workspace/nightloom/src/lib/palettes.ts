export type PaletteId = 'midnight' | 'twilight' | 'aurora' | 'ivory';

export interface Palette {
  id: PaletteId;
  label: string;
  /** Palette meant for dark garments (bright text outside the disc). */
  forDarkGarment: boolean;
  /** Vertical gradient stops inside the sky disc. */
  disc: [string, string, string];
  /** Vignette strength at the disc rim (0..1). */
  vignette: number;
  star: string; // fallback star tint
  line: string; // constellation line stroke
  lineOpacity: number;
  ring: string; // outer ring + ticks
  ringOpacity: number;
  grid: string; // alt/az grid
  gridOpacity: number;
  text: string; // headline text (name) outside disc
  textSoft: string; // detail lines outside disc
  accent: string; // divider ornament
  labelColor: string; // in-disc labels
  labelOpacity: number;
  /** Preview swatch CSS for the storefront. */
  swatch: string;
}

export const PALETTES: Record<PaletteId, Palette> = {
  midnight: {
    id: 'midnight',
    label: 'Midnight',
    forDarkGarment: true,
    disc: ['#0A1130', '#131E48', '#0B1331'],
    vignette: 0.42,
    star: '#F5F1E6',
    line: '#AFC4EE',
    lineOpacity: 0.26,
    ring: '#A9BEE8',
    ringOpacity: 0.55,
    grid: '#8FA6D9',
    gridOpacity: 0.07,
    text: '#F3EEE3',
    textSoft: '#C9CDDC',
    accent: '#E0C68F',
    labelColor: '#C9D6F2',
    labelOpacity: 0.42,
    swatch: 'linear-gradient(160deg,#0A1130,#131E48 55%,#0B1331)',
  },
  twilight: {
    id: 'twilight',
    label: 'Twilight',
    forDarkGarment: true,
    disc: ['#241353', '#4C2160', '#7C2F57'],
    vignette: 0.36,
    star: '#FFF6E8',
    line: '#F3B9CD',
    lineOpacity: 0.28,
    ring: '#E7B9CB',
    ringOpacity: 0.55,
    grid: '#D9A8C8',
    gridOpacity: 0.07,
    text: '#FCEEF2',
    textSoft: '#D9C2CC',
    accent: '#F0C9A2',
    labelColor: '#F0CBE0',
    labelOpacity: 0.42,
    swatch: 'linear-gradient(160deg,#241353,#4C2160 55%,#7C2F57)',
  },
  aurora: {
    id: 'aurora',
    label: 'Aurora',
    forDarkGarment: true,
    disc: ['#04141D', '#0B3A3C', '#11455A'],
    vignette: 0.38,
    star: '#EAF7F2',
    line: '#9FE3CB',
    lineOpacity: 0.28,
    ring: '#A5E3D0',
    ringOpacity: 0.55,
    grid: '#8FD4C0',
    gridOpacity: 0.07,
    text: '#EFF8F4',
    textSoft: '#BFD4CC',
    accent: '#A9E5CF',
    labelColor: '#BFE9DA',
    labelOpacity: 0.42,
    swatch: 'linear-gradient(160deg,#04141D,#0B3A3C 55%,#11455A)',
  },
  ivory: {
    id: 'ivory',
    label: 'Ivory Ink',
    forDarkGarment: false,
    disc: ['#0A1130', '#151F47', '#0D1533'],
    vignette: 0.4,
    star: '#F7EFD9',
    line: '#B9C6E8',
    lineOpacity: 0.3,
    ring: '#B99A5A',
    ringOpacity: 0.75,
    grid: '#8FA6D9',
    gridOpacity: 0.08,
    text: '#101A38',
    textSoft: '#3A4262',
    accent: '#8A6F3C',
    labelColor: '#C9D6F2',
    labelOpacity: 0.45,
    swatch: 'linear-gradient(160deg,#0A1130,#151F47 55%,#0D1533)',
  },
};

export const PALETTE_IDS = Object.keys(PALETTES) as PaletteId[];
