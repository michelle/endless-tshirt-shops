// Design renderer: builds the personalized night-sky artwork as SVG.
// The same builder serves both the live browser preview and the 4000px
// print master (rasterized to PNG via resvg at fulfillment time).
//
// Composition (square canvas S, transparent background):
//   - circular star chart, stereographic zenithal projection, north up / east right
//   - double horizon ring with 5-deg azimuth ticks + cardinal letters
//   - Milky Way brightness contours, constellation figures (rank 1-2),
//     magnitude-scaled stars with subtle B-V color tints, glints on the brightest,
//     labeled bright stars, Moon with true phase & orientation, visible planets
//   - personalized typography block beneath the chart

const path = require('path');
const { SkyEngine, stereographic, moonPhaseName, moonIsWaxing, D2R, R2D } = require('./astro');
const { loadCatalog } = require('./catalog');

const FONTS_DIR = path.join(__dirname, '..', 'public', 'fonts');
const FONT_FILES = [
  'Cinzel-500.ttf', 'Cinzel-600.ttf', 'Cinzel-700.ttf',
  'Inter-400.ttf', 'Inter-500.ttf', 'Inter-600.ttf',
].map((f) => path.join(FONTS_DIR, f));

// --- Palettes ---------------------------------------------------------------
// DTG prints what we draw; transparent areas show the garment color.
// Dark garments -> warm ivory ink. Light garments -> deep navy ink.
const PALETTES = {
  dark: {
    ink: '#F5F1E6',
    faint: '#F5F1E6',
    lineOpacity: 0.42,
    mw: [0.05, 0.06, 0.075, 0.095, 0.13],
    tint: (bv) => starTintDark(bv),
  },
  light: {
    ink: '#1C2B4A',
    faint: '#1C2B4A',
    lineOpacity: 0.42,
    mw: [0.06, 0.07, 0.09, 0.11, 0.14],
    tint: () => '#1C2B4A',
  },
};

function starTintDark(bv) {
  if (bv === null || bv === undefined) return '#F5F1E6';
  if (bv <= -0.05) return '#CFE0FF';
  if (bv <= 0.15) return '#E3ECFF';
  if (bv <= 0.4) return '#F6F4EE';
  if (bv <= 0.8) return '#FDF3E3';
  if (bv <= 1.2) return '#FBE7C6';
  return '#F7D9AB';
}

// Dark garment colors (ink = ivory). Anything else prints with navy ink.
const DARK_COLORS = new Set([
  'black', 'navy blue', 'dark heather grey', 'burgundy', 'army', 'maroon',
  'purple', 'royal blue', 'asphalt', 'brown', 'military green',
]);

function paletteFor(shirtColor) {
  return DARK_COLORS.has(String(shirtColor || 'black').toLowerCase()) ? PALETTES.dark : PALETTES.light;
}

// --- Text width estimation (for auto-fit; conservative) ---------------------
function estimateWidth(text, size, spacingEm, serif) {
  let w = 0;
  const up = text.toUpperCase();
  for (const ch of up) {
    if (ch === ' ') w += serif ? 0.34 : 0.3;
    else if ('MW'.includes(ch)) w += serif ? 0.98 : 0.92;
    else if ('IJ.,·:'.includes(ch)) w += serif ? 0.4 : 0.34;
    else if ('ABCDEFGHKNOPQRSTUVXYZ0123456789'.includes(ch)) w += serif ? 0.72 : 0.66;
    else w += serif ? 0.6 : 0.56;
    w += spacingEm;
  }
  return w * size;
}

function fitSize(text, size, spacingEm, maxWidth, minSize, serif) {
  while (size > minSize && estimateWidth(text, size, spacingEm, serif) > maxWidth) size -= Math.max(1, size * 0.04);
  return size;
}

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// --- Geometry helpers --------------------------------------------------------
function unitVec(raDeg, decDeg) {
  const ra = raDeg * D2R, dec = decDeg * D2R;
  const cd = Math.cos(dec);
  return [cd * Math.cos(ra), cd * Math.sin(ra), Math.sin(dec)];
}

function normalize(v) {
  const n = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / n, v[1] / n, v[2] / n];
}

/** Unwrap a ring/polyline's RA so consecutive points don't jump across 0/360. */
function unwrapRA(points) {
  const out = [];
  let shift = 0;
  let prev = points[0][0];
  for (const [ra, dec] of points) {
    let r = ra + shift;
    while (r - prev > 180) { r -= 360; shift -= 360; }
    while (prev - r > 180) { r += 360; shift += 360; }
    prev = r;
    out.push([r, dec]);
  }
  return out;
}

const fmt = (n) => (Math.round(n * 100) / 100).toString();

// --- The renderer -------------------------------------------------------------

/**
 * @param {object} spec
 *   utcDate: Date            moment (UTC)
 *   lat, lon: number         observer position
 *   headline: string         e.g. "THE NIGHT YOU WERE BORN"
 *   dedication: string|null  small line above headline, e.g. "FOR EMMA"
 *   subline: string          e.g. "MARCH 14, 2001 · 9:42 PM · PARIS, FRANCE"
 *   coordsLine: string       e.g. "48.86° N · 2.35° E"
 *   shirtColor: string       Prodigi color attribute, e.g. "black"
 * @param {object} opts  { size = 4000, mwStep = 1, maxStars = Infinity }
 * @returns {string} SVG markup
 */
function buildSVG(spec, opts = {}) {
  const S = opts.size || 4000;
  const mwStep = opts.mwStep || 1;
  const u = (f) => f * S; // layout unit helper

  const cx = S / 2;
  const cy = u(0.42);
  const R = u(0.33);

  const palette = paletteFor(spec.shirtColor);
  const cat = loadCatalog();
  const sky = new SkyEngine(spec.utcDate, spec.lat, spec.lon);

  const parts = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">`
  );

  // defs: clip circle + glow gradients
  parts.push(`<defs>
    <clipPath id="sky"><circle cx="${fmt(cx)}" cy="${fmt(cy)}" r="${fmt(R * 0.978)}"/></clipPath>
    <radialGradient id="glow">
      <stop offset="0%" stop-color="${palette.ink}" stop-opacity="0.55"/>
      <stop offset="45%" stop-color="${palette.ink}" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="${palette.ink}" stop-opacity="0"/>
    </radialGradient>
  </defs>`);

  // ============ sky content (clipped to circle) ============
  const skyParts = [];

  // faint disk so the sky reads as slightly deeper than the garment (dark garments only)
  if (palette === PALETTES.dark) {
    skyParts.push(`<circle cx="${fmt(cx)}" cy="${fmt(cy)}" r="${fmt(R * 0.978)}" fill="${palette.ink}" fill-opacity="0.035"/>`);
  }

  // --- Milky Way contours (drawn first, under everything) ---
  sky.mwOpacities = palette.mw;
  cat.milkyway.forEach((level, li) => {
    const op = palette.mw[li] ?? 0.05;
    const paths = [];
    for (const poly of level.polys) {
      for (const ring of poly) {
        const pts = unwrapRA(ring).filter((_, i) => i % mwStep === 0);
        let d = '';
        let started = false;
        for (const [ra, dec] of pts) {
          const v = unitVec(ra, dec);
          const [px, py, pz] = sky.precess(v[0], v[1], v[2]);
          const h = sky.projectOfDate(px, py, pz);
          let st = stereographic(h.alt, h.az, R);
          if (h.alt < -8) st = { dx: st.dx / st.r * R * 1.4, dy: st.dy / st.r * R * 1.4, r: R * 1.4 };
          d += `${started ? 'L' : 'M'}${fmt(cx + st.dx)},${fmt(cy + st.dy)}`;
          started = true;
        }
        paths.push(d + 'Z');
      }
    }
    skyParts.push(`<path d="${paths.join('')}" fill="${palette.faint}" fill-opacity="${op}" stroke="none"/>`);
  });

  // --- Constellation figures (rank 1-2) ---
  const lineSegs = [];
  for (const c of cat.lines) {
    if (c.rank > 2) continue;
    for (const seg of c.segs) {
      const pts = unwrapRA(seg);
      let run = [];
      const flush = () => {
        if (run.length >= 2) {
          let d = '';
          run.forEach((p, i) => { d += `${i ? 'L' : 'M'}${fmt(cx + p.dx)},${fmt(cy + p.dy)}`; });
          lineSegs.push(d);
        }
        run = [];
      };
      for (let i = 0; i < pts.length - 1; i++) {
        const v1 = unitVec(pts[i][0], pts[i][1]);
        const v2 = unitVec(pts[i + 1][0], pts[i + 1][1]);
        // chord-sample so long segments curve correctly on the projection
        const dot = Math.max(-1, Math.min(1, v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2]));
        const ang = Math.acos(dot) * R2D;
        const n = Math.max(2, Math.ceil(ang / 4));
        for (let k = 0; k <= n; k++) {
          const t = k / n;
          const v = normalize([v1[0] + (v2[0] - v1[0]) * t, v1[1] + (v2[1] - v1[1]) * t, v1[2] + (v2[2] - v1[2]) * t]);
          const [px, py, pz] = sky.precess(v[0], v[1], v[2]);
          const h = sky.projectOfDate(px, py, pz);
          if (h.alt > -0.6) {
            const st = stereographic(h.alt, h.az, R);
            run.push({ dx: st.dx, dy: st.dy });
          } else {
            flush();
          }
        }
      }
      flush();
    }
  }
  if (lineSegs.length) {
    skyParts.push(
      `<path d="${lineSegs.join('')}" fill="none" stroke="${palette.ink}" stroke-opacity="${palette.lineOpacity}" stroke-width="${fmt(S / 1150)}" stroke-linecap="round" stroke-linejoin="round"/>`
    );
  }

  // --- Stars ---
  const glints = [];
  const glows = [];
  const dots = [];
  const labelCands = [];
  const starLimit = opts.maxStars || Infinity;
  let drawn = 0;
  for (const s of cat.stars) {
    if (drawn >= starLimit) break;
    const [ra, dec, mag, bv, name] = s;
    const h = sky.project(ra, dec);
    if (h.alt <= -0.5) continue;
    const st = stereographic(h.alt, h.az, R);
    const x = cx + st.dx, y = cy + st.dy;
    if (st.r > R * 0.985) continue; // keep dots inside the ring
    drawn++;
    const t = Math.max(0.06, Math.min(1, (6.8 - mag) / 8.3));
    const r = R * (0.0019 + 0.0122 * Math.pow(t, 2.4));
    const color = palette.tint(bv);
    dots.push(`<circle cx="${fmt(x)}" cy="${fmt(y)}" r="${fmt(r)}" fill="${color}"/>`);
    if (mag <= 1.75) {
      const gr = Math.max(r * 4.6, R * 0.02);
      glows.push(`<circle cx="${fmt(x)}" cy="${fmt(y)}" r="${fmt(gr)}" fill="url(#glow)"/>`);
    }
    if (mag <= 0.6) {
      const L = r * 7, w = Math.max(r / 2.4, S / 3000);
      glints.push(
        `<g stroke="${palette.ink}" stroke-opacity="0.45" stroke-width="${fmt(w)}" stroke-linecap="round">
           <line x1="${fmt(x - L)}" y1="${fmt(y)}" x2="${fmt(x + L)}" y2="${fmt(y)}"/>
           <line x1="${fmt(x)}" y1="${fmt(y - L)}" x2="${fmt(x)}" y2="${fmt(y + L)}"/>
         </g>`
      );
    }
    if (name && mag <= 1.9 && h.alt >= 6) labelCands.push({ name, mag, x, y, r, st });
  }
  skyParts.push(glows.join(''));
  skyParts.push(dots.join(''));
  skyParts.push(glints.join(''));

  // --- Bright-star name labels ---
  labelCands.sort((a, b) => a.mag - b.mag);
  const labelSize = S / 98;
  const ls = labelSize * 0.16;
  const labels = labelCands.slice(0, 12).map((c) => {
    const outward = c.st.r < R * 0.84;
    const off = c.r + labelSize * 0.85;
    const a = Math.atan2(c.y - cy, c.x - cx);
    const lx = c.x + (outward ? Math.cos(a) * off : -Math.cos(a) * off);
    const ly = c.y + (outward ? Math.sin(a) * off : -Math.sin(a) * off);
    const anchor = Math.abs(Math.cos(a)) < 0.25 ? 'middle' : (outward ? (Math.cos(a) > 0 ? 'start' : 'end') : (Math.cos(a) > 0 ? 'end' : 'start'));
    const baseline = Math.sin(a) * labelSize * 0.35;
    return `<text x="${fmt(lx)}" y="${fmt(ly + baseline)}" font-family="Cinzel" font-weight="500" font-size="${fmt(labelSize)}" letter-spacing="${fmt(ls)}" fill="${palette.ink}" fill-opacity="0.88" text-anchor="${anchor}" dx="${fmt(ls / 2)}">${esc(c.name.toUpperCase())}</text>`;
  });
  skyParts.push(labels.join(''));

  // --- Moon ---
  const moon = sky.moon();
  if (moon.alt > -1) {
    const st = stereographic(Math.max(moon.alt, 0.5), moon.az, R);
    if (st.r < R * 0.97) {
      const mx = cx + st.dx, my = cy + st.dy;
      const mr = R * 0.0205;
      const f = moon.phaseFraction;
      if (f < 0.015) {
        // new moon: faint outline ring only
        skyParts.push(`<circle cx="${fmt(mx)}" cy="${fmt(my)}" r="${fmt(mr)}" fill="none" stroke="${palette.ink}" stroke-opacity="0.35" stroke-width="${fmt(S / 2200)}"/>`);
      } else {
        // orientation: lit side faces the sun (project sun even if below horizon)
        const sun = sky.sun();
        const sunSt = stereographic(Math.max(sun.alt, -80), sun.az, R);
        const theta = Math.atan2((cy + sunSt.dy) - my, (cx + sunSt.dx) - mx);
        const PA = moon.phaseAngle * D2R;
        const cosPA = Math.cos(PA);
        if (f > 0.985) {
          skyParts.push(`<circle cx="${fmt(mx)}" cy="${fmt(my)}" r="${fmt(mr)}" fill="${palette.ink}"/>`);
        } else {
          const ux = Math.cos(theta), uy = Math.sin(theta);
          // perpendicular
          const px = -uy, py = ux;
          const A = [mx + px * mr, my + py * mr];
          const B = [mx - px * mr, my - py * mr];
          const rx = mr * Math.abs(cosPA);
          const rotDeg = Math.atan2(py, px) * R2D;
          // lit semicircle from A through the sun-facing point to B, then terminator ellipse back
          const termSweep = cosPA > 0 ? 1 : 0; // gibbous bulges past center; crescent curves back
          const d =
            `M${fmt(A[0])},${fmt(A[1])} A${fmt(mr)},${fmt(mr)} 0 0 1 ${fmt(B[0])},${fmt(B[1])} ` +
            `A${fmt(rx)},${fmt(mr)} ${fmt(rotDeg)} 0 ${termSweep} ${fmt(A[0])},${fmt(A[1])}Z`;
          skyParts.push(`<path d="${d}" fill="${palette.ink}"/>`);
          skyParts.push(`<circle cx="${fmt(mx)}" cy="${fmt(my)}" r="${fmt(mr)}" fill="none" stroke="${palette.ink}" stroke-opacity="0.4" stroke-width="${fmt(S / 2600)}"/>`);
        }
        if (f > 0.05) {
          const gr = mr * 4;
          skyParts.push(`<circle cx="${fmt(mx)}" cy="${fmt(my)}" r="${fmt(gr)}" fill="url(#glow)" opacity="0.7"/>`);
        }
      }
    }
  }

  // --- Planets ---
  for (const p of sky.planets()) {
    if (p.alt < 2 || p.mag > 3) continue;
    const st = stereographic(p.alt, p.az, R);
    if (st.r > R * 0.93) continue;
    const x = cx + st.dx, y = cy + st.dy;
    const r = R * 0.0048;
    skyParts.push(`<circle cx="${fmt(x)}" cy="${fmt(y)}" r="${fmt(r * 2.6)}" fill="url(#glow)"/>`);
    skyParts.push(`<circle cx="${fmt(x)}" cy="${fmt(y)}" r="${fmt(r)}" fill="${palette.ink}"/>`);
    skyParts.push(`<circle cx="${fmt(x)}" cy="${fmt(y)}" r="${fmt(r * 2.1)}" fill="none" stroke="${palette.ink}" stroke-opacity="0.55" stroke-width="${fmt(S / 2800)}"/>`);
    const ps = S / 135;
    skyParts.push(`<text x="${fmt(x)}" y="${fmt(y + r * 2.1 + ps * 1.25)}" font-family="Inter" font-weight="500" font-size="${fmt(ps)}" letter-spacing="${fmt(ps * 0.18)}" fill="${palette.ink}" fill-opacity="0.8" text-anchor="middle" dx="${fmt(ps * 0.09)}">${esc(p.name.toUpperCase())}</text>`);
  }

  parts.push(`<g clip-path="url(#sky)">${skyParts.join('')}</g>`);

  // ============ rings, ticks, cardinals ============
  parts.push(
    `<circle cx="${fmt(cx)}" cy="${fmt(cy)}" r="${fmt(R * 1.012)}" fill="none" stroke="${palette.ink}" stroke-opacity="0.3" stroke-width="${fmt(S / 2600)}"/>`,
    `<circle cx="${fmt(cx)}" cy="${fmt(cy)}" r="${fmt(R)}" fill="none" stroke="${palette.ink}" stroke-opacity="0.92" stroke-width="${fmt(S / 560)}"/>`,
    `<circle cx="${fmt(cx)}" cy="${fmt(cy)}" r="${fmt(R * 0.978)}" fill="none" stroke="${palette.ink}" stroke-opacity="0.55" stroke-width="${fmt(S / 1800)}"/>`
  );

  const ticks = [];
  for (let a = 0; a < 360; a += 5) {
    const major = a % 30 === 0;
    const r1 = R * 0.978;
    const r2 = major ? R * 0.946 : R * 0.964;
    const rad = a * D2R;
    ticks.push(
      `<line x1="${fmt(cx + r1 * Math.sin(rad))}" y1="${fmt(cy - r1 * Math.cos(rad))}" x2="${fmt(cx + r2 * Math.sin(rad))}" y2="${fmt(cy - r2 * Math.cos(rad))}" stroke="${palette.ink}" stroke-opacity="${major ? 0.8 : 0.5}" stroke-width="${fmt(major ? S / 1500 : S / 2400)}"/>`
    );
  }
  parts.push(ticks.join(''));

  const cardSize = S / 62;
  const cardLs = cardSize * 0.14;
  const cardR = R * 1.012 + cardSize * 0.62;
  const cardinals = [
    ['N', cx, cy - cardR],
    ['E', cx + cardR, cy],
    ['S', cx, cy + cardR],
    ['W', cx - cardR, cy],
  ];
  for (const [letter, x, y] of cardinals) {
    parts.push(
      `<text x="${fmt(x)}" y="${fmt(y + cardSize * 0.35)}" font-family="Cinzel" font-weight="600" font-size="${fmt(cardSize)}" letter-spacing="${fmt(cardLs)}" fill="${palette.ink}" fill-opacity="0.92" text-anchor="middle" dx="${fmt(cardLs / 2)}">${letter}</text>`
    );
  }

  // ============ typography block ============
  const textCx = cx;
  let ty = cy + R + u(0.075);

  if (spec.dedication) {
    const ds = fitSize(spec.dedication, S / 95, 0.3, u(0.86), S / 130, false);
    const dls = ds * 0.3;
    parts.push(`<text x="${fmt(textCx)}" y="${fmt(ty)}" font-family="Inter" font-weight="500" font-size="${fmt(ds)}" letter-spacing="${fmt(dls)}" fill="${palette.ink}" fill-opacity="0.72" text-anchor="middle" dx="${fmt(dls / 2)}">${esc(spec.dedication.toUpperCase())}</text>`);
    ty += u(0.03);
  }

  // headline (up to 2 lines, auto-fit)
  const hl = String(spec.headline || '').toUpperCase().trim();
  if (hl) {
    let hs = S / 27;
    const maxW = u(0.88);
    let lines = [hl];
    if (estimateWidth(hl, hs, 0.2, true) > maxW) {
      // try a balanced 2-line wrap first
      const words = hl.split(/\s+/);
      let best = null;
      for (let i = 1; i < words.length; i++) {
        const l1 = words.slice(0, i).join(' ');
        const l2 = words.slice(i).join(' ');
        const w1 = estimateWidth(l1, hs, 0.2, true);
        const w2 = estimateWidth(l2, hs, 0.2, true);
        const score = Math.abs(w1 - w2) + Math.max(0, w1 - maxW) + Math.max(0, w2 - maxW) * 1.5;
        if (!best || score < best.score) best = { score, lines: [l1, l2] };
      }
      if (best && Math.max(estimateWidth(best.lines[0], hs, 0.2, true), estimateWidth(best.lines[1], hs, 0.2, true)) < maxW * 1.12) {
        lines = best.lines;
      }
      hs = Math.min(...lines.map((l) => fitSize(l, hs, 0.2, maxW, S / 44, true)));
    } else {
      hs = fitSize(hl, hs, 0.2, maxW, S / 44, true);
    }
    const hls = hs * 0.2;
    const lineH = hs * 1.34;
    for (const l of lines) {
      parts.push(`<text x="${fmt(textCx)}" y="${fmt(ty)}" font-family="Cinzel" font-weight="600" font-size="${fmt(hs)}" letter-spacing="${fmt(hls)}" fill="${palette.ink}" text-anchor="middle" dx="${fmt(hls / 2)}">${esc(l)}</text>`);
      ty += lineH;
    }
  }

  // divider: thin line - diamond - thin line
  ty += u(0.014);
  {
    const dw = u(0.09), d = S / 180;
    const y = ty - u(0.012);
    parts.push(
      `<g stroke="${palette.ink}" stroke-opacity="0.75" stroke-width="${fmt(S / 2200)}">
         <line x1="${fmt(textCx - dw)}" y1="${fmt(y)}" x2="${fmt(textCx - d * 1.6)}" y2="${fmt(y)}"/>
         <line x1="${fmt(textCx + d * 1.6)}" y1="${fmt(y)}" x2="${fmt(textCx + dw)}" y2="${fmt(y)}"/>
       </g>
       <path d="M${fmt(textCx)},${fmt(y - d)} L${fmt(textCx + d)},${fmt(y)} L${fmt(textCx)},${fmt(y + d)} L${fmt(textCx - d)},${fmt(y)} Z" fill="${palette.ink}" fill-opacity="0.85"/>`
    );
    ty += u(0.028);
  }

  // subline: date · time · place
  if (spec.subline) {
    let ss = fitSize(spec.subline, S / 76, 0.16, u(0.9), S / 94, false);
    const sls = ss * 0.16;
    parts.push(`<text x="${fmt(textCx)}" y="${fmt(ty)}" font-family="Inter" font-weight="500" font-size="${fmt(ss)}" letter-spacing="${fmt(sls)}" fill="${palette.ink}" fill-opacity="0.92" text-anchor="middle" dx="${fmt(sls / 2)}">${esc(spec.subline.toUpperCase())}</text>`);
    ty += u(0.028);
  }

  // coordinates line
  if (spec.coordsLine) {
    const cs = S / 102;
    const cls = cs * 0.22;
    parts.push(`<text x="${fmt(textCx)}" y="${fmt(ty)}" font-family="Inter" font-weight="400" font-size="${fmt(cs)}" letter-spacing="${fmt(cls)}" fill="${palette.ink}" fill-opacity="0.68" text-anchor="middle" dx="${fmt(cls / 2)}">${esc(spec.coordsLine.toUpperCase())}</text>`);
  }

  // brand line closes the type block
  {
    ty += u(0.052);
    const bs = S / 150;
    const bls = bs * 0.34;
    const brand = '✦  N O C T U R N E   S U P P L Y   C O .  ✦';
    parts.push(`<text x="${fmt(textCx)}" y="${fmt(ty)}" font-family="Inter" font-weight="400" font-size="${fmt(bs)}" letter-spacing="${fmt(bls)}" fill="${palette.ink}" fill-opacity="0.5" text-anchor="middle" dx="${fmt(bls / 2)}">${brand}</text>`);
  }

  parts.push('</svg>');
  return parts.join('\n');
}

// --- Rasterization for print ---------------------------------------------------
let resvgMod = null;
function renderPNG(svg, widthPx) {
  if (!resvgMod) resvgMod = require('@resvg/resvg-js');
  const { Resvg } = resvgMod;
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: widthPx },
    background: 'rgba(0, 0, 0, 0)',
    font: {
      fontFiles: FONT_FILES,
      loadSystemFonts: false,
      defaultFontFamily: 'Inter',
      serifFamily: 'Cinzel',
      sansSerifFamily: 'Inter',
    },
  });
  return Buffer.from(resvg.render().asPng());
}

// --- Sky facts (used for preview copy) -------------------------------------------
function skyFacts(spec) {
  const cat = loadCatalog();
  const sky = new SkyEngine(spec.utcDate, spec.lat, spec.lon);
  const visible = [];
  for (const c of cat.lines) {
    let up = 0;
    for (const seg of c.segs) for (const [ra, dec] of seg) if (sky.project(ra, dec).alt > 0) up++;
    const total = c.segs.reduce((n, s) => n + s.length, 0);
    if (up / total >= 0.45) visible.push({ name: c.name, rank: c.rank, frac: up / total });
  }
  visible.sort((a, b) => a.rank - b.rank || b.frac - a.frac);

  let brightest = null;
  let starCount = 0;
  for (const s of cat.stars) {
    if (sky.project(s[0], s[1]).alt > 0) {
      starCount++;
      if (!brightest) brightest = s;
    }
  }

  const moon = sky.moon();
  const waxing = moonIsWaxing(spec.utcDate);
  const sun = sky.sun();
  const planetsUp = sky.planets().filter((p) => p.alt > 3 && p.mag < 2.5);

  return {
    constellations: visible.slice(0, 8).map((v) => v.name),
    constellationCount: visible.length,
    brightestStar: brightest ? { name: brightest[4], mag: brightest[2] } : null,
    starsAboveHorizon: starCount,
    moon: {
      name: moonPhaseName(moon.phaseFraction, waxing),
      fraction: moon.phaseFraction,
      aboveHorizon: moon.alt > 0,
    },
    planetsUp: planetsUp.map((p) => ({ name: p.name, mag: p.mag })),
    sunAltitude: sun.alt,
    daylight: sun.alt > -6,
  };
}

module.exports = { buildSVG, renderPNG, skyFacts, paletteFor, FONT_FILES };
