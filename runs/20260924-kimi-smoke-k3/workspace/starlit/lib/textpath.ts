// Server-only: renders text as SVG vector paths using the bundled
// Josefin Sans font, so print PNGs do not depend on system fonts.

import * as opentype from "opentype.js";
import { JOSEFIN_TTF_BASE64 } from "./fonts/josefin-b64";
import type { TextRenderer } from "./starmap";

let font: opentype.Font | null = null;

function getFont(): opentype.Font {
  if (!font) {
    const buf = Buffer.from(JOSEFIN_TTF_BASE64, "base64");
    font = opentype.parse(
      buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
    );
  }
  return font;
}

interface PathCommand {
  type: string;
  x?: number;
  y?: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
}

const r2 = (v: number) => Math.round(v * 100) / 100;

// opentype's own toPathData() emits "NaN" for coordinates whose float
// representation is exponential (e.g. 1e-7), so we serialize ourselves.
function pathData(commands: PathCommand[]): string {
  return commands
    .map((c) => {
      switch (c.type) {
        case "M":
          return `M${r2(c.x!)} ${r2(c.y!)}`;
        case "L":
          return `L${r2(c.x!)} ${r2(c.y!)}`;
        case "C":
          return `C${r2(c.x1!)} ${r2(c.y1!)} ${r2(c.x2!)} ${r2(c.y2!)} ${r2(c.x!)} ${r2(c.y!)}`;
        case "Q":
          return `Q${r2(c.x1!)} ${r2(c.y1!)} ${r2(c.x!)} ${r2(c.y!)}`;
        case "Z":
          return "Z";
        default:
          return "";
      }
    })
    .join("");
}

export const pathTextRenderer: TextRenderer = (o) => {
  const f = getFont();
  const text = o.text.toUpperCase();
  const scale = o.size / f.unitsPerEm;
  let width = 0;
  for (const ch of text) {
    const g = f.charToGlyph(ch);
    width += g.advanceWidth! * scale + o.tracking;
  }
  if (text.length > 0) width -= o.tracking;
  let cursor =
    o.anchor === "middle" ? o.x - width / 2 : o.anchor === "end" ? o.x - width : o.x;
  const ds: string[] = [];
  for (const ch of text) {
    const g = f.charToGlyph(ch);
    // Round the cursor: float noise (e.g. 97.00000000000001) makes
    // opentype.js emit NaN coordinates in the path data.
    const cx = Math.round(cursor * 100) / 100;
    const p = g.getPath(cx, o.y, o.size);
    ds.push(pathData(p.commands as unknown as PathCommand[]));
    cursor += g.advanceWidth! * scale + o.tracking;
  }
  return (
    `<path d="${ds.join(" ")}" fill="${o.fill}"` +
    (o.opacity != null ? ` opacity="${o.opacity}"` : "") +
    `/>`
  );
};
