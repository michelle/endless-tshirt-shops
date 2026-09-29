// Server-side print artwork renderer: builds the 2480x3507 px PNG that
// Prodigi prints on the shirt front, from the same sky math as the preview.

import fs from "node:fs";
import path from "node:path";
import { Resvg } from "@resvg/resvg-js";
import { computeSky, starRadius, starColor, type SkyResult } from "./sky";
import type { DesignParams } from "./design";

export const PRINT_WIDTH = 2480;
export const PRINT_HEIGHT = 3507;

const CX = PRINT_WIDTH / 2;
const CY = 1340;
const R = 1150;

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const months = [
    "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
    "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
  ];
  return `${months[m - 1]} ${d}, ${y}`;
}

function fmtCoord(lat: number, lon: number): string {
  const la = `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? "N" : "S"}`;
  const lo = `${Math.abs(lon).toFixed(4)}° ${lon >= 0 ? "E" : "W"}`;
  return `${la} — ${lo}`;
}

export function buildSvg(design: DesignParams, sky: SkyResult): string {
  const darkShirt = design.color !== "white";
  const textMain = darkShirt ? "#f2ede1" : "#141b33";
  const textSoft = darkShirt ? "#c8a94e" : "#8a6d1f";
  const ring = "#c8a94e";

  const starEls: string[] = [];
  for (const s of sky.stars) {
    const px = CX + s.x * R;
    const py = CY + s.y * R;
    const pr = Math.max(1.1, starRadius(s.mag) * R);
    const alpha = Math.min(1, Math.max(0.35, 1.15 - s.mag / 5.5));
    starEls.push(
      `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${pr.toFixed(1)}" fill="${starColor(s.bv)}" opacity="${alpha.toFixed(2)}"/>`
    );
  }

  const lineEls: string[] = [];
  for (const line of sky.lines) {
    const d = line.points
      .map((p, i) => `${i === 0 ? "M" : "L"}${(CX + p.x * R).toFixed(1)},${(CY + p.y * R).toFixed(1)}`)
      .join(" ");
    lineEls.push(
      `<path d="${d}" fill="none" stroke="rgba(147,168,230,0.4)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>`
    );
  }

  const cardinals = [
    { label: "N", x: CX, y: CY - R - 46, anchor: "middle" },
    { label: "S", x: CX, y: CY + R + 74, anchor: "middle" },
    { label: "E", x: CX - R - 52, y: CY + 16, anchor: "middle" },
    { label: "W", x: CX + R + 52, y: CY + 16, anchor: "middle" },
  ]
    .map(
      (c) =>
        `<text x="${c.x}" y="${c.y}" text-anchor="${c.anchor}" font-family="Montserrat" font-weight="500" font-size="44" letter-spacing="4" fill="${textSoft}" opacity="0.9">${c.label}</text>`
    )
    .join("");

  const title = esc(design.title);
  const subtitle = esc(`${fmtDate(design.date)}  ·  ${design.place.toUpperCase()}`);
  const coords = esc(`${fmtCoord(design.lat, design.lon)}  ·  ${design.time} LOCAL`);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${PRINT_WIDTH}" height="${PRINT_HEIGHT}" viewBox="0 0 ${PRINT_WIDTH} ${PRINT_HEIGHT}">
  <defs>
    <radialGradient id="sky" cx="50%" cy="42%" r="65%">
      <stop offset="0%" stop-color="#1b2447"/>
      <stop offset="55%" stop-color="#111834"/>
      <stop offset="100%" stop-color="#080d20"/>
    </radialGradient>
    <clipPath id="disc"><circle cx="${CX}" cy="${CY}" r="${R}"/></clipPath>
  </defs>

  <circle cx="${CX}" cy="${CY}" r="${R}" fill="url(#sky)"/>
  <g clip-path="url(#disc)">
    <circle cx="${CX}" cy="${CY}" r="${(R / 3).toFixed(0)}" fill="none" stroke="rgba(147,168,230,0.16)" stroke-width="2"/>
    <circle cx="${CX}" cy="${CY}" r="${((2 * R) / 3).toFixed(0)}" fill="none" stroke="rgba(147,168,230,0.16)" stroke-width="2"/>
    ${lineEls.join("\n    ")}
    ${starEls.join("\n    ")}
  </g>
  <circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="${ring}" stroke-width="6"/>
  <circle cx="${CX}" cy="${CY}" r="${R + 18}" fill="none" stroke="${ring}" stroke-width="2" opacity="0.55"/>

  ${cardinals}

  <text x="${CX}" y="2890" text-anchor="middle" font-family="Cormorant Garamond" font-weight="600" font-size="128" fill="${textMain}">${title}</text>
  <text x="${CX}" y="3010" text-anchor="middle" font-family="Montserrat" font-weight="500" font-size="46" letter-spacing="10" fill="${textMain}">${subtitle}</text>
  <text x="${CX}" y="3095" text-anchor="middle" font-family="Montserrat" font-weight="400" font-size="36" letter-spacing="6" fill="${textSoft}">${coords}</text>
</svg>`;
}

function fontFiles(): string[] {
  const dir = path.join(process.cwd(), "fonts");
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".ttf"))
    .map((f) => path.join(dir, f));
}

export function renderArtworkPng(design: DesignParams): Buffer {
  const sky = computeSky(design);
  const svg = buildSvg(design, sky);
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: PRINT_WIDTH },
    font: { fontFiles: fontFiles(), loadSystemFonts: false },
    background: "rgba(0,0,0,0)",
  });
  return resvg.render().asPng();
}
