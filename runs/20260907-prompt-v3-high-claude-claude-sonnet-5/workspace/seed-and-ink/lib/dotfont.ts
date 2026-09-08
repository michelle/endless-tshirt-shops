// Tiny 3x5 dot-matrix digit font, used to print the seed's serial number
// on the shirt without depending on any system/embedded font (important
// for the serverless PNG renderer, which can't assume fonts are installed).

const GLYPHS: Record<string, string[]> = {
  '0': ['111', '101', '101', '101', '111'],
  '1': ['010', '110', '010', '010', '111'],
  '2': ['111', '001', '111', '100', '111'],
  '3': ['111', '001', '111', '001', '111'],
  '4': ['101', '101', '111', '001', '001'],
  '5': ['111', '100', '111', '001', '111'],
  '6': ['111', '100', '111', '101', '111'],
  '7': ['111', '001', '001', '001', '001'],
  '8': ['111', '101', '111', '101', '111'],
  '9': ['111', '101', '111', '001', '111'],
  '-': ['000', '000', '111', '000', '000'],
  ' ': ['000', '000', '000', '000', '000'],
};

/** Draws `text` (digits, spaces, hyphens only) as filled dot-matrix blocks.
 * `dot` is the size of one pixel of the font; `gap` the space between
 * glyphs. Draws left-aligned starting at (x, y). */
export function drawDotText(
  ctx: any,
  text: string,
  x: number,
  y: number,
  dot: number,
  color: string,
  gap = dot,
): number {
  ctx.save();
  ctx.fillStyle = color;
  let cursor = x;
  for (const ch of text) {
    const glyph = GLYPHS[ch] ?? GLYPHS[' '];
    for (let row = 0; row < glyph.length; row++) {
      for (let col = 0; col < glyph[row].length; col++) {
        if (glyph[row][col] === '1') {
          ctx.fillRect(cursor + col * dot, y + row * dot, dot, dot);
        }
      }
    }
    cursor += 3 * dot + gap;
  }
  ctx.restore();
  return cursor - gap; // right edge of the rendered text
}

export function dotTextWidth(text: string, dot: number, gap = dot): number {
  return text.length * (3 * dot + gap) - gap;
}
