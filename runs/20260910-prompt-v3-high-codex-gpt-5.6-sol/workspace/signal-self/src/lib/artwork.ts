import "server-only";
import { createHash } from "node:crypto";
import { GARMENTS, PALETTES, type Customization } from "@/lib/product";

const WIDTH = 4680;
const HEIGHT = 5790;

function xml(value: string) {
  return value.replace(/[<>&'\"]/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '\"': "&quot;" })[char] ?? char);
}

function splitPhrase(value: string) {
  const words = value.trim().toUpperCase().split(/\s+/);
  const lines: string[] = [];
  for (const word of words) {
    const current = lines.at(-1);
    if (!current || (current.length + word.length + 1 > 15 && lines.length < 2)) lines.push(word);
    else lines[lines.length - 1] = `${current} ${word}`;
  }
  return lines.slice(0, 3);
}

function contour(seed: number, layer: number) {
  const points: string[] = [];
  const radius = 970 + layer * 76;
  for (let i = 0; i <= 180; i++) {
    const angle = (i / 180) * Math.PI * 2;
    const noise = Math.sin(angle * 3 + seed * .13) * 175 + Math.sin(angle * 5 - seed * .08) * 85 + Math.cos(angle * 2 + layer * .2) * 105;
    const x = WIDTH / 2 + Math.cos(angle) * (radius + noise) * 1.08;
    const y = HEIGHT / 2 + Math.sin(angle) * (radius + noise) * 1.18;
    points.push(`${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  return `${points.join(" ")} Z`;
}

export function artworkSvg(customization: Customization) {
  const palette = PALETTES[customization.palette];
  const textColor = GARMENTS[customization.garment].text;
  const seed = createHash("sha256").update(`${customization.phrase}|${customization.detail}`).digest().readUInt32BE(0);
  const lines = splitPhrase(customization.phrase);
  const fontSize = lines.some((line) => line.length > 13) ? 300 : 360;
  const startY = HEIGHT / 2 - ((lines.length - 1) * fontSize * .5);
  const paths = Array.from({ length: 16 }, (_, index) => `<path d="${contour(seed, index)}" opacity="${(.93 - index * .045).toFixed(2)}"/>`).join("");
  const text = lines.map((line, index) => `<text x="2340" y="${startY + index * fontSize * .96}" class="signal">${xml(line)}</text>`).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
    <defs>
      <linearGradient id="signalGradient" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${palette.start}"/><stop offset="1" stop-color="${palette.end}"/></linearGradient>
      <filter id="softGlow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="7" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      <style>.signal{font-family:Arial,Helvetica,sans-serif;font-size:${fontSize}px;font-weight:800;letter-spacing:-12px;text-anchor:middle;fill:${textColor};paint-order:stroke;stroke:${customization.garment === "white" ? "#f5f4ef" : "#05070b"};stroke-width:22px}.detail{font-family:monospace;font-size:92px;font-weight:700;letter-spacing:11px;text-anchor:middle;fill:${textColor}}</style>
    </defs>
    <g fill="none" stroke="url(#signalGradient)" stroke-width="24" filter="url(#softGlow)" stroke-linejoin="round">${paths}</g>
    ${text}
    <text x="2340" y="${startY + lines.length * fontSize + 88}" class="detail">${xml(customization.detail.toUpperCase())}</text>
    <text x="4320" y="5440" class="detail" font-size="68" opacity=".72">ONE / ONE</text>
  </svg>`;
}
