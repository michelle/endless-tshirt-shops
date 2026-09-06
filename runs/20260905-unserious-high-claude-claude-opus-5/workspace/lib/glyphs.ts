/**
 * Seven-segment digit geometry, defined once and shared by:
 *   - the live on-shirt preview (rendered as SVG <path> elements), and
 *   - the print-ready PNG generator (rasterised from the same polygons).
 *
 * Sharing the geometry is the whole point: what ticks on screen is exactly
 * what Prodigi prints, down to the bevel on every segment.
 */

export type Point = readonly [number, number];
export type Polygon = readonly Point[];

/** Design units. One digit occupies DIGIT_W x DIGIT_H. */
export const DIGIT_W = 100;
export const DIGIT_H = 180;
/** Horizontal space between adjacent digits. */
export const DIGIT_TRACKING = 26;
/** Advance width from one digit's origin to the next. */
export const DIGIT_ADVANCE = DIGIT_W + DIGIT_TRACKING;

const T = 19; // segment thickness
const G = 4; // gap between adjacent segments

/** A horizontal segment spanning x0..x1, with its top edge at y. */
function hSeg(x0: number, x1: number, y: number): Polygon {
  const a = x0 + G;
  const b = x1 - G;
  const h = T / 2;
  return [
    [a + h, y],
    [b - h, y],
    [b, y + h],
    [b - h, y + T],
    [a + h, y + T],
    [a, y + h],
  ];
}

/** A vertical segment spanning y0..y1, with its left edge at x. */
function vSeg(x: number, y0: number, y1: number): Polygon {
  const a = y0 + G;
  const b = y1 - G;
  const h = T / 2;
  return [
    [x + h, a],
    [x + T, a + h],
    [x + T, b - h],
    [x + h, b],
    [x, b - h],
    [x, a + h],
  ];
}

const MID_Y = (DIGIT_H - T) / 2;
const RIGHT_X = DIGIT_W - T;

/** The seven segments, in the conventional a-g naming. */
const SEGMENTS = {
  a: hSeg(0, DIGIT_W, 0),
  b: vSeg(RIGHT_X, 0, MID_Y + T),
  c: vSeg(RIGHT_X, MID_Y, DIGIT_H),
  d: hSeg(0, DIGIT_W, DIGIT_H - T),
  e: vSeg(0, MID_Y, DIGIT_H),
  f: vSeg(0, 0, MID_Y + T),
  g: hSeg(0, DIGIT_W, MID_Y),
} as const;

export type SegmentName = keyof typeof SEGMENTS;
export const SEGMENT_NAMES = Object.keys(SEGMENTS) as SegmentName[];

/** Which segments are lit for each digit. */
const LIT: Record<string, readonly SegmentName[]> = {
  '0': ['a', 'b', 'c', 'd', 'e', 'f'],
  '1': ['b', 'c'],
  '2': ['a', 'b', 'g', 'e', 'd'],
  '3': ['a', 'b', 'g', 'c', 'd'],
  '4': ['f', 'g', 'b', 'c'],
  '5': ['a', 'f', 'g', 'c', 'd'],
  '6': ['a', 'f', 'g', 'e', 'c', 'd'],
  '7': ['a', 'b', 'c'],
  '8': ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
  '9': ['a', 'b', 'c', 'd', 'f', 'g'],
};

export function isLit(digit: string, segment: SegmentName): boolean {
  return LIT[digit]?.includes(segment) ?? false;
}

/** SVG path data for one segment, offset to a digit slot at `originX`. */
export function segmentPath(segment: SegmentName, originX = 0): string {
  const poly = SEGMENTS[segment];
  return (
    poly.map((p, i) => `${i === 0 ? 'M' : 'L'}${(p[0] + originX).toFixed(2)} ${p[1].toFixed(2)}`).join('') + 'Z'
  );
}

/** Overall bounding box of a rendered string of `length` digits. */
export function textSize(length: number) {
  return {
    width: length > 0 ? length * DIGIT_ADVANCE - DIGIT_TRACKING : 0,
    height: DIGIT_H,
  };
}

/**
 * Every lit polygon for `text`, laid out left-to-right in design units with
 * the origin at the top-left of the first digit. Non-digit characters
 * advance the cursor without drawing.
 */
export function textPolygons(text: string): Polygon[] {
  const out: Polygon[] = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const lit = LIT[ch];
    if (!lit) continue;
    const dx = i * DIGIT_ADVANCE;
    for (const name of lit) {
      out.push(SEGMENTS[name].map(([x, y]) => [x + dx, y] as Point));
    }
  }
  return out;
}
