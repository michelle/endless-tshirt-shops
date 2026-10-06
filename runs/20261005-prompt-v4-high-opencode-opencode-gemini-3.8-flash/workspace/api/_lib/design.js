'use strict';
const fs = require('fs');
const path = require('path');
const { load } = require('./data');
const { julianDate, gmstDeg, altAz, moonPhase, project } = require('./astro');

const DW = 1000;
const DH = (DW * 5881) / 4677; // 1257.43, matches the BC 3001 front print area

const PALETTES = {
  dark: { ink: '#F4EFE3', accent: '#E7C879', line: '#9FB4D8' },
  light: { ink: '#1B2340', accent: '#A9762B', line: '#5A6B8C' },
};

let wasmReady = null;
let fontBuffers = null;

function assetsDir() {
  return path.join(__dirname, '..', '_assets');
}

async function ensureReady() {
  if (!wasmReady) {
    const { initWasm } = require('@resvg/resvg-wasm');
    const wasmPath = require.resolve('@resvg/resvg-wasm/index_bg.wasm');
    wasmReady = initWasm(fs.readFileSync(wasmPath));
  }
  await wasmReady;
  if (!fontBuffers) {
    const dir = path.join(assetsDir(), 'fonts');
    fontBuffers = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.ttf'))
      .map((f) => fs.readFileSync(path.join(dir, f)));
  }
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function wrap(text, maxChars, maxLines) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = '';
  for (const w of words) {
    if (!cur) cur = w;
    else if ((cur + ' ' + w).length <= maxChars) cur += ' ' + w;
    else {
      lines.push(cur);
      cur = w;
    }
    if (maxLines && lines.length === maxLines) break;
  }
  if (cur && (!maxLines || lines.length < maxLines)) lines.push(cur);
  return lines.slice(0, maxLines || 99);
}

function formatDate(d) {
  const m = String(d || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return String(d || '');
  const months = ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];
  return `${Number(m[3])} ${months[Number(m[2]) - 1]} ${m[1]}`;
}

// SVG path for the illuminated fraction of the Moon.
function moonPath(cx, cy, R, phase) {
  const a = 2 * Math.PI * phase;
  const k = Math.cos(a);
  const waxing = phase < 0.5;
  const rx = Math.max(0.0001, Math.abs(k) * R);
  const limbSweep = waxing ? 1 : 0;
  const termSweep = k > 0 ? limbSweep : waxing ? 0 : 1;
  return (
    `M ${cx} ${cy - R} ` +
    `A ${R} ${R} 0 0 ${limbSweep} ${cx} ${cy + R} ` +
    `A ${rx} ${R} 0 0 ${termSweep} ${cx} ${cy - R} Z`
  );
}

function buildSvg(spec) {
  const pal = PALETTES[spec.k] || PALETTES.dark;
  const { flat, segs } = load();

  // Resolve the instant in UTC. spec.o is the local UTC offset in minutes.
  const [y, mo, d] = String(spec.d).split('-').map(Number);
  const [hh, mm] = String(spec.t).split(':').map(Number);
  const localAsUtc = Date.UTC(y, (mo || 1) - 1, d || 1, hh || 0, mm || 0);
  const utcMs = localAsUtc - (Number(spec.o) || 0) * 60000;
  const jd = julianDate(utcMs);
  const lst = (gmstDeg(jd) + Number(spec.lo)) % 360;

  const cx = DW / 2;
  const cy = 660;
  const R = 320;

  let stars = '';
  for (const [ra, dec, mag, bv] of flat) {
    const { alt, az } = altAz(ra, dec, Number(spec.la), lst);
    if (alt <= 0) continue;
    const p = project(alt, az, R);
    const x = cx + p.x;
    const yv = cy + p.y;
    let r = 0.45 + (6.2 - mag) * 0.45;
    if (r < 0.35) r = 0.35;
    let color = pal.ink;
    if (bv != null) {
      if (bv < 0.15) color = spec.k === 'dark' ? '#CFE0FF' : '#33508F';
      else if (bv > 1.35) color = spec.k === 'dark' ? '#FFD9A8' : '#9A5A22';
    }
    const op = mag < 3.5 ? 1 : mag < 5 ? 0.85 : 0.62;
    if (mag < 1.6) {
      stars += `<circle cx="${x.toFixed(2)}" cy="${yv.toFixed(2)}" r="${(r * 3.1).toFixed(2)}" fill="${color}" opacity="0.10"/>`;
    }
    stars += `<circle cx="${x.toFixed(2)}" cy="${yv.toFixed(2)}" r="${r.toFixed(2)}" fill="${color}" opacity="${op}"/>`;
    if (mag < 1.6) {
      const s = r * 3.2;
      stars +=
        `<g stroke="${color}" stroke-width="0.5" opacity="0.5">` +
        `<line x1="${(x - s).toFixed(2)}" y1="${yv.toFixed(2)}" x2="${(x + s).toFixed(2)}" y2="${yv.toFixed(2)}"/>` +
        `<line x1="${x.toFixed(2)}" y1="${(yv - s).toFixed(2)}" x2="${x.toFixed(2)}" y2="${(yv + s).toFixed(2)}"/>` +
        `</g>`;
    }
  }

  let lines = '';
  for (const [a, b] of segs) {
    const A = altAz(a[0], a[1], Number(spec.la), lst);
    const B = altAz(b[0], b[1], Number(spec.la), lst);
    if (A.alt <= 0 || B.alt <= 0) continue;
    const pa = project(A.alt, A.az, R);
    const pb = project(B.alt, B.az, R);
    lines += `<line x1="${(cx + pa.x).toFixed(1)}" y1="${(cy + pa.y).toFixed(1)}" x2="${(cx + pb.x).toFixed(1)}" y2="${(cy + pb.y).toFixed(1)}" stroke="${pal.line}" stroke-width="0.7" opacity="0.26"/>`;
  }

  // Horizon ring + ticks + cardinal labels.
  let ring = `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${pal.accent}" stroke-width="2" opacity="0.9"/>`;
  ring += `<circle cx="${cx}" cy="${cy}" r="${R - 9}" fill="none" stroke="${pal.accent}" stroke-width="0.8" opacity="0.35"/>`;
  for (let deg = 0; deg < 360; deg += 10) {
    const a = (deg * Math.PI) / 180;
    const long = deg % 90 === 0;
    const len = long ? 12 : deg % 30 === 0 ? 8 : 4;
    const x1 = cx - Math.sin(a) * R;
    const y1 = cy - Math.cos(a) * R;
    const x2 = cx - Math.sin(a) * (R + len);
    const y2 = cy - Math.cos(a) * (R + len);
    ring += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${pal.accent}" stroke-width="0.8" opacity="${long ? 0.8 : 0.35}"/>`;
  }
  const cardinals = [
    ['N', 0],
    ['E', 90],
    ['S', 180],
    ['W', 270],
  ];
  for (const [ch, deg] of cardinals) {
    const a = (deg * Math.PI) / 180;
    const x = cx - Math.sin(a) * (R + 34);
    const y = cy - Math.cos(a) * (R + 34);
    ring += `<text x="${x.toFixed(1)}" y="${(y + 8).toFixed(1)}" font-family="Lato" font-size="24" fill="${pal.accent}" text-anchor="middle" letter-spacing="1">${ch}</text>`;
  }
  ring += `<circle cx="${cx}" cy="${cy}" r="1.6" fill="${pal.ink}" opacity="0.5"/>`;

  // Moon phase icon.
  const mp = moonPhase(jd);
  const moonR = 15;
  const moonX = DW / 2 - 62;
  const moonY = 1206;
  const moon = `<circle cx="${DW / 2 - 46}" cy="${moonY}" r="${moonR}" fill="none" stroke="${pal.ink}" stroke-width="1" opacity="0.55"/>` +
    `<path d="${moonPath(DW / 2 - 46, moonY, moonR - 1.5, mp.phase)}" fill="${pal.ink}" opacity="0.9"/>`;
  const moonLabel = `${Math.round(mp.illum * 100)}% moon`;

  // Caption.
  const capLines = wrap(spec.c, 26, 2);
  let cap = '';
  const capSize = capLines.length > 1 ? 54 : 62;
  capLines.forEach((ln, i) => {
    cap += `<text x="${DW / 2}" y="${170 + i * (capSize + 8)}" font-family="Crimson Text" font-size="${capSize}" font-weight="600" fill="${pal.ink}" text-anchor="middle" letter-spacing="0.5">${esc(ln)}</text>`;
  });

  const names = spec.n ? wrap(spec.n, 34, 1)[0] : '';
  const namesEl = names
    ? `<text x="${DW / 2}" y="1062" font-family="Crimson Text" font-size="46" font-weight="600" fill="${pal.ink}" text-anchor="middle">${esc(names)}</text>`
    : '';
  const place = wrap(spec.p, 40, 1)[0] || '';
  const dateLabel = `${formatDate(spec.d)}  ·  ${esc(spec.t)}`;
  const coordLabel = `${Math.abs(Number(spec.la)).toFixed(2)}° ${Number(spec.la) >= 0 ? 'N' : 'S'}  ·  ${Math.abs(Number(spec.lo)).toFixed(2)}° ${Number(spec.lo) >= 0 ? 'E' : 'W'}`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${spec.width}" height="${(spec.width * 5881) / 4677}" viewBox="0 0 ${DW} ${DH}">
  <g>
    <text x="${DW / 2}" y="66" font-family="Lato" font-size="17" font-weight="700" fill="${pal.ink}" opacity="0.5" text-anchor="middle" letter-spacing="8">UNDER SAME SKY</text>
    ${cap}
  </g>
  <g>
    ${ring}
    ${lines}
    ${stars}
  </g>
  <g>
    ${namesEl}
    <text x="${DW / 2}" y="1120" font-family="Lato" font-size="27" font-weight="400" fill="${pal.ink}" text-anchor="middle" letter-spacing="3">${esc(place.toUpperCase())}</text>
    <text x="${DW / 2}" y="1158" font-family="Lato" font-size="20" fill="${pal.ink}" opacity="0.8" text-anchor="middle" letter-spacing="2">${dateLabel}</text>
    <text x="${DW / 2}" y="1186" font-family="Lato" font-size="16" fill="${pal.ink}" opacity="0.6" text-anchor="middle" letter-spacing="2">${coordLabel}</text>
    ${moon}
    <text x="${DW / 2 + 18}" y="${moonY + 5}" font-family="Lato" font-size="15" fill="${pal.ink}" opacity="0.6" text-anchor="middle" letter-spacing="1">${moonLabel}</text>
  </g>
  <g>
    <line x1="${DW / 2 - 40}" y1="1232" x2="${DW / 2 + 40}" y2="1232" stroke="${pal.accent}" stroke-width="0.8" opacity="0.5"/>
    <text x="${DW / 2}" y="1252" font-family="Lato" font-size="13" fill="${pal.ink}" opacity="0.45" text-anchor="middle" letter-spacing="4">PERSONALISED STAR MAP</text>
  </g>
</svg>`;
  return svg;
}

async function renderPng(spec, width) {
  await ensureReady();
  const { Resvg } = require('@resvg/resvg-wasm');
  const w = Math.max(200, Math.min(4677, Math.round(width || 4677)));
  const svg = buildSvg({ ...spec, width: w });
  const resvg = new Resvg(svg, {
    font: { loadSystemFonts: false, fontBuffers },
    fitTo: { mode: 'width', value: w },
  });
  return Buffer.from(resvg.render().asPng());
}

module.exports = { renderPng, buildSvg, PALETTES };
