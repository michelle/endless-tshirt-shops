import { skyOn, PLANETS } from './astro.js';
import { PRODUCT, SHIRT_COLORS, INKS } from './catalog.js';
import { measureText } from './render.js';

const W = PRODUCT.printWidth;
const H = PRODUCT.printHeight;
const CX = W / 2;
const CY = 1760;
const TICK_R = 1500;
const LABEL_R = 1612;
const ORBIT_R0 = 300;
const ORBIT_STEP = 163;
const BODY = { mercury: 26, venus: 38, earth: 42, mars: 32, jupiter: 70, saturn: 52, uranus: 48, neptune: 46 };
const ABBR = { mercury: 'MER', venus: 'VEN', earth: 'EAR', mars: 'MAR', jupiter: 'JUP', saturn: 'SAT', uranus: 'URA', neptune: 'NEP' };
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SERIF = 'Cormorant Garamond';
const MONO = 'Space Mono';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const f = (n) => Math.round(n * 10) / 10;

function rng(seedStr) {
  let h = 2166136261;
  for (const ch of seedStr) h = Math.imul(h ^ ch.codePointAt(0), 16777619) >>> 0;
  return () => {
    h = (h + 0x6d2b79f5) >>> 0;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pol = (r, deg, cx = CX, cy = CY) => [cx + r * Math.cos((deg * Math.PI) / 180), cy - r * Math.sin((deg * Math.PI) / 180)];

export function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const wd = DAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return { long: `${MONTHS[m - 1]} ${d}, ${y}`, weekday: wd };
}

function fitSize(text, opts, maxWidth, maxSize) {
  const w = measureText(text, { ...opts, size: maxSize });
  return w <= maxWidth ? maxSize : (maxSize * maxWidth) / w;
}

function sparkle(x, y, s, op) {
  const k = s * 0.18;
  return `<path d="M${f(x)} ${f(y - s)}Q${f(x + k)} ${f(y - k)} ${f(x + s)} ${f(y)}Q${f(x + k)} ${f(y + k)} ${f(x)} ${f(y + s)}Q${f(x - k)} ${f(y + k)} ${f(x - s)} ${f(y)}Q${f(x - k)} ${f(y - k)} ${f(x)} ${f(y - s)}Z" fill-opacity="${op}"/>`;
}

function moonGlyph(cx, cy, r, elong, ink, litInk) {
  const waxing = elong <= 180;
  const e = waxing ? elong : 360 - elong; // 0..180
  const rx = Math.abs(Math.cos((e * Math.PI) / 180)) * r;
  const sweep = e < 90 ? 0 : 1;
  let lit = '';
  if (e > 1) {
    lit = `<path d="M0 ${-r}A${r} ${r} 0 0 1 0 ${r}A${f(rx)} ${r} 0 0 ${sweep} 0 ${-r}Z" fill="${litInk}"/>`;
  }
  const flip = waxing ? '' : ' scale(-1 1)';
  return `<g transform="translate(${f(cx)} ${f(cy)})${flip}"><circle r="${r}" fill="${ink}" fill-opacity="0.16"/>${lit}<circle r="${r}" fill="none" stroke="${ink}" stroke-width="5"/></g>`;
}

export function designSummary(spec) {
  const sky = skyOn(spec.date);
  return { sky, ...formatDate(spec.date) };
}

// Builds the full-resolution print SVG (transparent background) for one shirt.
export function buildPrintSvg(spec) {
  const shirt = SHIRT_COLORS[spec.color];
  const ink = INKS[shirt.tone];
  const main = ink.main;
  const accent = ink[spec.accent];
  const sky = skyOn(spec.date);
  const { long: dateLong, weekday } = formatDate(spec.date);
  const rand = rng(`${spec.name}|${spec.date}|${spec.line}`);

  const pos = {};
  PLANETS.forEach((p, i) => {
    const r = ORBIT_R0 + i * ORBIT_STEP;
    const [x, y] = pol(r, sky.planets[p].lon);
    pos[p] = { x, y, r, lon: sky.planets[p].lon };
  });
  const earth = pos.earth;
  const moonR = 76;
  const [mx, my] = pol(moonR, sky.moon.dirLon, earth.x, earth.y);

  // "YOU" label: choose the free spot around Earth farthest from other bodies
  let best = null;
  for (let a = 0; a < 360; a += 30) {
    const [lx, ly] = pol(138, a, earth.x, earth.y);
    let d = Math.hypot(lx - CX, ly - CY) - 190;
    for (const p of PLANETS) if (p !== 'earth') d = Math.min(d, Math.hypot(lx - pos[p].x, ly - pos[p].y) - BODY[p] - 70);
    d = Math.min(d, Math.hypot(lx - mx, ly - my) - 60);
    if (!best || d > best.d) best = { d, lx, ly };
  }

  const cuts = [];
  cuts.push(`<rect x="${f(best.lx - 92)}" y="${f(best.ly - 46)}" width="184" height="92" rx="46" fill="#000"/>`);
  for (const p of PLANETS) cuts.push(`<circle cx="${f(pos[p].x)}" cy="${f(pos[p].y)}" r="${BODY[p] + 26 + (p === 'saturn' ? 34 : 0)}" fill="#000"/>`);
  cuts.push(`<circle cx="${f(mx)}" cy="${f(my)}" r="40" fill="#000"/>`);

  // ---- orbit rings
  let orbits = '';
  PLANETS.forEach((p, i) => {
    orbits += `<circle cx="${CX}" cy="${CY}" r="${ORBIT_R0 + i * ORBIT_STEP}"/>`;
  });

  // ---- tick ring
  let ticks = '';
  for (let d = 0; d < 360; d++) {
    const len = d % 10 === 0 ? 64 : d % 5 === 0 ? 42 : 22;
    const sw = d % 10 === 0 ? 7 : 5;
    const [x1, y1] = pol(TICK_R, d);
    const [x2, y2] = pol(TICK_R + len, d);
    ticks += `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke-width="${sw}"/>`;
  }
  let labels = '';
  for (let d = 0; d < 360; d += 30) {
    const [x, y] = pol(LABEL_R, d);
    labels += `<text x="${f(x)}" y="${f(y + 18)}">${d}°</text>`;
  }

  // ---- sun
  let rays = '';
  for (let i = 0; i < 36; i++) {
    const a = i * 10;
    const [x1, y1] = pol(176, a);
    const [x2, y2] = pol(i % 2 ? 212 : 236, a);
    rays += `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}"/>`;
  }
  const sun = `<g stroke="${accent}" stroke-width="7" stroke-linecap="round">${rays}</g><circle cx="${CX}" cy="${CY}" r="132" fill="${accent}"/><circle cx="${CX}" cy="${CY}" r="150" fill="none" stroke="${accent}" stroke-width="5"/>`;

  // ---- planets
  let bodies = '';
  for (const p of PLANETS) {
    const { x, y } = pos[p];
    const fill = p === 'earth' ? accent : main;
    if (p === 'saturn') {
      bodies += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${BODY.saturn * 1.95}" ry="${BODY.saturn * 0.55}" transform="rotate(-24 ${f(x)} ${f(y)})" fill="none" stroke="${main}" stroke-width="7"/>`;
    }
    bodies += `<circle cx="${f(x)}" cy="${f(y)}" r="${BODY[p]}" fill="${fill}"/>`;
  }
  const moon = `<circle cx="${f(earth.x)}" cy="${f(earth.y)}" r="${moonR}" fill="none" stroke="${accent}" stroke-width="4" stroke-dasharray="3 14" stroke-linecap="round"/><circle cx="${f(mx)}" cy="${f(my)}" r="19" fill="${main}"/>`;
  const you = `<text x="${f(best.lx)}" y="${f(best.ly + 20)}" font-family="${MONO}" font-weight="700" font-size="58" letter-spacing="6" text-anchor="middle" fill="${accent}">YOU</text>`;

  // ---- stars (unique per customer)
  let stars = '';
  let placed = 0;
  for (let tries = 0; tries < 900 && placed < 46; tries++) {
    const x = 330 + rand() * (W - 660);
    const y = 150 + rand() * 3250;
    const sz = 6 + rand() * 12;
    const op = f(0.35 + rand() * 0.6);
    const kind = rand();
    if (Math.hypot(x - CX, y - CY) < 1705 + sz) continue;
    stars += kind > 0.72 ? sparkle(x, y, sz * 2.1, op) : `<circle cx="${f(x)}" cy="${f(y)}" r="${f(sz * 0.55)}" fill-opacity="${op}"/>`;
    placed++;
  }

  // ---- text block
  const nameText = spec.name.toUpperCase();
  const nameOpts = { family: SERIF, weight: 600, letterSpacing: 0 };
  const nameSize = fitSize(nameText, { ...nameOpts, letterSpacing: 36 }, 3500, 330);
  const nameLS = f(nameSize * 0.11);
  const nameSvg = `<text x="${f(CX + nameLS / 2)}" y="3742" font-family="${SERIF}" font-weight="600" font-size="${f(nameSize)}" letter-spacing="${nameLS}" text-anchor="middle" fill="${main}">${esc(nameText)}</text>`;

  const dateStr = `${weekday}, ${dateLong}`;
  const dateSize = fitSize(dateStr, { family: SERIF, weight: 500, style: 'italic' }, 3400, 175);
  const dateSvg = `<text x="${CX}" y="4010" font-family="${SERIF}" font-weight="500" font-style="italic" font-size="${f(dateSize)}" text-anchor="middle" fill="${accent}">${esc(dateStr)}</text>`;

  const orn = `<g stroke="${main}" stroke-width="5" stroke-opacity="0.7"><line x1="${CX - 700}" y1="4130" x2="${CX - 70}" y2="4130"/><line x1="${CX + 70}" y1="4130" x2="${CX + 700}" y2="4130"/></g><path d="M${CX} 4106L${CX + 24} 4130L${CX} 4154L${CX - 24} 4130Z" fill="${accent}"/>`;

  const line = (spec.line || 'The solar system, exactly as it stood').toUpperCase();
  const lineSize = fitSize(line, { family: MONO, weight: 400, letterSpacing: 8 }, 3400, 76);
  const lineSvg = `<text x="${f(CX + 4)}" y="4290" font-family="${MONO}" font-size="${f(lineSize)}" letter-spacing="8" text-anchor="middle" fill="${main}">${esc(line)}</text>`;

  const phaseText = `${sky.moon.phase.toUpperCase()} · ${Math.round(sky.moon.illumination * 100)}% LIT`;
  const phaseW = measureText(phaseText, { family: MONO, size: 58, letterSpacing: 5 });
  const mr = 62;
  const groupW = mr * 2 + 44 + phaseW;
  const gx = CX - groupW / 2;
  const phaseSvg = `${moonGlyph(gx + mr, 4505, mr, sky.moon.elongation, main, accent)}<text x="${f(gx + mr * 2 + 44)}" y="4525" font-family="${MONO}" font-size="58" letter-spacing="5" fill="${main}" fill-opacity="0.9">${esc(phaseText)}</text>`;

  let table = '';
  const colW = 3300 / 8;
  PLANETS.forEach((p, i) => {
    const x = CX - 1650 + colW * (i + 0.5);
    table += `<text x="${f(x)}" y="4760" font-weight="700" fill="${p === 'earth' ? accent : main}">${ABBR[p]}</text><text x="${f(x)}" y="4830" fill-opacity="0.85" fill="${p === 'earth' ? accent : main}">${Math.round(sky.planets[p].lon)}°</text>`;
  });
  const tableSvg = `<g font-family="${MONO}" font-size="52" text-anchor="middle" letter-spacing="3">${table}</g>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs><mask id="cut" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#fff"/>${cuts.join('')}</mask></defs>
<g fill="${main}">${stars}</g>
<g mask="url(#cut)"><g fill="none" stroke="${main}" stroke-width="6" stroke-opacity="0.6">${orbits}</g></g>
<circle cx="${CX}" cy="${CY}" r="${TICK_R}" fill="none" stroke="${main}" stroke-width="6" stroke-opacity="0.9"/>
<g stroke="${main}" stroke-opacity="0.9" stroke-linecap="butt">${ticks}</g>
<g font-family="${MONO}" font-size="50" text-anchor="middle" fill="${main}" fill-opacity="0.85" letter-spacing="2">${labels}</g>
${sun}${bodies}${moon}${you}
${nameSvg}${dateSvg}${orn}${lineSvg}${phaseSvg}${tableSvg}
</svg>`;
}
