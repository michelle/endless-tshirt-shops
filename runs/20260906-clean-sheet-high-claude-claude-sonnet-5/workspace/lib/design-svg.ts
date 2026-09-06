import type { Shirt } from "./shirts";
import { CLASS_COLORS } from "./shirts";

const VB_W = 1000;
const VB_H = 1250;

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Rough monospace wrap: ~0.6 * fontSize per character.
function wrapLines(text: string, fontSize: number, maxWidth: number): string[] {
  const charWidth = fontSize * 0.62;
  const maxChars = Math.max(4, Math.floor(maxWidth / charWidth));
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/**
 * Builds the full-bleed print design as an SVG string. Rendered at whatever
 * pixel size the caller rasterizes it to (print file vs. storefront preview
 * both come from this same source).
 */
export function buildDesignSvg(shirt: Shirt): string {
  const classInfo = CLASS_COLORS[shirt.statusClass];
  const titleFontSize = 72;
  const titleLines = wrapLines(shirt.title, titleFontSize, 780);
  const titleStartY = 760 - ((titleLines.length - 1) * (titleFontSize * 1.05)) / 2;

  const titleTspans = titleLines
    .map(
      (line, i) =>
        `<tspan x="${VB_W / 2}" y="${titleStartY + i * titleFontSize * 1.05}">${esc(line)}</tspan>`
    )
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VB_W} ${VB_H}" width="${VB_W}" height="${VB_H}">
  <rect x="0" y="0" width="${VB_W}" height="${VB_H}" fill="${shirt.bg}"/>
  <rect x="60" y="60" width="${VB_W - 120}" height="${VB_H - 120}" rx="28" fill="none" stroke="${shirt.fg}" stroke-opacity="0.22" stroke-width="3"/>

  <text x="${VB_W / 2}" y="230" text-anchor="middle" font-family="ui-monospace, Menlo, Consolas, monospace" font-weight="600" font-size="42" letter-spacing="14" fill="${shirt.fg}" fill-opacity="0.6">HTTP/1.1</text>

  <text x="${VB_W / 2}" y="560" text-anchor="middle" font-family="ui-monospace, Menlo, Consolas, monospace" font-weight="800" font-size="320" fill="${shirt.fg}">${esc(shirt.code)}</text>

  <rect x="${VB_W / 2 - 120}" y="608" width="240" height="10" fill="${shirt.accent}"/>

  <text font-family="ui-monospace, Menlo, Consolas, monospace" font-weight="700" font-size="${titleFontSize}" letter-spacing="4" fill="${shirt.fg}" text-anchor="middle">${titleTspans}</text>

  <g>
    <rect x="${VB_W / 2 - 210}" y="960" width="420" height="64" rx="32" fill="${shirt.accent}"/>
    <text x="${VB_W / 2}" y="1002" text-anchor="middle" font-family="ui-monospace, Menlo, Consolas, monospace" font-weight="700" font-size="28" letter-spacing="3" fill="${shirt.bg}">${esc(shirt.statusClass.toUpperCase())} &#183; ${esc(classInfo.label.toUpperCase())}</text>
  </g>

  <rect x="${VB_W / 2 - 100}" y="1096" width="200" height="2" fill="${shirt.fg}" fill-opacity="0.3"/>
  <text x="${VB_W / 2}" y="1150" text-anchor="middle" font-family="ui-monospace, Menlo, Consolas, monospace" font-weight="600" font-size="26" letter-spacing="10" fill="${shirt.fg}" fill-opacity="0.55">STATUS / CODE</text>
</svg>`;
}
