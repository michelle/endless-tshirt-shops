import { encodePng } from "./png";
import type { Design } from "./design";
import type { WaveformStyle } from "./catalog";

// Print file spec: 3000x3600 px (roughly 10x12 in at 300dpi) RGBA on transparent.
// Generous internal margins mean Prodigi's "fillPrintArea" scaling can't crop the art.
export const PRINT_WIDTH = 3000;
export const PRINT_HEIGHT = 3600;

const BAND_X = 0.14; // band left edge as fraction of canvas width
const BAND_W = 0.72; // band width fraction
const BAND_Y = 0.33; // band top edge fraction
const BAND_H = 0.34; // band height fraction

export function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

interface Profile {
  center: number; // y of line center, px
  half: number; // for fill style: half height px
}

/** Shared column profile so client preview and server print look identical. */
export function columnProfile(
  samples: number[],
  style: WaveformStyle,
  aspect: number
): (x: number) => Profile {
  const bandH = PRINT_HEIGHT * BAND_H;
  const dampen = Math.min(1, 4.5 / aspect);
  return (x: number) => {
    // linear interpolation into samples
    const f = Math.max(0, Math.min(1, x)) * (samples.length - 1);
    const i = Math.floor(f);
    const t = f - i;
    const a = samples[i] ?? 0;
    const b = samples[Math.min(i + 1, samples.length - 1)] ?? 0;
    const amp = a + (b - a) * t;
    if (style === "fill") {
      const half = (0.06 + 0.44 * amp) * bandH * dampen;
      return { center: 0, half };
    }
    const swing = (amp - 0.5) * bandH * 0.86 * dampen;
    return { center: swing, half: 0 };
  };
}

export function renderPrintPng(design: Design): Buffer {
  const { width, height } = { width: PRINT_WIDTH, height: PRINT_HEIGHT };
  const bandX0 = Math.round(width * BAND_X);
  const bandW = Math.round(width * BAND_W);
  const bandYMid = Math.round(height * (BAND_Y + BAND_H / 2));
  const profile = columnProfile(design.samples, design.style, bandW / (height * BAND_H));
  const [r, g, b] = hexToRgb(design.ink);

  const px = new Uint8Array(width * height * 4);
  const setPx = (x: number, y: number) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const o = (y * width + x) * 4;
    px[o] = r;
    px[o + 1] = g;
    px[o + 2] = b;
    px[o + 3] = 255;
  };

  if (design.style === "line") {
    const stroke = 16; // px radius-ish (column bar half height)
    for (let x = 0; x < bandW; x++) {
      const p = profile(x / (bandW - 1));
      const cy = bandYMid + p.center;
      for (let dy = -stroke; dy <= stroke; dy++) {
        // slight roundness: taper at the very ends
        const taper = Math.abs(dy) === stroke ? (x % 2 === 0 ? 1 : 0) : 1;
        if (taper) setPx(bandX0 + x, Math.round(cy + dy));
      }
    }
  } else {
    for (let x = 0; x < bandW; x++) {
      const p = profile(x / (bandW - 1));
      const y0 = Math.round(bandYMid - p.half);
      const y1 = Math.round(bandYMid + p.half);
      for (let y = y0; y <= y1; y++) setPx(bandX0 + x, y);
    }
  }

  return encodePng(width, height, px);
}
