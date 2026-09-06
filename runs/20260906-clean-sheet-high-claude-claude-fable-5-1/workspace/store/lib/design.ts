import type { DesignStyle, Ink, StatusCode } from "./catalog";

/**
 * Generates the front-print artwork as an SVG string.
 *
 * The same function drives the in-browser preview and the 300dpi print file sent
 * to Prodigi, so what the customer sees is what gets printed. Everything is laid out
 * in a fixed 4665x5844 coordinate space (the SKU's print area) and scaled by the
 * viewer. Text is monospace, so widths are computed from character counts.
 */

export const ART_W = 4665;
export const ART_H = 5844;

/** JetBrains Mono advance width is 600/1000 em. */
const CH = 0.6;

const INK_HEX: Record<Ink, string> = { white: "#ffffff", black: "#111111" };

export interface DesignOptions {
  status: StatusCode;
  style: DesignStyle;
  ink: Ink;
  /** CSS font-family for the text. Defaults to the bundled JetBrains Mono name. */
  fontFamily?: string;
  /** Optional background fill (used for mockups). Omit for a transparent print file. */
  background?: string;
  /** Extra attributes for the root <svg>, e.g. width/height/class. */
  rootAttrs?: string;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Largest font size (px) at which `text` fits in `maxWidth`, capped at `max`. */
function fitSize(text: string, maxWidth: number, max: number): number {
  const n = Math.max(text.length, 1);
  return Math.min(max, Math.floor(maxWidth / (n * CH)));
}

/** Greedy word wrap for a monospace font. */
function wrap(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length > maxChars && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = next;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

function text(x: number, y: number, size: number, weight: number, content: string, extra = ""): string {
  return `<text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" ${extra}>${esc(content)}</text>`;
}

export function designSvg(opts: DesignOptions): string {
  const { status, style, ink } = opts;
  const font = opts.fontFamily ?? "JetBrains Mono";
  const color = INK_HEX[ink];
  const margin = 320;
  const usable = ART_W - margin * 2;
  const parts: string[] = [];

  if (opts.background) {
    parts.push(`<rect width="${ART_W}" height="${ART_H}" fill="${opts.background}"/>`);
  }

  if (style === "big") {
    const code = String(status.code);
    const codeSize = fitSize(code, usable, 2400);
    const phraseSize = fitSize(status.phrase, usable, 330);
    const top = 900;
    const codeBaseline = top + codeSize * 0.73;
    const ruleY = codeBaseline + codeSize * 0.16;
    const phraseBaseline = ruleY + 140 + phraseSize * 0.75;
    parts.push(text(ART_W / 2, codeBaseline, codeSize, 800, code, 'text-anchor="middle" letter-spacing="-0.04em"'));
    parts.push(`<rect x="${margin}" y="${ruleY}" width="${usable}" height="28" fill="${color}"/>`);
    parts.push(text(ART_W / 2, phraseBaseline, phraseSize, 800, status.phrase, 'text-anchor="middle"'));
    const footY = phraseBaseline + 420;
    parts.push(text(ART_W / 2, footY, 110, 400, `HTTP/1.1 ${status.code}`, 'text-anchor="middle" opacity="0.85"'));
  } else if (style === "response") {
    const lines: { t: string; w: number; dim?: boolean }[] = [
      { t: `HTTP/1.1 ${status.code} ${status.phrase}`, w: 800 },
      { t: `Content-Type: text/plain; charset=utf-8`, w: 400 },
      { t: `Cache-Control: no-store`, w: 400 },
      { t: `Server: human/1.0`, w: 400 },
      { t: `Connection: keep-alive`, w: 400 },
    ];
    const longest = Math.max(...lines.map((l) => l.t.length), 34);
    const size = fitSize("x".repeat(longest), usable, 210);
    const lh = size * 1.55;
    let y = 1000 + size;
    for (const [i, l] of lines.entries()) {
      // status line wraps if needed (e.g. "Network Connect Timeout Error")
      if (i === 0 && l.t.length * CH * size > usable) {
        const wrapped = wrap(l.t, Math.floor(usable / (CH * size)));
        for (const wl of wrapped) {
          parts.push(text(margin, y, size, l.w, wl));
          y += lh;
        }
        continue;
      }
      parts.push(text(margin, y, size, l.w, l.t, l.dim ? 'opacity="0.7"' : ""));
      y += lh;
    }
    y += lh * 0.6;
    if (status.quip) {
      const body = wrap(status.quip, Math.floor(usable / (CH * size)));
      for (const bl of body) {
        parts.push(text(margin, y, size, 400, bl));
        y += lh;
      }
    }
    // cursor block
    parts.push(`<rect x="${margin}" y="${y - size * 0.8}" width="${size * CH}" height="${size}" fill="${color}"/>`);
  } else {
    // pocket: small print, upper-left chest region of the print area
    const size = 260;
    const x = margin + 60;
    const y = 520 + size;
    parts.push(text(x, y, size, 800, String(status.code)));
    parts.push(text(x, y + size * 1.25, Math.round(size * 0.42), 400, status.phrase.length > 22 ? status.phrase.slice(0, 21) + "…" : status.phrase, 'opacity="0.9"'));
  }

  const root = opts.rootAttrs ?? `width="${ART_W}" height="${ART_H}"`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ART_W} ${ART_H}" ${root}><g fill="${color}" font-family="${esc(font)}, ui-monospace, Menlo, monospace">${parts.join("")}</g></svg>`;
}
