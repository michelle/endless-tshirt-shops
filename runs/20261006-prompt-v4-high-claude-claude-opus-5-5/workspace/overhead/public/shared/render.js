// Shared, isomorphic renderer for the Overhead star-map tee.
// The browser uses it for the live preview; the server uses the exact same code to
// produce the print file sent to Prodigi, so what the customer sees is what gets printed.
import * as A from '../vendor/astronomy.js';
import { STARS, LINES, CONSTELLATIONS } from './skydata.js';

// Print canvas matches Prodigi's largest front print area for Bella+Canvas 3001 (300 DPI).
// The artwork occupies the upper ~12" so it sits on the chest; the rest is transparent.
export const CANVAS = { w: 4680, h: 5790 };
const CX = CANVAS.w / 2;
const CY = 1660; // chart centre
const R = 1460; // horizon radius
const RING_IN = R + 26;
const RING_OUT = R + 150;

// All inks are solid colours (no transparency) so DTG lays down a clean underbase.
export const INKS = {
  starlight: { label: 'Starlight', for: 'dark', star: '#FFF6E2', line: '#D2AE6A', text: '#FFF6E2', accent: '#D2AE6A' },
  silver: { label: 'Silver', for: 'dark', star: '#FFFFFF', line: '#9FB0C6', text: '#FFFFFF', accent: '#9FB0C6' },
  ember: { label: 'Ember', for: 'dark', star: '#FFE7C2', line: '#E0844E', text: '#FFE7C2', accent: '#E0844E' },
  ink: { label: 'Night ink', for: 'light', star: '#18213A', line: '#A8823D', text: '#18213A', accent: '#A8823D' },
  graphite: { label: 'Graphite', for: 'light', star: '#222222', line: '#7C7C7C', text: '#222222', accent: '#7C7C7C' },
};

// Bella+Canvas 3001 colours offered (Prodigi attribute value -> display info).
export const SHIRTS = {
  black: { label: 'Black', hex: '#141416', tone: 'dark', sizes: ['xs', 's', 'm', 'l', 'xl', '2xl', '3xl'] },
  'navy blue': { label: 'Navy', hex: '#1E2638', tone: 'dark', sizes: ['s', 'm', 'l', 'xl', '2xl', '3xl'] },
  asphalt: { label: 'Asphalt', hex: '#3E3E42', tone: 'dark', sizes: ['s', 'm', 'l', 'xl', '2xl', '3xl'] },
  maroon: { label: 'Maroon', hex: '#561C27', tone: 'dark', sizes: ['s', 'm', 'l', 'xl', '2xl', '3xl'] },
  white: { label: 'White', hex: '#F6F6F4', tone: 'light', sizes: ['xs', 's', 'm', 'l', 'xl', '2xl', '3xl', '4xl'] },
  cream: { label: 'Cream', hex: '#EEE5D0', tone: 'light', sizes: ['xs', 's', 'm', 'l', 'xl', '2xl', '3xl', '4xl'] },
};

export const LIMITS = { headline: 34, place: 44, dateLine: 44, coords: 44 };

/** Normalise + validate a design object coming from an untrusted client. Throws on invalid input. */
export function validateDesign(d, fonts) {
  if (!d || typeof d !== 'object') throw new Error('Missing design');
  const num = (v, lo, hi, name) => {
    const n = Number(v);
    if (!Number.isFinite(n) || n < lo || n > hi) throw new Error(`Invalid ${name}`);
    return n;
  };
  const str = (v, max, name) => {
    const s = String(v ?? '').replace(/\s+/g, ' ').trim();
    if (s.length > max) throw new Error(`${name} is too long (max ${max} characters)`);
    if (fonts) {
      const bad = unsupportedChars(s, name === 'Headline' ? fonts.serif : fonts.sans);
      if (bad.length) throw new Error(`${name} contains characters we can't print: ${bad.join(' ')}`);
    }
    return s;
  };
  const out = {
    lat: Math.round(num(d.lat, -90, 90, 'latitude') * 1e4) / 1e4,
    lon: Math.round(num(d.lon, -180, 180, 'longitude') * 1e4) / 1e4,
    t: Math.round(num(d.t, -2208988800000, 4102444800000, 'date')), // 1900..2100
    headline: str(d.headline, LIMITS.headline, 'Headline'),
    place: str(d.place, LIMITS.place, 'Place line'),
    dateLine: str(d.dateLine, LIMITS.dateLine, 'Date line'),
    coords: str(d.coords, LIMITS.coords, 'Coordinates line'),
    ink: INKS[d.ink] ? d.ink : 'starlight',
    lines: d.lines !== false,
    names: !!d.names,
    planets: d.planets !== false,
    ecliptic: !!d.ecliptic,
  };
  return out;
}

export function unsupportedChars(s, font) {
  const bad = new Set();
  for (const ch of s) if (ch !== ' ' && font.charToGlyphIndex(ch) === 0) bad.add(ch);
  return [...bad];
}

// ---------------------------------------------------------------------------
// Astronomy: everything is projected with a zenith-centred stereographic projection,
// north up and east on the LEFT (as when lying on your back looking up).

function matrix(rot) {
  const m = rot.rot;
  return (x, y, z) => [
    m[0][0] * x + m[1][0] * y + m[2][0] * z,
    m[0][1] * x + m[1][1] * y + m[2][1] * z,
    m[0][2] * x + m[1][2] * y + m[2][2] * z,
  ];
}

// HOR vector: x = north, y = west, z = zenith. Returns unit-disc coords (horizon = 1).
function project([x, y, z]) {
  const k = 1 / (1 + z);
  return [y * k, -x * k];
}

const D2R = Math.PI / 180;
function sph(raDeg, decDeg) {
  const c = Math.cos(decDeg * D2R);
  return [c * Math.cos(raDeg * D2R), c * Math.sin(raDeg * D2R), Math.sin(decDeg * D2R)];
}
const norm = (v) => {
  const l = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / l, v[1] / l, v[2] / l];
};

const PLANETS = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'];

export function computeSky({ lat, lon, t }) {
  const date = new Date(t);
  const time = A.MakeTime(date);
  const obs = new A.Observer(lat, lon, 0);
  const toHor = matrix(A.Rotation_EQJ_HOR(time, obs));

  const stars = [];
  for (let i = 0; i < STARS.length; i += 3) {
    const h = toHor(...sph(STARS[i], STARS[i + 1]));
    if (h[2] <= 0.004) continue;
    const [x, y] = project(h);
    stars.push([x, y, STARS[i + 2]]);
  }

  const lines = [];
  for (const line of LINES) {
    let cur = [];
    for (let i = 0; i < line.length; i += 2) {
      const h = toHor(...sph(line[i], line[i + 1]));
      if (h[2] < -0.35) {
        if (cur.length > 1) lines.push(cur);
        cur = [];
        continue;
      }
      cur.push(project(h));
    }
    if (cur.length > 1) lines.push(cur);
  }

  const names = [];
  for (const [name, ra, dec] of CONSTELLATIONS) {
    const h = toHor(...sph(ra, dec));
    if (h[2] > 0.17) names.push([name, ...project(h)]);
  }

  const bodyVec = (b) => {
    const eq = A.Equator(b, date, obs, false, true);
    return norm(toHor(eq.vec.x, eq.vec.y, eq.vec.z));
  };

  const planets = [];
  for (const p of PLANETS) {
    const h = bodyVec(A.Body[p]);
    if (h[2] > 0.01) planets.push([p, ...project(h)]);
  }

  let moon = null;
  const mh = bodyVec(A.Body.Moon);
  const moonInfo = { up: mh[2] > 0.01, phaseDeg: A.MoonPhase(date), fraction: A.Illumination(A.Body.Moon, date).phase_fraction };
  if (mh[2] > 0.01) {
    const sh = bodyVec(A.Body.Sun);
    // Direction toward the Sun along the great circle, projected => orientation of the bright limb.
    const dot = sh[0] * mh[0] + sh[1] * mh[1] + sh[2] * mh[2];
    const towards = norm([mh[0] + 0.02 * (sh[0] - dot * mh[0]), mh[1] + 0.02 * (sh[1] - dot * mh[1]), mh[2] + 0.02 * (sh[2] - dot * mh[2])]);
    const [mx, my] = project(mh);
    const [tx, ty] = project(towards);
    moon = { x: mx, y: my, angle: Math.atan2(ty - my, tx - mx), fraction: moonInfo.fraction };
  }

  const ecliptic = [];
  const eclHor = matrix(A.Rotation_ECL_HOR(time, obs));
  for (let l = 0; l <= 360; l += 2) {
    const h = eclHor(...sph(l, 0));
    if (h[2] < -0.35) {
      ecliptic.push(null);
      continue;
    }
    ecliptic.push(project(h));
  }

  const sunAlt = Math.asin(bodyVec(A.Body.Sun)[2]) / D2R;
  return { stars, lines, names, planets, moon, moonInfo, ecliptic, sunAlt };
}

// ---------------------------------------------------------------------------
// Text -> SVG path (so browser preview and server render are pixel-identical,
// and the print file has no font dependencies).

function textPath(font, text, size, tracking = 0) {
  const glyphs = font.stringToGlyphs(text);
  const scale = size / font.unitsPerEm;
  let x = 0;
  const parts = [];
  glyphs.forEach((g, i) => {
    parts.push({ g, x });
    x += g.advanceWidth * scale;
    if (i < glyphs.length - 1) {
      x += (font.getKerningValue(g, glyphs[i + 1]) || 0) * scale;
      x += tracking * size;
    }
  });
  return { width: x, draw: (ox, oy) => parts.map(({ g, x }) => pathData(g.getPath(ox + x, oy, size).commands)).join('') };
}

// opentype's own toPathData() occasionally emits NaN when optimising, so serialise commands directly.
function pathData(cmds) {
  let d = '';
  for (const c of cmds) {
    if (c.type === 'Z') d += 'Z';
    else if (c.type === 'Q') d += `Q${f1(c.x1)} ${f1(c.y1)} ${f1(c.x)} ${f1(c.y)}`;
    else if (c.type === 'C') d += `C${f1(c.x1)} ${f1(c.y1)} ${f1(c.x2)} ${f1(c.y2)} ${f1(c.x)} ${f1(c.y)}`;
    else d += `${c.type}${f1(c.x)} ${f1(c.y)}`;
  }
  return d;
}

function centeredText(font, text, cx, baseline, size, tracking, maxWidth, fill) {
  if (!text) return '';
  let tp = textPath(font, text, size, tracking);
  if (tp.width > maxWidth) {
    size = (size * maxWidth) / tp.width;
    tp = textPath(font, text, size, tracking);
  }
  return `<path fill="${fill}" d="${tp.draw(cx - tp.width / 2, baseline)}"/>`;
}

const f1 = (n) => Math.round(n * 10) / 10;

function starShape(x, y, r) {
  // Four-point sparkle for the brightest stars — reads beautifully on fabric.
  const L = r * 2.7;
  const w = r * 0.42;
  return `M${f1(x)} ${f1(y - L)}Q${f1(x + w)} ${f1(y - w)} ${f1(x + L)} ${f1(y)}Q${f1(x + w)} ${f1(y + w)} ${f1(x)} ${f1(y + L)}Q${f1(x - w)} ${f1(y + w)} ${f1(x - L)} ${f1(y)}Q${f1(x - w)} ${f1(y - w)} ${f1(x)} ${f1(y - L)}Z`;
}

function moonPath(r, fraction) {
  // Local frame: Sun direction = +x. Bright limb on the right, terminator ellipse.
  const rx = f1(Math.abs(1 - 2 * fraction) * r);
  const sweep = fraction > 0.5 ? 1 : 0;
  return `M0 ${-r}A${r} ${r} 0 0 1 0 ${r}A${rx} ${r} 0 0 ${sweep} 0 ${-r}Z`;
}

/**
 * Build the full print SVG.
 * @param design validated design
 * @param fonts { serif, sans, sansMedium } opentype.js Font objects
 */
export const CENTER = { x: CX, y: CY, r: RING_OUT };
export const CROP = { x: CX - 1900, y: 0, w: 3800, h: Math.round(CANVAS.h * 0.78) };

export function renderSVG(design, fonts, opts = {}) {
  const ink = INKS[design.ink] || INKS.starlight;
  const sky = computeSky(design);
  const P = ([x, y]) => [CX + x * R, CY + y * R];
  const out = [];
  const W = CANVAS.w;
  const H = CANVAS.h;
  const id = opts.idPrefix || 'oh';
  const vb = opts.viewBox || (opts.crop ? `${CROP.x} ${CROP.y} ${CROP.w} ${CROP.h}` : `0 0 ${W} ${H}`);
  out.push(`<svg xmlns="http://www.w3.org/2000/svg"${opts.x != null ? ` x="${opts.x}" y="${opts.y}"` : ''} width="${opts.width || W}" height="${opts.height || H}" viewBox="${vb}">`);
  if (opts.background) out.push(`<rect x="0" y="0" width="${W}" height="${H}" fill="${opts.background}"/>`);
  out.push(`<defs><clipPath id="${id}-sky"><circle cx="${CX}" cy="${CY}" r="${R}"/></clipPath></defs>`);

  // --- Frame: double ring with azimuth ticks and cardinal points.
  out.push(`<g fill="none" stroke="${ink.text}">`);
  out.push(`<circle cx="${CX}" cy="${CY}" r="${RING_IN}" stroke-width="10"/>`);
  out.push(`<circle cx="${CX}" cy="${CY}" r="${RING_OUT}" stroke-width="7"/>`);
  let ticks = '';
  for (let a = 0; a < 360; a += 2) {
    if (a % 90 === 0) continue;
    const len = a % 10 === 0 ? 44 : 20;
    const rad = a * D2R;
    // az measured from north; east on the left.
    const sx = -Math.sin(rad);
    const sy = -Math.cos(rad);
    ticks += `M${f1(CX + sx * RING_IN)} ${f1(CY + sy * RING_IN)}L${f1(CX + sx * (RING_IN + len))} ${f1(CY + sy * (RING_IN + len))}`;
  }
  out.push(`<path d="${ticks}" stroke-width="6" stroke="${ink.accent}"/>`);
  out.push('</g>');
  const card = [['N', 0, -1], ['E', -1, 0], ['S', 0, 1], ['W', 1, 0]];
  for (const [l, dx, dy] of card) {
    const mid = (RING_IN + RING_OUT) / 2;
    const size = 92;
    const tp = textPath(fonts.sansMedium, l, size, 0);
    out.push(`<path fill="${ink.text}" d="${tp.draw(CX + dx * mid - tp.width / 2, CY + dy * mid + size * 0.35)}"/>`);
  }

  // --- Sky (clipped to the horizon). Labels and the Moon/planet markers knock out the
  // stars and lines beneath them, so nothing is over-printed and every label stays legible.
  const knock = [];
  const overlay = [];
  const taken = [];
  const hit = (b) => taken.some((o) => b.x0 < o.x1 && b.x1 > o.x0 && b.y0 < o.y1 && b.y1 > o.y0);
  const reserve = (x, y, r) => taken.push({ x0: x - r, y0: y - r, x1: x + r, y1: y + r });
  // Place a label at the first candidate baseline that doesn't collide with earlier marks.
  const label = (font, text, x, baselines, size, fill, optional = false) => {
    const tp = textPath(font, text, size, 0.2);
    const boxAt = (b) => ({ x0: x - tp.width / 2 - 22, y0: b - size * 0.95, x1: x + tp.width / 2 + 22, y1: b + size * 0.3 });
    let baseline = baselines.find((b) => !hit(boxAt(b)));
    if (baseline === undefined) {
      if (optional) return;
      baseline = baselines[0];
    }
    const box = boxAt(baseline);
    taken.push(box);
    knock.push(`<rect x="${f1(box.x0)}" y="${f1(box.y0)}" width="${f1(box.x1 - box.x0)}" height="${f1(box.y1 - box.y0)}" rx="${f1(size * 0.3)}"/>`);
    overlay.push(`<path fill="${fill}" d="${tp.draw(x - tp.width / 2, baseline)}"/>`);
  };
  const moonR = 70;
  const moonXY = sky.moon && P([sky.moon.x, sky.moon.y]);
  if (moonXY) reserve(moonXY[0], moonXY[1], moonR + 30);
  const planetXY = design.planets ? sky.planets.map(([name, x0, y0]) => [name, ...P([x0, y0])]) : [];
  for (const [, x, y] of planetXY) reserve(x, y, 62);
  if (moonXY && design.planets) label(fonts.sansMedium, 'MOON', moonXY[0], [moonXY[1] + 150, moonXY[1] - 112], 48, ink.accent);
  for (const [name, x, y] of planetXY) {
    knock.push(`<circle cx="${f1(x)}" cy="${f1(y)}" r="62"/>`);
    overlay.push(`<circle cx="${f1(x)}" cy="${f1(y)}" r="20" fill="${ink.star}"/>`);
    overlay.push(`<circle cx="${f1(x)}" cy="${f1(y)}" r="38" fill="none" stroke="${ink.accent}" stroke-width="8"/>`);
    label(fonts.sansMedium, name.toUpperCase(), x, [y + 112, y - 76, y + 180, y - 144], 48, ink.accent);
  }
  if (moonXY) {
    const [x, y] = moonXY;
    const deg = f1((sky.moon.angle * 180) / Math.PI);
    knock.push(`<circle cx="${f1(x)}" cy="${f1(y)}" r="${moonR + 30}"/>`);
    overlay.push(`<g transform="translate(${f1(x)} ${f1(y)}) rotate(${deg})">`);
    overlay.push(`<circle r="${moonR}" fill="none" stroke="${ink.star}" stroke-width="8"/>`);
    if (sky.moon.fraction > 0.02) overlay.push(`<path d="${moonPath(moonR, sky.moon.fraction)}" fill="${ink.star}"/>`);
    overlay.push('</g>');
  }
  if (design.names) {
    for (const [name, x0, y0] of sky.names) {
      const [x, y] = P([x0, y0]);
      label(fonts.sans, name.toUpperCase(), x, [y, y - 60, y + 60], 44, ink.accent, true);
    }
  }

  out.push(`<mask id="${id}-ko" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#fff"/><g fill="#000">${knock.join('')}</g></mask>`);
  out.push(`<g clip-path="url(#${id}-sky)"><g mask="url(#${id}-ko)">`);
  if (design.ecliptic) {
    const segs = [];
    let cur = '';
    for (const p of sky.ecliptic) {
      if (!p) { if (cur) segs.push(cur); cur = ''; continue; }
      const [x, y] = P(p);
      cur += `${cur ? 'L' : 'M'}${f1(x)} ${f1(y)}`;
    }
    if (cur) segs.push(cur);
    out.push(`<path d="${segs.join('')}" fill="none" stroke="${ink.accent}" stroke-width="7" stroke-dasharray="30 26"/>`);
  }
  if (design.lines) {
    const d = sky.lines.map((l) => l.map((p, i) => { const [x, y] = P(p); return `${i ? 'L' : 'M'}${f1(x)} ${f1(y)}`; }).join('')).join('');
    out.push(`<path d="${d}" fill="none" stroke="${ink.line}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>`);
  }
  let dots = '';
  let sparkles = '';
  for (const [x0, y0, mag] of sky.stars) {
    const [x, y] = P([x0, y0]);
    const r = 7 + Math.max(0, 5.3 - mag) * 4.9;
    // Stars under a label/marker are dropped whole rather than clipped into half-moons.
    if (hit({ x0: x - r, y0: y - r, x1: x + r, y1: y + r })) continue;
    if (mag < 0.9) sparkles += starShape(x, y, r);
    // Circle as a path keeps the SVG compact.
    dots += `M${f1(x - r)} ${f1(y)}a${f1(r)} ${f1(r)} 0 1 0 ${f1(2 * r)} 0a${f1(r)} ${f1(r)} 0 1 0 ${f1(-2 * r)} 0`;
  }
  out.push('</g>');
  out.push(`<path fill="${ink.star}" d="${dots}${sparkles}"/>`);
  out.push(overlay.join(''));
  out.push('</g>');

  // --- Typography block under the chart.
  const maxW = 3500;
  let y = CY + RING_OUT + 330;
  out.push(centeredText(fonts.serif, design.headline.toUpperCase(), CX, y, 236, 0.07, maxW, ink.text));
  y += 118;
  // Divider: rule – star – rule
  out.push(`<path d="M${CX - 420} ${y}H${CX - 70}M${CX + 70} ${y}H${CX + 420}" stroke="${ink.accent}" stroke-width="7"/>`);
  out.push(`<path fill="${ink.accent}" d="${starShape(CX, y, 13)}"/>`);
  y += 170;
  out.push(centeredText(fonts.sansMedium, design.place.toUpperCase(), CX, y, 100, 0.3, maxW, ink.text));
  y += 150;
  out.push(centeredText(fonts.sans, design.dateLine.toUpperCase(), CX, y, 84, 0.26, maxW, ink.text));
  y += 132;
  out.push(centeredText(fonts.sans, design.coords.toUpperCase(), CX, y, 70, 0.26, maxW, ink.accent));

  out.push('</svg>');
  return { svg: out.join(''), sky };
}
