// Convert text glyphs to inline SVG paths using opentype.js.
//
// Sharp on Vercel's serverless image can't reliably fetch external fonts
// through @font-face (its libRSVG does not honour the absolute or
// relative URLs we set). So we bake the glyphs into the SVG as paths.
// The SVG stays thin, the printed tee renders identically to the on-screen
// preview, and no font installation is needed on the rendering host.

import path from "node:path";
import opentype from "opentype.js";

const FONT_DIR = path.join(process.cwd(), "lib", "fonts");

let _serif: opentype.Font | null = null;
let _mono: opentype.Font | null = null;

function serif(): opentype.Font {
  if (!_serif) _serif = opentype.loadSync(path.join(FONT_DIR, "eb-garamond.ttf"));
  return _serif;
}
function mono(): opentype.Font {
  if (!_mono) _mono = opentype.loadSync(path.join(FONT_DIR, "jetbrains-mono.ttf"));
  return _mono;
}

export type FontKind = "serif" | "mono";

export interface TextOpts {
  font: FontKind;
  fontSize: number;
  /** Extra horizontal spacing in design px after every glyph (we apply this via a translate on each glyph segment). */
  letterSpacing?: number;
  /** Apply a faux-italic skew transform (EB Garamond has no real italic). */
  italic?: boolean;
  /** Horizontal position in SVG coordinates (the centerpoint when anchor is "middle", the left edge otherwise). */
  x: number;
  /** Baseline Y in SVG coordinates. */
  y: number;
  anchor?: "start" | "middle" | "end";
}

interface ShapeInfo {
  path: opentype.Path;
  width: number;
}

const CACHE = new Map<string, ShapeInfo>();

function shapeFor(input: string, opts: TextOpts): ShapeInfo {
  const font = opts.font === "mono" ? mono() : serif();
  const fontSize = Math.max(8, Math.round(opts.fontSize));
  const key = [
    opts.font,
    fontSize,
    opts.letterSpacing ?? 0,
    input,
  ].join("|");
  const cached = CACHE.get(key);
  if (cached) return cached;
  const p = (opts.font === "mono" ? mono() : serif()).getPath(input, 0, 0, fontSize, {
    kerning: true,
  });
  const bbox = p.getBoundingBox();
  const info: ShapeInfo = { path: p, width: bbox.x2 - bbox.x1 };
  CACHE.set(key, info);
  return info;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Render a text run as an SVG `<path d="…">` string. The path is placed
 * in absolute coordinates. The baseline lands at `opts.y`, and the text
 * is positioned per `opts.anchor`.
 *
 * `opts.x` is treated as the centre when anchor=`middle` (the default),
 * the left edge when anchor=`start`, and the right edge when anchor=`end`.
 *
 * We bake the requested letter-spacing in by translating every subsequent
 * path command by `(letterSpacing * glyphIndex)`. opentype itself doesn't
 * expose a CSS-style `letter-spacing` for arbitrary text.
 */
export function textPath(text: string, opts: TextOpts): string {
  if (text.length === 0) return "";
  const info = shapeFor(text, opts);
  const width = info.width + Math.max(0, text.length - 1) * (opts.letterSpacing ?? 0);
  const dx =
    opts.anchor === "end"
      ? opts.x - width
      : opts.anchor === "start"
        ? opts.x
        : opts.x - width / 2;

  const dy = opts.y;
  const ls = opts.letterSpacing ?? 0;
  const italicSkew = opts.italic ? -Math.atan(0.18) : 0;

  const cmds = info.path.commands;
  const out: string[] = [];
  let glyphStart = 0;
  let glyphIndex = 0;

  for (let i = 0; i < cmds.length; i++) {
    const cmd = cmds[i];
    // Detect glyph boundaries: opentype closes each glyph with a Z then
    // the next M starts a new one. We treat a Z (close) followed by a non-M
    // as an internal subpath within a glyph, but a Z followed by M as a
    // glyph break.
    if (cmd.type === "M" && i > 0 && cmds[i - 1].type === "Z") {
      glyphIndex++;
      glyphStart = i;
    }

    const xShift = dx + glyphIndex * ls;
    // Italic skew: shear x by y magnitude.
    const skew = italicSkew;

    switch (cmd.type) {
      case "M":
        out.push(
          `M ${round(xShift + cmd.x + cmd.y * skew)} ${round(dy + cmd.y)}`,
        );
        break;
      case "L":
        out.push(
          `L ${round(xShift + cmd.x + cmd.y * skew)} ${round(dy + cmd.y)}`,
        );
        break;
      case "C":
        out.push(
          `C ${round(xShift + cmd.x + cmd.y * skew)} ${round(dy + cmd.y)} ` +
          `${round(xShift + cmd.x1 + cmd.y1 * skew)} ${round(dy + cmd.y1)} ` +
          `${round(xShift + cmd.x2 + cmd.y2 * skew)} ${round(dy + cmd.y2)}`,
        );
        break;
      case "Q":
        out.push(
          `Q ${round(xShift + cmd.x1 + cmd.y1 * skew)} ${round(dy + cmd.y1)} ` +
          `${round(xShift + cmd.x + cmd.y * skew)} ${round(dy + cmd.y)}`,
        );
        break;
      case "Z":
        // close path; no coordinates.
        out.push("Z");
        break;
    }
  }

  return out.join(" ");
}

/** Width of the rendered string at the given font size, in design px. */
export function measureText(text: string, opts: TextOpts): number {
  if (text.length === 0) return 0;
  const info = shapeFor(text, opts);
  return info.width + Math.max(0, text.length - 1) * (opts.letterSpacing ?? 0);
}

/** Static hashing so the cache survives between calls. */
export function _dropTextCache(): void {
  CACHE.clear();
}
