// Dayprint renderer — shared by the browser (live preview) and the server (print file).
// Pure ESM, no dependencies. Input: a DayData object (see lib/weather.js) + options.
// Output: an SVG string sized to the Prodigi print area for the Bella+Canvas 3001 front.

export const PRINT_W = 4680;
export const PRINT_H = 5790;

// Garment colours we sell. `hex` approximates the real fabric for the mockup and for
// baking opaque ink colours (DTG prints look muddy when semi-transparent ink fades into
// the garment, so every colour we emit is fully opaque, pre-blended against the shirt).
export const SHIRTS = {
  'black':             { label: 'Black',          hex: '#141519', dark: true,  sizes: ['xs','s','m','l','xl','2xl','3xl'] },
  'navy blue':         { label: 'Navy',           hex: '#1c2640', dark: true,  sizes: ['s','m','l','xl','2xl','3xl'] },
  'dark heather grey': { label: 'Dark Heather',   hex: '#4a4b51', dark: true,  sizes: ['s','m','l','xl','2xl','3xl'] },
  'maroon':            { label: 'Maroon',         hex: '#5a1f2b', dark: true,  sizes: ['s','m','l','xl','2xl','3xl'] },
  'military green':    { label: 'Military Green', hex: '#4a5338', dark: true,  sizes: ['s','m','l','xl','2xl','3xl'] },
  'white':             { label: 'White',          hex: '#f4f3ef', dark: false, sizes: ['xs','s','m','l','xl','2xl','3xl'] },
  'natural':           { label: 'Natural',        hex: '#e9e1cd', dark: false, sizes: ['s','m','l','xl','2xl','3xl'] },
};

export const SIZE_LABELS = { xs: 'XS', s: 'S', m: 'M', l: 'L', xl: 'XL', '2xl': '2XL', '3xl': '3XL' };

// ---------- colour helpers ----------
function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbToHex([r, g, b]) {
  return '#' + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
}
export function mix(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  t = Math.max(0, Math.min(1, t));
  return rgbToHex([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]);
}
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const smooth = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };

const SKY = {
  night: '#262c63',
  day: '#6cb0ea',
  dawn: '#f0955c',
  dusk: '#e26e8c',
  cloud: '#b1b6bf',
  rain: '#5c7392',
  snow: '#e8edf4',
};

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function hm(iso) {
  // '1991-06-14T05:21' -> 5.35 (hours as float). Returns null for missing.
  if (!iso || typeof iso !== 'string' || !iso.includes('T')) return null;
  const [h, m] = iso.split('T')[1].split(':').map(Number);
  if (Number.isNaN(h)) return null;
  return h + (m || 0) / 60;
}

function fmtClock(iso) {
  const t = hm(iso);
  if (t == null) return '—';
  let h = Math.floor(t), m = Math.round((t - h) * 60);
  if (m === 60) { h += 1; m = 0; }
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hh = ((h + 11) % 12) + 1;
  return `${hh}:${String(m).padStart(2, '0')} ${ampm}`;
}

const MONTHS = ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];

// WMO weather interpretation codes -> short words
export function wmoWord(code) {
  if (code == null) return 'UNKNOWN';
  if (code === 0) return 'CLEAR';
  if (code === 1) return 'MOSTLY CLEAR';
  if (code === 2) return 'PARTLY CLOUDY';
  if (code === 3) return 'OVERCAST';
  if (code === 45 || code === 48) return 'FOG';
  if (code >= 51 && code <= 57) return 'DRIZZLE';
  if (code >= 61 && code <= 67) return 'RAIN';
  if (code >= 71 && code <= 77) return 'SNOW';
  if (code >= 80 && code <= 82) return 'SHOWERS';
  if (code === 85 || code === 86) return 'SNOW SHOWERS';
  if (code >= 95) return 'THUNDERSTORMS';
  return 'CLOUDY';
}

function dominantCode(codes) {
  // Pick the most "eventful" code in the period: precipitation beats clouds beats clear.
  const rank = (c) => (c >= 95 ? 6 : c >= 71 && c <= 86 ? 5 : c >= 51 && c <= 67 ? 4 : c === 45 || c === 48 ? 3 : c === 3 ? 2 : c === 2 ? 1 : 0);
  let best = null;
  for (const c of codes) if (c != null && (best == null || rank(c) > rank(best))) best = c;
  return best;
}

export function describeDay(day) {
  const h = day.hourly.code;
  const parts = [
    ['MORNING', dominantCode(h.slice(6, 12))],
    ['AFTERNOON', dominantCode(h.slice(12, 18))],
    ['EVENING', dominantCode(h.slice(18, 24))],
  ];
  return parts.map(([p, c]) => `${wmoWord(c)} ${p}`).join(' · ');
}

// Moon phase 0..1 (0 = new, 0.5 = full) for a civil date (noon UTC is good enough for a shirt).
export function moonPhase(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const t = Date.UTC(y, m - 1, d, 12) / 86400000 + 2440587.5; // Julian day
  const synodic = 29.530588853;
  let phase = ((t - 2451550.1) / synodic) % 1;
  if (phase < 0) phase += 1;
  return phase;
}
export function moonName(phase) {
  const names = ['NEW MOON','WAXING CRESCENT','FIRST QUARTER','WAXING GIBBOUS','FULL MOON','WANING GIBBOUS','LAST QUARTER','WANING CRESCENT'];
  return names[Math.round(phase * 8) % 8];
}

function moonGlyph(cx, cy, r, phase, lit, shadow) {
  const x = Math.cos(2 * Math.PI * phase);
  const rx = Math.max(0.5, r * Math.abs(x));
  let path;
  if (phase < 0.5) {
    // waxing: right limb lit
    const sweep = x > 0 ? 0 : 1;
    path = `M ${cx} ${cy - r} A ${r} ${r} 0 0 1 ${cx} ${cy + r} A ${rx} ${r} 0 0 ${sweep} ${cx} ${cy - r} Z`;
  } else {
    const sweep = x > 0 ? 1 : 0;
    path = `M ${cx} ${cy - r} A ${r} ${r} 0 0 0 ${cx} ${cy + r} A ${rx} ${r} 0 0 ${sweep} ${cx} ${cy - r} Z`;
  }
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${shadow}"/><path d="${path}" fill="${lit}"/>`;
}

function polar(cx, cy, r, deg) {
  const a = (deg * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

function annularSector(cx, cy, r0, r1, a0, a1) {
  const [x0, y0] = polar(cx, cy, r1, a0);
  const [x1, y1] = polar(cx, cy, r1, a1);
  const [x2, y2] = polar(cx, cy, r0, a1);
  const [x3, y3] = polar(cx, cy, r0, a0);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M ${x0.toFixed(1)} ${y0.toFixed(1)} A ${r1} ${r1} 0 ${large} 1 ${x1.toFixed(1)} ${y1.toFixed(1)} L ${x2.toFixed(1)} ${y2.toFixed(1)} A ${r0} ${r0} 0 ${large} 0 ${x3.toFixed(1)} ${y3.toFixed(1)} Z`;
}

// Sky colour for an hour, derived from daylight, twilight, cloud cover and precipitation.
export function hourSky(day, h) {
  const t = h + 0.5;
  const sr = hm(day.daily.sunrise), ss = hm(day.daily.sunset);
  let d;
  if (sr == null || ss == null) d = day.daily.polar === 'day' ? 1 : day.daily.polar === 'night' ? 0 : 0.5;
  else d = smooth((t - sr) / 1.2 + 0.5) * smooth((ss - t) / 1.2 + 0.5);
  let c = mix(SKY.night, SKY.day, d);
  if (sr != null) c = mix(c, SKY.dawn, 0.85 * Math.max(0, 1 - Math.abs(t - sr) / 1.5));
  if (ss != null) c = mix(c, SKY.dusk, 0.85 * Math.max(0, 1 - Math.abs(t - ss) / 1.5));
  const cloud = (day.hourly.cloud[h] ?? 0) / 100;
  c = mix(c, SKY.cloud, cloud * 0.6);
  const p = Math.min(1, (day.hourly.precip[h] ?? 0) / 1.5);
  const freezing = day.unit === 'F' ? 33 : 0.5;
  const temp = day.hourly.temp[h];
  const snowing = temp != null && temp <= freezing;
  c = mix(c, snowing ? SKY.snow : SKY.rain, p * 0.8);
  return c;
}

function degSym(unit) { return `°${unit}`; }

/**
 * Render the Dayprint artwork.
 * @param {object} day  DayData (see lib/weather.js)
 * @param {object} opts { shirt: key of SHIRTS, caption: string, preview: boolean }
 */
export function renderSVG(day, opts = {}) {
  const shirtKey = SHIRTS[opts.shirt] ? opts.shirt : 'black';
  const shirt = SHIRTS[shirtKey];
  const bg = shirt.hex;
  const ink = shirt.dark ? '#f4ecdc' : '#1b2033';       // primary text/line colour
  const inkSoft = mix(ink, bg, 0.45);                   // secondary text (pre-blended, opaque)
  const inkFaint = mix(ink, bg, 0.72);                  // hairline circles

  const W = PRINT_W, H = PRINT_H;
  const cx = W / 2, cy = 2400;
  const R0 = 680;          // inner edge of the ring
  const RMIN = 860;        // outer edge for the coldest hour
  const RMAX = 1500;       // outer edge for the warmest hour
  const RTICK = 1565;      // where rain ticks start

  const temps = day.hourly.temp.map((v) => (v == null ? NaN : v));
  const valid = temps.filter((v) => !Number.isNaN(v));
  const tmin = valid.length ? Math.min(...valid) : 0;
  const tmax = valid.length ? Math.max(...valid) : 1;
  const span = Math.max(tmax - tmin, day.unit === 'F' ? 6 : 3);

  let out = [];
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">`);
  if (opts.preview === 'solid') out.push(`<rect width="${W}" height="${H}" fill="${bg}"/>`);

  // --- 24 hour wedges. Midnight at the bottom, noon at the top, like a clock face. ---
  const gap = 1.1; // degrees of garment showing between wedges
  for (let h = 0; h < 24; h++) {
    const centre = 90 + h * 15;
    const a0 = centre - 7.5 + gap / 2, a1 = centre + 7.5 - gap / 2;
    const t = Number.isNaN(temps[h]) ? 0.5 : (temps[h] - tmin) / span;
    const r1 = RMIN + t * (RMAX - RMIN);
    const fill = hourSky(day, h);
    // bake to opaque against the garment (safety: colours are already opaque, this is a no-op blend)
    out.push(`<path d="${annularSector(cx, cy, R0 + 32, r1, a0, a1)}" fill="${mix(fill, bg, 0)}"/>`);
  }

  // --- precipitation ticks outside the ring ---
  for (let h = 0; h < 24; h++) {
    const p = day.hourly.precip[h] ?? 0;
    if (p <= 0.05) continue;
    const centre = 90 + h * 15;
    const len = 70 + Math.min(p, 8) / 8 * 190;
    const freezing = day.unit === 'F' ? 33 : 0.5;
    const snowing = day.hourly.temp[h] != null && day.hourly.temp[h] <= freezing;
    if (snowing) {
      // snow: a column of dots
      const n = 1 + Math.min(3, Math.round(p / 1.2));
      for (let i = 0; i < n; i++) {
        const [x, y] = polar(cx, cy, RTICK + 30 + i * 60, centre);
        out.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="16" fill="${ink}"/>`);
      }
    } else {
      const [x0, y0] = polar(cx, cy, RTICK, centre);
      const [x1, y1] = polar(cx, cy, RTICK + len, centre);
      out.push(`<line x1="${x0.toFixed(1)}" y1="${y0.toFixed(1)}" x2="${x1.toFixed(1)}" y2="${y1.toFixed(1)}" stroke="${mix(SKY.rain, ink, shirt.dark ? 0.55 : 0.1)}" stroke-width="18" stroke-linecap="round"/>`);
    }
  }

  // --- sunrise / sunset dividers ---
  const sr = hm(day.daily.sunrise), ss = hm(day.daily.sunset);
  for (const tt of [sr, ss]) {
    if (tt == null) continue;
    const ang = 90 + tt * 15;
    const [x0, y0] = polar(cx, cy, R0 + 10, ang);
    const [x1, y1] = polar(cx, cy, RMAX + 40, ang);
    out.push(`<line x1="${x0.toFixed(1)}" y1="${y0.toFixed(1)}" x2="${x1.toFixed(1)}" y2="${y1.toFixed(1)}" stroke="${ink}" stroke-width="7" stroke-dasharray="4 26" stroke-linecap="round"/>`);
    const [sx, sy] = polar(cx, cy, RMAX + 90, ang);
    out.push(`<circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="20" fill="none" stroke="${ink}" stroke-width="7"/>`);
  }

  // --- inner ring and hour labels ---
  out.push(`<circle cx="${cx}" cy="${cy}" r="${R0}" fill="none" stroke="${inkFaint}" stroke-width="6"/>`);
  const mono = `font-family="IBM Plex Mono"`;
  const serif = `font-family="DM Serif Display"`;
  const labels = [[90, 'MIDNIGHT', 0, 56], [180, '6 AM', 70, 18], [270, 'NOON', 0, -30], [0, '6 PM', -70, 18]];
  for (const [ang, text, dx, dy] of labels) {
    const [x, y] = polar(cx, cy, R0 - 40, ang);
    const anchor = ang === 180 ? 'start' : ang === 0 ? 'end' : 'middle';
    out.push(`<text x="${(x + dx).toFixed(1)}" y="${(y + dy).toFixed(1)}" ${mono} font-weight="500" font-size="46" letter-spacing="6" fill="${inkSoft}" text-anchor="${anchor}">${text}</text>`);
  }

  // --- centre: moon, day numeral, month + year ---
  const phase = day.moon?.phase ?? moonPhase(day.date);
  out.push(moonGlyph(cx, cy - 300, 72, phase, ink, mix(ink, bg, 0.8)));
  const [, , dd] = day.date.split('-').map(Number);
  const [yy, mm] = day.date.split('-').map(Number);
  out.push(`<text x="${cx}" y="${cy + 230}" ${serif} font-size="560" fill="${ink}" text-anchor="middle">${dd}</text>`);
  out.push(`<text x="${cx}" y="${cy + 370}" ${mono} font-weight="600" font-size="84" letter-spacing="14" fill="${ink}" text-anchor="middle">${MONTHS[mm - 1]} ${yy}</text>`);

  // --- caption + facts under the ring ---
  const caption = (opts.caption || '').trim();
  let y = cy + RMAX + 420;
  if (caption) {
    const size = caption.length > 26 ? 150 : 190;
    out.push(`<text x="${cx}" y="${y}" font-family="DM Serif Display" font-style="italic" font-size="${size}" fill="${ink}" text-anchor="middle">${esc(caption)}</text>`);
    y += 210;
  } else {
    y += 20;
  }
  const place = day.place;
  const latS = `${Math.abs(place.lat).toFixed(2)}° ${place.lat >= 0 ? 'N' : 'S'}`;
  const lonS = `${Math.abs(place.lon).toFixed(2)}° ${place.lon >= 0 ? 'E' : 'W'}`;
  const placeLine = [place.name, place.admin1, place.country].filter(Boolean).join(', ').toUpperCase();
  out.push(`<text x="${cx}" y="${y}" ${mono} font-weight="600" font-size="88" letter-spacing="10" fill="${ink}" text-anchor="middle">${esc(fitText(placeLine, 40))}</text>`);
  y += 150;
  out.push(`<text x="${cx}" y="${y}" ${mono} font-size="66" letter-spacing="8" fill="${inkSoft}" text-anchor="middle">${latS} · ${lonS} · ${esc(moonName(phase))}</text>`);
  y += 190;
  const u = degSym(day.unit);
  const dl = day.daily.daylightMinutes;
  const dlS = dl == null ? '' : ` · ${Math.floor(dl / 60)}H ${String(dl % 60).padStart(2, '0')}M OF DAYLIGHT`;
  out.push(`<text x="${cx}" y="${y}" ${mono} font-weight="500" font-size="70" letter-spacing="8" fill="${ink}" text-anchor="middle">HIGH ${Math.round(tmax)}${u} · LOW ${Math.round(tmin)}${u}${dlS}</text>`);
  y += 130;
  const precipSum = day.daily.precipSum ?? 0;
  const precipS = day.unit === 'F' ? `${(precipSum / 25.4).toFixed(2)} IN` : `${precipSum.toFixed(1)} MM`;
  out.push(`<text x="${cx}" y="${y}" ${mono} font-size="62" letter-spacing="6" fill="${inkSoft}" text-anchor="middle">${esc(describeDay(day))}</text>`);
  y += 120;
  out.push(`<text x="${cx}" y="${y}" ${mono} font-size="62" letter-spacing="6" fill="${inkSoft}" text-anchor="middle">SUNRISE ${fmtClock(day.daily.sunrise)} · SUNSET ${fmtClock(day.daily.sunset)} · ${precipS} PRECIPITATION</text>`);

  out.push('</svg>');
  return out.join('\n');
}

function fitText(s, max) {
  return s.length <= max ? s : s.slice(0, max - 1).trimEnd() + '…';
}

// A compact, human-readable summary used in the UI and in order metadata.
export function summarize(day) {
  const u = `°${day.unit}`;
  const t = day.hourly.temp.filter((v) => v != null);
  const hi = Math.round(Math.max(...t)), lo = Math.round(Math.min(...t));
  return `High ${hi}${u}, low ${lo}${u}. ${describeDay(day).toLowerCase().replace(/·/g, ',')}.`;
}
