// starmap.js — isomorphic (browser + node) star-chart renderer.
// Astronomy: J2000 catalog precessed to observation date, alt-az from
// observer lat/lon, zenith-centered stereographic projection.

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;
const J2000 = 2451545.0;

export function julianDate(date) {
  return date.getTime() / 86400000 + 2440587.5;
}

// Greenwich mean sidereal time, degrees
export function gmst(jd) {
  const d = jd - J2000;
  let g = 280.46061837 + 360.98564736629 * d;
  return ((g % 360) + 360) % 360;
}

// IAU 1976 precession of ra/dec (degrees) from J2000 to jd
export function precess(ra, dec, jd) {
  const T = (jd - J2000) / 36525;
  const zeta = (0.6406161 * T + 0.0000839 * T * T + 0.000005 * T * T * T) * D2R;
  const z = (0.6406161 * T + 0.0003041 * T * T + 0.0000051 * T * T * T) * D2R;
  const theta = (0.556753 * T - 0.0001185 * T * T - 0.0000116 * T * T * T) * D2R;
  const raR = ra * D2R, decR = dec * D2R;
  const A = Math.cos(decR) * Math.sin(raR + zeta);
  const B = Math.cos(theta) * Math.cos(decR) * Math.cos(raR + zeta) - Math.sin(theta) * Math.sin(decR);
  const C = Math.sin(theta) * Math.cos(decR) * Math.cos(raR + zeta) + Math.cos(theta) * Math.sin(decR);
  let ra2 = Math.atan2(A, B) * R2D + z * R2D;
  const dec2 = Math.asin(Math.max(-1, Math.min(1, C))) * R2D;
  return [((ra2 % 360) + 360) % 360, dec2];
}

// equatorial -> horizontal. returns {alt, az} degrees, az from north eastward
export function altAz(ra, dec, lat, lstDeg) {
  const H = (lstDeg - ra) * D2R;
  const decR = dec * D2R, latR = lat * D2R;
  const alt = Math.asin(Math.sin(decR) * Math.sin(latR) + Math.cos(decR) * Math.cos(latR) * Math.cos(H));
  const az = Math.atan2(
    -Math.cos(decR) * Math.sin(H),
    Math.sin(decR) * Math.cos(latR) - Math.cos(decR) * Math.sin(latR) * Math.cos(H)
  );
  return { alt: alt * R2D, az: ((az * R2D) + 360) % 360 };
}

// zenith-centered stereographic; returns {x, y} in units where horizon = 1, or null if below horizon
export function project(alt, az) {
  if (alt < -0.5) return null;
  const z = (90 - alt) * D2R;
  const r = Math.tan(z / 2); // tan(45°) = 1 at horizon
  const azR = az * D2R;
  return { x: r * Math.sin(azR), y: -r * Math.cos(azR) };
}

// --- color from B-V index ---
function starColor(bv, theme) {
  if (theme === 'light') {
    // dark inks for white shirts
    if (bv < 0.0) return '#2c3e6b';
    if (bv < 0.4) return '#1c2b4a';
    if (bv < 0.8) return '#3d3050';
    return '#4a2f2a';
  }
  if (bv < 0.0) return '#d8e4ff';
  if (bv < 0.4) return '#fbf7ee';
  if (bv < 0.8) return '#ffe9c4';
  return '#ffd3a0';
}

function starRadius(mag, scale) {
  return Math.max(2.6 * scale, Math.min(34 * scale, 30 * scale * Math.exp(-0.55 * (mag + 1.5))));
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const THEMES = {
  dark:  { ink: '#f3e9d5', accent: '#c9a227', faint: 'rgba(243,233,213,0.55)' },
  light: { ink: '#17233b', accent: '#a8791f', faint: 'rgba(23,35,59,0.55)' },
};

function fmtCoord(v, pos, neg) {
  const hemi = v >= 0 ? pos : neg;
  return `${Math.abs(v).toFixed(4)}° ${hemi}`;
}

export function formatDateLine(iso) {
  const months = ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];
  const d = new Date(iso);
  return `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
export function formatTimeLine(iso) {
  const d = new Date(iso);
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

/**
 * Render the full shirt design as an SVG string.
 * params: { iso, lat, lon, title, subtitle, place, theme: 'dark'|'light' }
 * catalog: { stars: [[ra,dec,mag,bv]], lines: [[[ra,dec]...]] }
 * opts: { width, height, fontFamily }
 */
export function renderDesignSVG(params, catalog, opts = {}) {
  const W = opts.width ?? 4680;
  const H = opts.height ?? 5790;
  const theme = THEMES[params.theme] ?? THEMES.dark;
  const font = opts.fontFamily ?? "'Cormorant Garamond', Georgia, serif";
  const scale = W / 4680;

  const jd = julianDate(new Date(params.iso));
  const lst = (gmst(jd) + params.lon + 360) % 360;

  const cx = W / 2;
  const cy = H * 0.397;
  const R = W * 0.386;

  const uid = Math.random().toString(36).slice(2, 10);
  let defs = `<clipPath id="sky-${uid}"><circle cx="${cx}" cy="${cy}" r="${R - 6 * scale}"/></clipPath>`;
  let body = '';

  // constellation lines
  let linesSvg = '';
  for (const seg of catalog.lines) {
    let d = '';
    let pen = false;
    for (const [ra0, dec0] of seg) {
      const [ra, dec] = precess(ra0, dec0, jd);
      const { alt, az } = altAz(ra, dec, params.lat, lst);
      const p = project(alt, az);
      if (!p) { pen = false; continue; }
      const x = cx + p.x * R, y = cy + p.y * R;
      d += pen ? ` L${x.toFixed(1)} ${y.toFixed(1)}` : `M${x.toFixed(1)} ${y.toFixed(1)}`;
      pen = true;
    }
    if (d) linesSvg += `<path d="${d}" fill="none" stroke="${theme.ink}" stroke-opacity="0.42" stroke-width="${5 * scale}" stroke-linecap="round"/>`;
  }

  // stars
  let starsSvg = '';
  for (const [ra0, dec0, mag, bv] of catalog.stars) {
    const [ra, dec] = precess(ra0, dec0, jd);
    const { alt, az } = altAz(ra, dec, params.lat, lst);
    const p = project(alt, az);
    if (!p) continue;
    const x = cx + p.x * R, y = cy + p.y * R;
    const r = starRadius(mag, scale);
    const col = starColor(bv, params.theme);
    if (mag < 1.2) starsSvg += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(r * 2.8).toFixed(1)}" fill="${col}" fill-opacity="0.16"/>`;
    starsSvg += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${col}"/>`;
  }

  // ring ticks every 15°, longer every 45°
  let ticks = '';
  for (let a = 0; a < 360; a += 15) {
    const long = a % 45 === 0;
    const len = (long ? 34 : 16) * scale;
    const rad = (a - 90) * D2R;
    const x1 = cx + Math.cos(rad) * (R + 18 * scale), y1 = cy + Math.sin(rad) * (R + 18 * scale);
    const x2 = cx + Math.cos(rad) * (R + 18 * scale + len), y2 = cy + Math.sin(rad) * (R + 18 * scale + len);
    ticks += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${theme.ink}" stroke-opacity="${long ? 0.8 : 0.45}" stroke-width="${(long ? 5 : 3) * scale}"/>`;
  }

  // N/E/S/W markers outside the ring
  const dirs = [['N', 0], ['E', 90], ['S', 180], ['W', 270]];
  let dirSvg = '';
  for (const [label, az] of dirs) {
    const rad = (az - 90) * D2R;
    const x = cx + Math.cos(rad) * (R + 118 * scale), y = cy + Math.sin(rad) * (R + 118 * scale);
    dirSvg += `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-family="${font}" font-weight="600" font-size="${92 * scale}" letter-spacing="${6 * scale}" fill="${theme.accent}">${label}</text>`;
  }

  body += `<circle cx="${cx}" cy="${cy}" r="${R + 4 * scale}" fill="none" stroke="${theme.ink}" stroke-width="${9 * scale}"/>`;
  body += `<circle cx="${cy === 0 ? 0 : cx}" cy="${cy}" r="${R - 30 * scale}" fill="none" stroke="${theme.ink}" stroke-opacity="0.4" stroke-width="${2.4 * scale}"/>`;
  body += ticks + dirSvg;
  body += `<g clip-path="url(#sky-${uid})">${linesSvg}${starsSvg}</g>`;

  // --- text block ---
  const tx = cx;
  let y = H * 0.815;
  const title = (params.title || '').toUpperCase().slice(0, 42);
  const subtitle = (params.subtitle || '').toUpperCase().slice(0, 60);
  const meta = [params.place ? String(params.place).toUpperCase().slice(0, 44) : null,
    `${formatDateLine(params.iso)} · ${formatTimeLine(params.iso)}`].filter(Boolean).join(' — ');
  const coords = `${fmtCoord(params.lat, 'N', 'S')} · ${fmtCoord(params.lon, 'E', 'W')}`;

  if (title) {
    body += `<text x="${tx}" y="${y}" text-anchor="middle" font-family="${font}" font-weight="600" font-size="${196 * scale}" letter-spacing="${14 * scale}" fill="${theme.ink}">${esc(title)}</text>`;
    y += 130 * scale;
  }
  // small diamond divider
  body += `<g stroke="${theme.accent}" stroke-width="${3 * scale}"><line x1="${tx - 250 * scale}" y1="${y}" x2="${tx - 60 * scale}" y2="${y}"/><line x1="${tx + 60 * scale}" y1="${y}" x2="${tx + 250 * scale}" y2="${y}"/></g>`;
  body += `<rect x="${tx - 16 * scale}" y="${y - 16 * scale}" width="${32 * scale}" height="${32 * scale}" transform="rotate(45 ${tx} ${y})" fill="${theme.accent}"/>`;
  y += 170 * scale;
  if (subtitle) {
    body += `<text x="${tx}" y="${y}" text-anchor="middle" font-family="${font}" font-weight="500" font-size="${120 * scale}" letter-spacing="${20 * scale}" fill="${theme.ink}">${esc(subtitle)}</text>`;
    y += 150 * scale;
  }
  body += `<text x="${tx}" y="${y}" text-anchor="middle" font-family="${font}" font-weight="500" font-size="${104 * scale}" letter-spacing="${16 * scale}" fill="${theme.ink}">${esc(meta)}</text>`;
  y += 150 * scale;
  body += `<text x="${tx}" y="${y}" text-anchor="middle" font-family="${font}" font-weight="500" font-size="${92 * scale}" letter-spacing="${14 * scale}" fill="${theme.faint}">${esc(coords)}</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs>${defs}</defs>${body}</svg>`;
}
