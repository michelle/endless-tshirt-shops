// Deterministic generative-art engine.
//
// The exact same phrase + palette + shirt color always produces the exact
// same pattern. That's the whole point of the product: it's not a random
// decoration, it's a reproducible "cipher" of what the customer typed.
//
// This module has zero DOM/browser dependencies so it can run identically
// in the browser (live customizer preview) and on the server (print-file
// rasterization via satori + resvg).

import { PALETTES, SHIRT_COLORS, type DesignSpec } from "./types";

export function hashString(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function mulberry32(seed: number) {
  let s = seed;
  return function random() {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BAR_COUNT = 84;

export interface Bar {
  angle: number; // degrees, 0 = up, clockwise
  length: number; // 0..1 fraction of the available band
  color: string;
}

export interface Design {
  bars: Bar[];
  discColor: string;
  ringColor: string;
  textColor: string;
  phraseDisplay: string;
  patternCode: string;
}

export function buildDesign(spec: DesignSpec): Design {
  const phrase = spec.phrase.trim().length > 0 ? spec.phrase.trim() : "CIPHER TEES";
  const palette = PALETTES[spec.paletteId] ?? PALETTES.signal;
  const shirt = SHIRT_COLORS[spec.shirtColorId] ?? SHIRT_COLORS.white;

  const seed = hashString(`${phrase.toLowerCase()}::${palette.id}`);
  const rand = mulberry32(seed);
  const codes = Array.from(phrase).map((c) => c.charCodeAt(0));

  const bars: Bar[] = [];
  for (let i = 0; i < BAR_COUNT; i++) {
    const angle = (360 / BAR_COUNT) * i;
    const c0 = codes[i % codes.length];
    const c1 = codes[(i + 1) % codes.length];
    const c2 = codes[(i + 3) % codes.length];
    const base = ((c0 * 7 + c1 * 3 + c2) % 97) / 97; // 0..1, driven by the text
    const jitter = rand(); // deterministic per-seed variance for an organic look
    const value = clamp(0.22 + base * 0.55 + jitter * 0.23, 0.08, 1);
    const colorIndex = Math.floor((i / BAR_COUNT) * palette.colors.length) % palette.colors.length;
    bars.push({ angle, length: value, color: palette.colors[colorIndex] });
  }

  const patternCode = seed.toString(36).toUpperCase().slice(0, 7).padStart(7, "0");

  return {
    bars,
    discColor: shirt.dark ? hexWithAlpha(palette.colors[0], 0.16) : hexWithAlpha(palette.colors[palette.colors.length - 1], 0.14),
    ringColor: palette.colors[palette.colors.length - 1],
    textColor: shirt.dark ? "#f6f5f0" : "#161616",
    phraseDisplay: phrase.toUpperCase(),
    patternCode,
  };
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function hexWithAlpha(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
