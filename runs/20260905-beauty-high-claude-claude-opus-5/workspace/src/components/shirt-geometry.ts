/**
 * The shirt is drawn, not photographed. Both silhouettes come out of the same
 * parametric function so they are symmetric by construction, and switching fit
 * only moves numbers around.
 *
 * All measurements are half-widths from the centre line, in a 600 x 700 box.
 */

export const SHIRT_VIEW = { width: 600, height: 700 };

export type Silhouette = {
  /** Half the width of the neck opening. */
  neckHalf: number;
  /** Where the shoulder seam meets the collar. */
  neckY: number;
  /** How far the front neckline scoops below that. */
  neckDepth: number;
  shoulderHalf: number;
  shoulderY: number;
  /** Outermost point of the sleeve. */
  sleeveHalf: number;
  sleeveTopY: number;
  /** Half-width at the sleeve opening, and where it sits. */
  cuffHalf: number;
  cuffY: number;
  /** Underarm point. */
  chestHalf: number;
  armpitY: number;
  waistHalf: number;
  waistY: number;
  hemHalf: number;
  hemY: number;
  hemSag: number;
};

export const SILHOUETTES: Record<"unisex" | "fitted", Silhouette> = {
  unisex: {
    neckHalf: 74,
    neckY: 106,
    neckDepth: 40,
    shoulderHalf: 138,
    shoulderY: 120,
    sleeveHalf: 272,
    sleeveTopY: 178,
    cuffHalf: 248,
    cuffY: 306,
    chestHalf: 200,
    armpitY: 278,
    waistHalf: 196,
    waistY: 434,
    hemHalf: 200,
    hemY: 596,
    hemSag: 20,
  },
  fitted: {
    neckHalf: 76,
    neckY: 108,
    neckDepth: 54,
    shoulderHalf: 124,
    shoulderY: 122,
    sleeveHalf: 244,
    sleeveTopY: 174,
    cuffHalf: 222,
    cuffY: 280,
    chestHalf: 180,
    armpitY: 256,
    waistHalf: 160,
    waistY: 428,
    hemHalf: 170,
    hemY: 576,
    hemSag: 15,
  },
};

const CX = SHIRT_VIEW.width / 2;
const L = (x: number) => CX - x;
const R = (x: number) => CX + x;
const n = (v: number) => Math.round(v * 10) / 10;

/**
 * Outline, anticlockwise from the left of the collar: over the shoulder, out
 * along the sleeve, back under the arm, down the side, across the hem, and
 * up the other half. Finishes with the front neckline scoop.
 */
export function bodyPath(s: Silhouette) {
  const half = (side: (x: number) => number) =>
    [
      // collar -> shoulder point: a shallow, almost straight seam
      `C${n(side(s.neckHalf + 26))} ${n(s.neckY + 2)} ${n(side(s.shoulderHalf - 30))} ${n(s.shoulderY - 5)} ${n(side(s.shoulderHalf))} ${n(s.shoulderY)}`,
      // shoulder -> sleeve tip: the cap, bowed very slightly upward
      `C${n(side(s.shoulderHalf + 62))} ${n(s.shoulderY + 6)} ${n(side(s.sleeveHalf - 30))} ${n(s.sleeveTopY - 26)} ${n(side(s.sleeveHalf))} ${n(s.sleeveTopY)}`,
      // outer edge of the sleeve down to the opening
      `C${n(side(s.sleeveHalf + 4))} ${n(s.sleeveTopY + 44)} ${n(side(s.sleeveHalf - 6))} ${n(s.cuffY - 34)} ${n(side(s.cuffHalf))} ${n(s.cuffY)}`,
      // the sleeve opening, cutting back in to the underarm
      `L${n(side(s.chestHalf + 22))} ${n(s.armpitY + 16)}`,
      `C${n(side(s.chestHalf + 12))} ${n(s.armpitY + 8)} ${n(side(s.chestHalf + 4))} ${n(s.armpitY + 4)} ${n(side(s.chestHalf))} ${n(s.armpitY)}`,
      // side seam
      `C${n(side(s.waistHalf + 8))} ${n(s.armpitY + 90)} ${n(side(s.waistHalf))} ${n(s.waistY)} ${n(side(s.hemHalf))} ${n(s.hemY)}`,
    ].join("");

  return [
    `M${n(L(s.neckHalf))} ${n(s.neckY)}`,
    half(L),
    // hem, sagging a little in the middle
    `C${n(L(s.hemHalf * 0.42))} ${n(s.hemY + s.hemSag)} ${n(R(s.hemHalf * 0.42))} ${n(s.hemY + s.hemSag)} ${n(R(s.hemHalf))} ${n(s.hemY)}`,
    reverse(s),
    `C${n(R(s.neckHalf - 6))} ${n(s.neckY + s.neckDepth)} ${n(L(s.neckHalf - 6))} ${n(s.neckY + s.neckDepth)} ${n(L(s.neckHalf))} ${n(s.neckY)}`,
    "Z",
  ].join("");
}

/** The right half, walked backwards from the hem up to the collar. */
function reverse(s: Silhouette) {
  return [
    `C${n(R(s.waistHalf))} ${n(s.waistY)} ${n(R(s.waistHalf + 8))} ${n(s.armpitY + 90)} ${n(R(s.chestHalf))} ${n(s.armpitY)}`,
    `C${n(R(s.chestHalf + 4))} ${n(s.armpitY + 4)} ${n(R(s.chestHalf + 12))} ${n(s.armpitY + 8)} ${n(R(s.chestHalf + 22))} ${n(s.armpitY + 16)}`,
    `L${n(R(s.cuffHalf))} ${n(s.cuffY)}`,
    `C${n(R(s.sleeveHalf - 6))} ${n(s.cuffY - 34)} ${n(R(s.sleeveHalf + 4))} ${n(s.sleeveTopY + 44)} ${n(R(s.sleeveHalf))} ${n(s.sleeveTopY)}`,
    `C${n(R(s.sleeveHalf - 30))} ${n(s.sleeveTopY - 26)} ${n(R(s.shoulderHalf + 62))} ${n(s.shoulderY + 6)} ${n(R(s.shoulderHalf))} ${n(s.shoulderY)}`,
    `C${n(R(s.shoulderHalf - 30))} ${n(s.shoulderY - 5)} ${n(R(s.neckHalf + 26))} ${n(s.neckY + 2)} ${n(R(s.neckHalf))} ${n(s.neckY)}`,
  ].join("");
}

/** The front neckline, drawn open so it can be stroked as a ribbed collar. */
export function collarPath(s: Silhouette) {
  return `M${n(L(s.neckHalf))} ${n(s.neckY)}C${n(L(s.neckHalf - 6))} ${n(s.neckY + s.neckDepth)} ${n(R(s.neckHalf - 6))} ${n(s.neckY + s.neckDepth)} ${n(R(s.neckHalf))} ${n(s.neckY)}`;
}

/** Armhole seams: shoulder point down to the underarm. */
export function seamPaths(s: Silhouette) {
  const arm = (side: (x: number) => number) =>
    `M${n(side(s.shoulderHalf))} ${n(s.shoulderY)}C${n(side(s.shoulderHalf + 18))} ${n(s.shoulderY + 46)} ${n(side(s.chestHalf + 16))} ${n(s.armpitY - 56)} ${n(side(s.chestHalf))} ${n(s.armpitY)}`;
  return [arm(L), arm(R)];
}

/** Dashed topstitching at the hem and around each sleeve opening. */
export function stitchPaths(s: Silhouette) {
  const inset = 15;
  const hem = `M${n(L(s.hemHalf - 3))} ${n(s.hemY - inset)}C${n(L(s.hemHalf * 0.42))} ${n(s.hemY + s.hemSag - inset)} ${n(R(s.hemHalf * 0.42))} ${n(s.hemY + s.hemSag - inset)} ${n(R(s.hemHalf - 3))} ${n(s.hemY - inset)}`;
  const cuff = (side: (x: number) => number) =>
    `M${n(side(s.cuffHalf + 6))} ${n(s.cuffY - 14)}L${n(side(s.chestHalf + 26))} ${n(s.armpitY + 5)}`;
  return [hem, cuff(L), cuff(R)];
}

/** A few soft creases so the cotton reads as cotton rather than as a shape. */
export function foldPaths(s: Silhouette) {
  return [
    `M${n(L(s.chestHalf - 34))} ${n(s.armpitY + 26)}C${n(L(s.chestHalf - 62))} ${n(s.waistY - 50)} ${n(L(s.chestHalf - 50))} ${n(s.waistY + 56)} ${n(L(s.hemHalf - 48))} ${n(s.hemY - 30)}`,
    `M${n(R(s.chestHalf - 48))} ${n(s.armpitY + 52)}C${n(R(s.chestHalf - 78))} ${n(s.waistY - 26)} ${n(R(s.chestHalf - 62))} ${n(s.waistY + 66)} ${n(R(s.hemHalf - 62))} ${n(s.hemY - 26)}`,
    `M${n(L(s.shoulderHalf + 18))} ${n(s.shoulderY + 30)}C${n(L(s.shoulderHalf + 34))} ${n(s.shoulderY + 74)} ${n(L(s.chestHalf + 8))} ${n(s.armpitY - 30)} ${n(L(s.chestHalf + 18))} ${n(s.armpitY + 12)}`,
    `M${n(R(s.shoulderHalf + 18))} ${n(s.shoulderY + 30)}C${n(R(s.shoulderHalf + 34))} ${n(s.shoulderY + 74)} ${n(R(s.chestHalf + 8))} ${n(s.armpitY - 30)} ${n(R(s.chestHalf + 18))} ${n(s.armpitY + 12)}`,
  ];
}

/**
 * Where the print goes, as a fraction of the SVG box — the chest area a DTG
 * printer would actually use.
 */
export function chestBox(s: Silhouette) {
  const width = s.chestHalf * 1.66;
  const top = s.neckY + s.neckDepth + 40;
  return {
    left: (CX - width / 2) / SHIRT_VIEW.width,
    top: top / SHIRT_VIEW.height,
    width: width / SHIRT_VIEW.width,
    height: (s.waistY + 70 - top) / SHIRT_VIEW.height,
  };
}
