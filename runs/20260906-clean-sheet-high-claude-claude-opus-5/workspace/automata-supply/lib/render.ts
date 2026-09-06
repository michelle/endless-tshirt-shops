import { encodeIndexedPng, type Palette } from "./png";
import { evolve } from "./ca";
import { drawText, textWidth, GLYPH_H } from "./font";
import { INKS, designTitle, type Design } from "./design";

/**
 * Gradient inks are quantised into this many palette entries. Flat bands would
 * show as stripes below ~16; above ~32 the PNG gains nothing a garment printer
 * can reproduce.
 */
const RAMP_STEPS = 28;

function buildPalette(design: Design, background?: [number, number, number]): Palette {
  const ink = INKS[design.ink];
  const [a, b] = ink.stops;
  const solid = a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
  const steps = solid ? 1 : RAMP_STEPS;

  // Index 0 is the ground. For print it stays transparent so only live cells
  // take ink and the fabric shows through; flattening it to the garment colour
  // is only for contexts that cannot show transparency, like Stripe Checkout.
  const palette: Palette = background
    ? [{ rgb: background, alpha: 255 }]
    : [{ rgb: [0, 0, 0], alpha: 0 }];
  for (let i = 0; i < steps; i++) {
    const t = steps === 1 ? 0 : i / (steps - 1);
    palette.push({
      rgb: [
        Math.round(a[0] + (b[0] - a[0]) * t),
        Math.round(a[1] + (b[1] - a[1]) * t),
        Math.round(a[2] + (b[2] - a[2]) * t),
      ],
      alpha: 255,
    });
  }
  return palette;
}

export type Layout = {
  width: number;
  height: number;
  /** Fraction of the canvas height above the artwork. */
  topPad: number;
  /** Fraction of the canvas width kept clear on each side. */
  sidePad: number;
  caption: boolean;
  /** Flatten the transparent ground to this RGB instead. */
  background?: [number, number, number];
};

/** Full Gildan 64000 front print area, at ~250 dpi over the 15.6in width. */
export const PRINT_LAYOUT: Layout = {
  width: 3000,
  height: 3758,
  topPad: 0.06,
  sidePad: 0.05,
  caption: true,
};

/** Just the lattice, edge to edge — used for icons and small thumbnails. */
export function bareLayout(size: number): Layout {
  return { width: size, height: size, topPad: 0, sidePad: 0, caption: false };
}

export function previewLayout(width: number): Layout {
  return {
    width,
    height: Math.round((width * PRINT_LAYOUT.height) / PRINT_LAYOUT.width),
    topPad: PRINT_LAYOUT.topPad,
    sidePad: PRINT_LAYOUT.sidePad,
    caption: true,
  };
}

export function renderDesign(design: Design, layout: Layout): Buffer {
  const { width: W, height: H } = layout;
  const palette = buildPalette(design, layout.background);
  const rampSteps = palette.length - 1;

  const buf = new Uint8Array(W * H); // all zeroes == fully transparent

  const availW = Math.floor(W * (1 - layout.sidePad * 2));
  const cellPx = Math.max(1, Math.floor(availW / design.cells));
  const artSize = cellPx * design.cells;
  const artX = Math.floor((W - artSize) / 2);
  const artY = Math.floor(H * layout.topPad);

  const rows = evolve(design.rule, design.cells, design.cells, design.seed, design.seeding);

  for (let g = 0; g < rows.length; g++) {
    const row = rows[g];
    // One palette index per generation: the ramp reads top-to-bottom.
    const ci =
      rampSteps === 1
        ? 1
        : 1 + Math.min(rampSteps - 1, Math.floor((g / rows.length) * rampSteps));

    const y0 = artY + g * cellPx;
    for (let x = 0; x < row.length; x++) {
      if (!row[x]) continue;
      const px0 = artX + x * cellPx;
      for (let dy = 0; dy < cellPx; dy++) {
        const py = y0 + dy;
        if (py < 0 || py >= H) continue;
        buf.fill(ci, py * W + px0, py * W + px0 + cellPx);
      }
    }
  }

  if (layout.caption) {
    const label = `${designTitle(design).toUpperCase()} * ${
      design.seeding === "single" ? "SINGLE CELL" : `SEED ${design.seed}`
    }`;
    // Scale the caption off the artwork width so it holds its proportions at
    // both preview and print resolution.
    const scale = Math.max(1, Math.round(artSize / 260));
    const tw = textWidth(label, scale);
    const tx = Math.floor((W - tw) / 2);
    const ty = artY + artSize + Math.round(artSize * 0.055);
    if (ty + GLYPH_H * scale < H) {
      drawText(buf, W, H, tx, ty, label, scale, rampSteps === 1 ? 1 : rampSteps);
    }
  }

  return encodeIndexedPng(W, H, buf, palette, 250);
}
