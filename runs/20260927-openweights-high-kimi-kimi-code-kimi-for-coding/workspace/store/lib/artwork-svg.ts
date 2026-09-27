// Pure (client-safe) artwork builders: dictionary-card SVG and tee mockup SVG.
import {
  accentById,
  colorById,
  editionNumber,
  inkForColor,
  type DesignInput,
} from "./design";

// Print area for GLOBAL-TEE-BC-3001 "front": 4680 x 5790 px @300dpi.
export const ART_W = 4680;
export const ART_H = 5790;

export function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if (cur && cur.length + w.length + 1 > maxChars) {
      lines.push(cur);
      cur = w;
    } else {
      cur = cur ? `${cur} ${w}` : w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

const FONT = "'Playfair Display', serif";
const CENTER = ART_W / 2;

export function buildArtworkSvg(d: DesignInput): string {
  const color = colorById(d.color);
  const accent = accentById(d.accent);
  const ink = inkForColor(color);
  const accentHex = color.dark ? shade(accent.hex, 60) : accent.hex;
  const word = d.word.toUpperCase();
  const wordSize =
    word.length <= 5 ? 700 : word.length <= 8 ? 590 : word.length <= 11 ? 490 : 400;
  const defLines = wrapText(d.definition, 40);
  const exLines = wrapText(d.example, 44);
  const edition = editionNumber(d.word, d.definition);
  const year = d.year ?? new Date().getFullYear();

  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${ART_W}" height="${ART_H}" viewBox="0 0 ${ART_W} ${ART_H}">`
  );

  // Double-rule dictionary card frame
  parts.push(
    `<rect x="400" y="380" width="${ART_W - 800}" height="${ART_H - 760}" fill="none" stroke="${ink}" stroke-width="14"/>`,
    `<rect x="452" y="432" width="${ART_W - 904}" height="${ART_H - 864}" fill="none" stroke="${ink}" stroke-width="5"/>`
  );

  // Corner diamonds on the inner frame
  for (const [cx, cy] of [
    [452, 432],
    [ART_W - 452, 432],
    [452, ART_H - 432],
    [ART_W - 452, ART_H - 432],
  ]) {
    parts.push(
      `<path d="M ${cx} ${cy - 26} L ${cx + 26} ${cy} L ${cx} ${cy + 26} L ${cx - 26} ${cy} Z" fill="${accentHex}"/>`
    );
  }

  // Top microline
  parts.push(
    `<text x="${CENTER}" y="790" text-anchor="middle" font-family="${FONT}" font-size="86" letter-spacing="34" fill="${ink}">PERSONAL DICTIONARY</text>`,
    `<line x1="${CENTER - 620}" y1="880" x2="${CENTER + 620}" y2="880" stroke="${ink}" stroke-width="5"/>`,
    `<path d="M ${CENTER} 848 L ${CENTER + 32} 880 L ${CENTER} 912 L ${CENTER - 32} 880 Z" fill="${accentHex}"/>`
  );

  // Headword
  parts.push(
    `<text x="${CENTER}" y="2010" text-anchor="middle" font-family="${FONT}" font-weight="700" font-size="${wordSize}" fill="${ink}">${esc(word)}</text>`,
    `<text x="${CENTER}" y="2330" text-anchor="middle" font-family="${FONT}" font-style="italic" font-size="185" fill="${ink}">- ${esc(d.word.toLowerCase())} -</text>`,
    `<text x="${CENTER}" y="2660" text-anchor="middle" font-family="${FONT}" font-style="italic" font-size="160" fill="${accentHex}">${esc(d.pos)}.</text>`
  );

  // Definition
  let y = 3000;
  const lh = 235;
  for (const line of defLines) {
    parts.push(
      `<text x="${CENTER}" y="${y}" text-anchor="middle" font-family="${FONT}" font-size="152" fill="${ink}">${esc(line)}</text>`
    );
    y += lh;
  }

  // Example sentence
  y += 100;
  for (const line of exLines) {
    parts.push(
      `<text x="${CENTER}" y="${y}" text-anchor="middle" font-family="${FONT}" font-style="italic" font-size="136" fill="${ink}">${esc(line)}</text>`
    );
    y += 208;
  }

  // Bottom microline
  parts.push(
    `<line x1="${CENTER - 900}" y1="5110" x2="${CENTER + 900}" y2="5110" stroke="${ink}" stroke-width="4"/>`,
    `<text x="${CENTER}" y="5290" text-anchor="middle" font-family="${FONT}" font-size="92" letter-spacing="22" fill="${ink}">EST. ${year} -- No. ${edition}</text>`
  );

  parts.push("</svg>");
  return parts.join("\n");
}

// Simple tee mockup (front view) with the artwork placed on the chest.
export function buildMockupSvg(d: DesignInput): string {
  const color = colorById(d.color);
  const darker = shade(color.hex, -22);
  const artwork = buildArtworkSvg(d);
  const scale = 172 / ART_W;
  const ax = (400 - 172) / 2;
  const ay = 132;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 460" width="400" height="460">
  <path d="M128 64 Q200 118 272 64 L360 116 L342 174 L288 148 L288 418 L112 418 L112 148 L58 174 L40 116 Z" fill="${color.hex}" stroke="${darker}" stroke-width="3"/>
  <path d="M128 64 Q200 118 272 64" fill="none" stroke="${darker}" stroke-width="7" stroke-linecap="round"/>
  <path d="M58 168 L112 142 M288 142 L342 168 M118 412 L282 412" stroke="${darker}" stroke-width="2" stroke-dasharray="5 4" fill="none" opacity="0.7"/>
  <g transform="translate(${ax},${ay}) scale(${scale})">${artwork.replace(/<\/?svg[^>]*>/g, "")}</g>
</svg>`;
}

function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  const r = clamp((n >> 16) + amt);
  const g = clamp(((n >> 8) & 0xff) + amt);
  const b = clamp((n & 0xff) + amt);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

export function artworkQueryString(d: DesignInput): string {
  const p = new URLSearchParams({
    w: d.word,
    p: d.pos,
    d: d.definition,
    e: d.example,
    c: d.color,
    a: d.accent,
  });
  if (d.year) p.set("y", String(d.year));
  return p.toString();
}
