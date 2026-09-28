// Shared design renderer. Produces the Nightloom print artwork as an SVG
// string in fixed print units (viewBox 0 0 4680 5790 — the exact pixel
// resolution Prodigi wants for the Bella+Canvas 3001 front print area).
// The storefront preview and the print file come from this one function,
// so WYSIWYG is guaranteed.

import { buildSky } from './sky';
import { PALETTES, type PaletteId } from './palettes';
import { formatDateLong, formatCoords } from './format';
import type { DesignParams } from './types';

export const DESIGN_W = 4680;
export const DESIGN_H = 5790;

const CX = 2340;
const CY = 2210;
const R_MAP = 2050;
const R_RING = 2130;
const R_HAIR = 2172;
const R_CARD = 2290;

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function nameFontSize(name: string): number {
  const len = Math.max(1, name.length);
  // width ≈ fs * (0.62 + 0.10 letterSpacing) * len must fit 4300 units
  return Math.min(300, Math.floor(4300 / (0.72 * len)));
}

export function buildDesignSvg(params: DesignParams): string {
  const pal = PALETTES[params.palette as PaletteId] ?? PALETTES.midnight;
  const sky = buildSky({
    date: params.date,
    time: params.time,
    lat: params.lat,
    lng: params.lng,
    radius: R_MAP,
    showLines: params.showLines,
    showLabels: params.showLabels,
  });

  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${DESIGN_W} ${DESIGN_H}" width="${DESIGN_W}" height="${DESIGN_H}">`
  );

  // ---- defs ----
  parts.push('<defs>');
  parts.push(
    `<linearGradient id="disc" x1="0" y1="0" x2="0" y2="1">` +
      `<stop offset="0" stop-color="${pal.disc[0]}"/>` +
      `<stop offset="0.55" stop-color="${pal.disc[1]}"/>` +
      `<stop offset="1" stop-color="${pal.disc[2]}"/>` +
      `</linearGradient>`
  );
  parts.push(
    `<radialGradient id="vig" gradientUnits="userSpaceOnUse" cx="${CX}" cy="${CY}" r="${R_MAP}">` +
      `<stop offset="0.5" stop-color="#04081c" stop-opacity="0"/>` +
      `<stop offset="0.82" stop-color="#04081c" stop-opacity="${(pal.vignette * 0.55).toFixed(2)}"/>` +
      `<stop offset="1" stop-color="#04081c" stop-opacity="${pal.vignette.toFixed(2)}"/>` +
      `</radialGradient>`
  );
  parts.push(
    `<clipPath id="discClip"><circle cx="${CX}" cy="${CY}" r="${R_MAP}"/></clipPath>`
  );
  parts.push('</defs>');

  // ---- sky disc ----
  parts.push(`<circle cx="${CX}" cy="${CY}" r="${R_MAP}" fill="url(#disc)"/>`);
  parts.push(`<g clip-path="url(#discClip)">`);

  // alt/az grid
  const gridStroke = `stroke="${pal.grid}" stroke-opacity="${pal.gridOpacity}" stroke-width="2" fill="none"`;
  parts.push(`<circle cx="${CX}" cy="${CY}" r="${(R_MAP / 3).toFixed(1)}" ${gridStroke}/>`);
  parts.push(`<circle cx="${CX}" cy="${CY}" r="${((R_MAP * 2) / 3).toFixed(1)}" ${gridStroke}/>`);
  for (let a = 0; a < 360; a += 30) {
    const rad = (a * Math.PI) / 180;
    const x = CX - R_MAP * Math.sin(rad);
    const y = CY - R_MAP * Math.cos(rad);
    parts.push(
      `<line x1="${CX}" y1="${CY}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" ${gridStroke}/>`
    );
  }

  // constellation lines (single path)
  if (sky.segments.length) {
    let d = '';
    for (const s of sky.segments) {
      d += `M${(CX + s.x1).toFixed(1)} ${(CY + s.y1).toFixed(1)}L${(CX + s.x2).toFixed(1)} ${(
        CY + s.y2
      ).toFixed(1)}`;
    }
    parts.push(
      `<path d="${d}" fill="none" stroke="${pal.line}" stroke-opacity="${pal.lineOpacity}" stroke-width="5.5" stroke-linecap="round"/>`
    );
  }

  // stars
  for (const st of sky.stars) {
    const x = (CX + st.x).toFixed(1);
    const y = (CY + st.y).toFixed(1);
    if (st.bright >= 1) {
      parts.push(
        `<circle cx="${x}" cy="${y}" r="${(st.r * 2.8).toFixed(1)}" fill="${st.color}" fill-opacity="0.10"/>`
      );
      parts.push(
        `<circle cx="${x}" cy="${y}" r="${(st.r * 1.75).toFixed(1)}" fill="${st.color}" fill-opacity="0.16"/>`
      );
    }
    const coreOpacity = st.mag > 4 ? 0.78 : 0.94;
    parts.push(
      `<circle cx="${x}" cy="${y}" r="${st.r.toFixed(1)}" fill="${st.color}" fill-opacity="${coreOpacity}"/>`
    );
    if (st.bright === 2) {
      const L = st.r * 4.5;
      const sw = 'stroke-width="4"';
      const spike = `stroke="${st.color}" stroke-opacity="0.32" ${sw} stroke-linecap="round"`;
      parts.push(
        `<line x1="${(CX + st.x - L).toFixed(1)}" y1="${y}" x2="${(CX + st.x + L).toFixed(
          1
        )}" y2="${y}" ${spike}/>`
      );
      parts.push(
        `<line x1="${x}" y1="${(CY + st.y - L).toFixed(1)}" x2="${x}" y2="${(
          CY + st.y + L
        ).toFixed(1)}" ${spike}/>`
      );
    }
  }

  // constellation + star labels
  const labelAttrs = `font-family="Cinzel" font-weight="400" font-size="112" letter-spacing="11" fill="${pal.labelColor}" fill-opacity="${pal.labelOpacity}" text-anchor="middle"`;
  for (const l of sky.constellationLabels) {
    parts.push(
      `<text x="${(CX + l.x).toFixed(1)}" y="${(CY + l.y).toFixed(1)}" ${labelAttrs}>${esc(
        l.text.toUpperCase()
      )}</text>`
    );
  }
  const starLabelAttrs = `font-family="IBM Plex Mono" font-weight="300" font-size="96" letter-spacing="7" fill="${pal.labelColor}" fill-opacity="${Math.min(
    0.7,
    pal.labelOpacity + 0.18
  )}" text-anchor="start"`;
  for (const l of sky.starLabels) {
    parts.push(
      `<text x="${(CX + l.x).toFixed(1)}" y="${(CY + l.y).toFixed(1)}" ${starLabelAttrs}>${esc(
        l.text
      )}</text>`
    );
  }

  // vignette
  parts.push(`<circle cx="${CX}" cy="${CY}" r="${R_MAP}" fill="url(#vig)"/>`);
  parts.push('</g>');

  // ---- rings & ticks ----
  parts.push(
    `<circle cx="${CX}" cy="${CY}" r="${R_MAP}" fill="none" stroke="${pal.ring}" stroke-opacity="${
      pal.ringOpacity * 0.9
    }" stroke-width="4"/>`
  );
  parts.push(
    `<circle cx="${CX}" cy="${CY}" r="${R_RING}" fill="none" stroke="${pal.ring}" stroke-opacity="${
      pal.ringOpacity * 0.7
    }" stroke-width="3"/>`
  );
  parts.push(
    `<circle cx="${CX}" cy="${CY}" r="${R_HAIR}" fill="none" stroke="${pal.ring}" stroke-opacity="${
      pal.ringOpacity * 0.35
    }" stroke-width="2"/>`
  );
  for (let a = 0; a < 360; a += 5) {
    const major = a % 15 === 0;
    const rad = (a * Math.PI) / 180;
    const sx = -Math.sin(rad);
    const sy = -Math.cos(rad);
    const r1 = R_RING + 12;
    const r2 = major ? R_HAIR - 4 : R_HAIR - 16;
    parts.push(
      `<line x1="${(CX + sx * r1).toFixed(1)}" y1="${(CY + sy * r1).toFixed(
        1
      )}" x2="${(CX + sx * r2).toFixed(1)}" y2="${(CY + sy * r2).toFixed(1)}" stroke="${
        pal.ring
      }" stroke-opacity="${major ? pal.ringOpacity * 0.75 : pal.ringOpacity * 0.4}" stroke-width="${
        major ? 3 : 2
      }"/>`
    );
  }

  // cardinal letters (sky-view orientation: N up, E left)
  const cardAttrs = `font-family="IBM Plex Mono" font-weight="400" font-size="100" letter-spacing="0" fill="${pal.text}" fill-opacity="0.5" text-anchor="middle"`;
  parts.push(`<text x="${CX}" y="${CY - R_CARD}" dy="35" ${cardAttrs}>N</text>`);
  parts.push(`<text x="${CX - R_CARD}" y="${CY}" dy="35" ${cardAttrs}>E</text>`);
  parts.push(`<text x="${CX}" y="${CY + R_CARD}" dy="35" ${cardAttrs}>S</text>`);
  parts.push(`<text x="${CX + R_CARD}" y="${CY}" dy="35" ${cardAttrs}>W</text>`);

  // ---- text block ----
  const dividerY = 4640;
  parts.push(
    `<line x1="${CX - 980}" y1="${dividerY}" x2="${CX - 150}" y2="${dividerY}" stroke="${
      pal.accent
    }" stroke-opacity="0.65" stroke-width="3"/>`
  );
  parts.push(
    `<line x1="${CX + 150}" y1="${dividerY}" x2="${CX + 980}" y2="${dividerY}" stroke="${
      pal.accent
    }" stroke-opacity="0.65" stroke-width="3"/>`
  );
  parts.push(
    `<rect x="${CX - 24}" y="${dividerY - 24}" width="48" height="48" transform="rotate(45 ${CX} ${dividerY})" fill="${
      pal.accent
    }" fill-opacity="0.85"/>`
  );

  const name = params.name.trim().toUpperCase();
  const nfs = nameFontSize(name);
  parts.push(
    `<text x="${CX}" y="5010" font-family="Cinzel" font-weight="700" font-size="${nfs}" letter-spacing="${Math.round(
      nfs * 0.1
    )}" fill="${pal.text}" text-anchor="middle">${esc(name)}</text>`
  );

  const caption = params.caption.trim().toUpperCase();
  if (caption) {
    parts.push(
      `<text x="${CX}" y="5270" font-family="IBM Plex Mono" font-weight="300" font-size="118" letter-spacing="44" fill="${
        pal.textSoft
      }" fill-opacity="0.85" text-anchor="middle">${esc(caption)}</text>`
    );
  }

  const dateLine = `${formatDateLong(params.date)} · ${params.time}`;
  parts.push(
    `<text x="${CX}" y="5490" font-family="IBM Plex Mono" font-weight="400" font-size="130" letter-spacing="26" fill="${
      pal.text
    }" fill-opacity="0.95" text-anchor="middle">${esc(dateLine)}</text>`
  );

  const placeLine = `${params.placeLabel.trim().toUpperCase()} · ${formatCoords(
    params.lat,
    params.lng
  )}`;
  parts.push(
    `<text x="${CX}" y="5670" font-family="IBM Plex Mono" font-weight="300" font-size="112" letter-spacing="22" fill="${
      pal.textSoft
    }" fill-opacity="0.62" text-anchor="middle">${esc(placeLine)}</text>`
  );

  parts.push('</svg>');
  return parts.join('');
}
