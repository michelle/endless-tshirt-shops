#!/usr/bin/env node
/**
 * NightLoom data preparation.
 *
 * Builds the datasets the renderer needs:
 *   data/stars.json          Hipparcos (van Leeuwen 2007, VizieR I/311) star catalog,
 *                            proper-motion corrected to J2000. [hip, raDeg, decDeg, mag, bv]
 *   data/constellations.json IAU constellation line figures + names, derived from the
 *                            Stellarium "modern" sky culture (CC-BY-SA 4.0, stellarium.org).
 *   data/cities.json         Curated city presets for the location picker.
 *   public/fonts/*.ttf       OFL fonts from Google Fonts (Cinzel, Cormorant Garamond, Barlow).
 *
 * Usage: node scripts/fetch-data.js [--force]
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const ROOT = path.join(__dirname, '..');
const DATA = path.join(ROOT, 'data');
const RAW = path.join(DATA, 'raw');
const FONTS = path.join(ROOT, 'public', 'fonts');
const FORCE = process.argv.includes('--force');

fs.mkdirSync(RAW, { recursive: true });
fs.mkdirSync(FONTS, { recursive: true });

function fetch(url, dest, redirects = 5) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, { headers: { 'User-Agent': 'NightLoom/1.0 (star-map store; data prep)' } }, (res) => {
      if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location && redirects > 0) {
        res.resume();
        const next = new URL(res.headers.location, url).toString();
        return fetch(next, dest, redirects - 1).then(resolve, reject);
      }
      if (res.statusCode !== 200) { res.resume(); return reject(new Error(`HTTP ${res.statusCode} for ${url}`)); }
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => file.close(() => resolve(dest)));
      file.on('error', reject);
    }).on('error', reject);
  });
}

async function ensure(url, dest) {
  if (!FORCE && fs.existsSync(dest) && fs.statSync(dest).size > 1000) {
    console.log(`  cached  ${path.basename(dest)}`);
    return dest;
  }
  console.log(`  fetch   ${url}`);
  await fetch(url, dest);
  return dest;
}

/* ---------------- stars ---------------- */

async function buildStars() {
  const out = path.join(DATA, 'stars.json');
  if (!FORCE && fs.existsSync(out)) { console.log('stars.json exists, skip'); return; }
  const raw = path.join(RAW, 'hip2.dat');
  await ensure('http://cdsarc.u-strasbg.fr/ftp/cats/I/311/hip2.dat', raw);

  const text = fs.readFileSync(raw, 'utf8');
  const DT = (2000.0 - 1991.25) / 365.25 * 365.25; // years between catalog epoch and J2000 (8.75)
  const MAS_PER_YR_TO_RAD = (Math.PI / 180) / 3600 / 1000;
  const stars = [];
  let skipped = 0;
  for (const line of text.split('\n')) {
    if (line.length < 160) continue;
    const hip = parseInt(line.slice(0, 6), 10);
    const raRad = parseFloat(line.slice(15, 28));
    const decRad = parseFloat(line.slice(29, 42));
    const pmRA = parseFloat(line.slice(51, 59));   // mas/yr, already multiplied by cos(dec)
    const pmDec = parseFloat(line.slice(60, 68));  // mas/yr
    const mag = parseFloat(line.slice(129, 136));  // Hpmag ~ V
    const bv = parseFloat(line.slice(152, 158));
    if (!isFinite(raRad) || !isFinite(decRad) || !isFinite(mag) || mag > 7.6) { skipped++; continue; }

    // unit vector at catalog epoch
    const cd = Math.cos(decRad), sd = Math.sin(decRad), cr = Math.cos(raRad), sr = Math.sin(raRad);
    let x = cd * cr, y = cd * sr, z = sd;
    if (isFinite(pmRA) && isFinite(pmDec)) {
      // tangential unit vectors
      const uaX = -sr, uaY = cr, uaZ = 0;                       // direction of increasing RA
      const udX = -sd * cr, udY = -sd * sr, udZ = cd;           // direction of increasing Dec
      const dA = pmRA * MAS_PER_YR_TO_RAD * DT;
      const dD = pmDec * MAS_PER_YR_TO_RAD * DT;
      x += uaX * dA + udX * dD; y += uaY * dA + udY * dD; z += uaZ * dA + udZ * dD;
      const n = Math.hypot(x, y, z); x /= n; y /= n; z /= n;
    }
    let ra = Math.atan2(y, x) * 180 / Math.PI; if (ra < 0) ra += 360;
    const dec = Math.asin(Math.max(-1, Math.min(1, z))) * 180 / Math.PI;
    stars.push([
      hip,
      Math.round(ra * 1e5) / 1e5,
      Math.round(dec * 1e5) / 1e5,
      Math.round(mag * 100) / 100,
      isFinite(bv) ? Math.round(bv * 100) / 100 : 0,
    ]);
  }
  stars.sort((a, b) => a[3] - b[3]); // brightest first
  fs.writeFileSync(out, JSON.stringify({ count: stars.length, stars }));
  console.log(`stars.json: ${stars.length} stars (skipped ${skipped}); brightest mag ${stars[0][3]}`);
  // sanity checks
  const byHip = Object.fromEntries(stars.map(s => [s[0], s]));
  const checks = [[32349, 'Sirius'], [91262, 'Vega'], [24608, 'Polaris'], [21421, 'Aldebaran']];
  for (const [hip, name] of checks) console.log(`  ${name}:`, byHip[hip] || 'MISSING');
}

/* ---------------- constellations ---------------- */

async function buildConstellations() {
  const out = path.join(DATA, 'constellations.json');
  if (!FORCE && fs.existsSync(out)) { console.log('constellations.json exists, skip'); return; }
  const raw = path.join(RAW, 'modern_index.json');
  await ensure('https://raw.githubusercontent.com/Stellarium/stellarium/master/skycultures/modern/index.json', raw);
  const src = JSON.parse(fs.readFileSync(raw, 'utf8'));
  const cons = src.constellations.map(c => ({
    abbr: c.id.split(' ').pop(),
    en: c.common_name && c.common_name.english,
    latin: c.common_name && c.common_name.native,
    lines: c.lines,
  }));
  fs.writeFileSync(out, JSON.stringify({ count: cons.length, license: 'Constellation figures: Stellarium "modern" sky culture (CC-BY-SA 4.0)', constellations: cons }));
  console.log(`constellations.json: ${cons.length} constellations`);
}

/* ---------------- cities ---------------- */

const CITIES = [
  ['New York', 'United States', 40.7128, -74.006], ['Los Angeles', 'United States', 34.0522, -118.2437],
  ['Chicago', 'United States', 41.8781, -87.6298], ['Houston', 'United States', 29.7604, -95.3698],
  ['Phoenix', 'United States', 33.4484, -112.074], ['Philadelphia', 'United States', 39.9526, -75.1652],
  ['San Antonio', 'United States', 29.4241, -98.4936], ['San Diego', 'United States', 32.7157, -117.1611],
  ['Dallas', 'United States', 32.7767, -96.797], ['Austin', 'United States', 30.2672, -97.7431],
  ['Seattle', 'United States', 47.6062, -122.3321], ['Denver', 'United States', 39.7392, -104.9903],
  ['Boston', 'United States', 42.3601, -71.0589], ['Nashville', 'United States', 36.1627, -86.7816],
  ['Miami', 'United States', 25.7617, -80.1918], ['Atlanta', 'United States', 33.749, -84.388],
  ['San Francisco', 'United States', 37.7749, -122.4194], ['Honolulu', 'United States', 21.3069, -157.8583],
  ['Anchorage', 'United States', 61.2181, -149.9003], ['New Orleans', 'United States', 29.9511, -90.0715],
  ['London', 'United Kingdom', 51.5074, -0.1278], ['Manchester', 'United Kingdom', 53.4808, -2.2426],
  ['Edinburgh', 'United Kingdom', 55.9533, -3.1883], ['Dublin', 'Ireland', 53.3498, -6.2603],
  ['Paris', 'France', 48.8566, 2.3522], ['Berlin', 'Germany', 52.52, 13.405],
  ['Madrid', 'Spain', 40.4168, -3.7038], ['Barcelona', 'Spain', 41.3874, 2.1686],
  ['Rome', 'Italy', 41.9028, 12.4964], ['Milan', 'Italy', 45.4642, 9.19],
  ['Amsterdam', 'Netherlands', 52.3676, 4.9041], ['Brussels', 'Belgium', 50.8503, 4.3517],
  ['Zurich', 'Switzerland', 47.3769, 8.5417], ['Vienna', 'Austria', 48.2082, 16.3738],
  ['Stockholm', 'Sweden', 59.3293, 18.0686], ['Oslo', 'Norway', 59.9139, 10.7522],
  ['Copenhagen', 'Denmark', 55.6761, 12.5683], ['Helsinki', 'Finland', 60.1699, 24.9384],
  ['Warsaw', 'Poland', 52.2297, 21.0122], ['Prague', 'Czechia', 50.0755, 14.4378],
  ['Budapest', 'Hungary', 47.4979, 19.0402], ['Athens', 'Greece', 37.9838, 23.7275],
  ['Lisbon', 'Portugal', 38.7223, -9.1393], ['Dubrovnik', 'Croatia', 42.6507, 18.0944],
  ['Reykjavik', 'Iceland', 64.1466, -21.9426], ['Toronto', 'Canada', 43.6532, -79.3832],
  ['Vancouver', 'Canada', 49.2827, -123.1207], ['Montreal', 'Canada', 45.5017, -73.5673],
  ['Mexico City', 'Mexico', 19.4326, -99.1332], ['Guadalajara', 'Mexico', 20.6597, -103.3496],
  ['Monterrey', 'Mexico', 25.6866, -100.3161], ['Bogota', 'Colombia', 4.711, -74.0721],
  ['Lima', 'Peru', -12.0464, -77.0428], ['Santiago', 'Chile', -33.4489, -70.6693],
  ['Buenos Aires', 'Argentina', -34.6037, -58.3816], ['Rio de Janeiro', 'Brazil', -22.9068, -43.1729],
  ['Sao Paulo', 'Brazil', -23.5505, -46.6333], ['Montevideo', 'Uruguay', -34.9011, -56.1645],
  ['Quito', 'Ecuador', -0.1807, -78.4678], ['San Juan', 'Puerto Rico', 18.4655, -66.1057],
  ['Sydney', 'Australia', -33.8688, 151.2093], ['Melbourne', 'Australia', -37.8136, 144.9631],
  ['Brisbane', 'Australia', -27.4698, 153.0251], ['Perth', 'Australia', -31.9505, 115.8605],
  ['Auckland', 'New Zealand', -36.8485, 174.7633], ['Wellington', 'New Zealand', -41.2866, 174.7756],
  ['Tokyo', 'Japan', 35.6762, 139.6503], ['Osaka', 'Japan', 34.6937, 135.5023],
  ['Kyoto', 'Japan', 35.0116, 135.7681], ['Seoul', 'South Korea', 37.5665, 126.978],
  ['Beijing', 'China', 39.9042, 116.4074], ['Shanghai', 'China', 31.2304, 121.4737],
  ['Singapore', 'Singapore', 1.3521, 103.8198], ['Bangkok', 'Thailand', 13.7563, 100.5018],
  ['Hanoi', 'Vietnam', 21.0278, 105.8342], ['Ho Chi Minh City', 'Vietnam', 10.8231, 106.6297],
  ['Manila', 'Philippines', 14.5995, 120.9842], ['Jakarta', 'Indonesia', -6.2088, 106.8456],
  ['Bali (Denpasar)', 'Indonesia', -8.6705, 115.2126], ['Mumbai', 'India', 19.076, 72.8777],
  ['Delhi', 'India', 28.6139, 77.209], ['Bengaluru', 'India', 12.9716, 77.5946],
  ['Kolkata', 'India', 22.5726, 88.3639], ['Chennai', 'India', 13.0827, 80.2707],
  ['Hyderabad', 'India', 17.385, 78.4867], ['Kathmandu', 'Nepal', 27.7172, 85.324],
  ['Colombo', 'Sri Lanka', 6.9271, 79.8612], ['Dubai', 'UAE', 25.2048, 55.2708],
  ['Abu Dhabi', 'UAE', 24.4539, 54.3773], ['Doha', 'Qatar', 25.2854, 51.531],
  ['Jerusalem', 'Israel', 31.7683, 35.2137], ['Tel Aviv', 'Israel', 32.0853, 34.7818],
  ['Istanbul', 'Turkey', 41.0082, 28.9784], ['Cape Town', 'South Africa', -33.9249, 18.4241],
  ['Johannesburg', 'South Africa', -26.2041, 28.0473], ['Nairobi', 'Kenya', -1.2921, 36.8219],
  ['Lagos', 'Nigeria', 6.5244, 3.3792], ['Accra', 'Ghana', 5.6037, -0.187],
  ['Cairo', 'Egypt', 30.0444, 31.2357], ['Marrakesh', 'Morocco', 31.6295, -7.9811],
  ['Casablanca', 'Morocco', 33.5731, -7.5898], ['Addis Ababa', 'Ethiopia', 9.032, 38.7469],
  ['Zanzibar', 'Tanzania', -6.1659, 39.2026], ['Kampala', 'Uganda', 0.3476, 32.5825],
  ['Moscow', 'Russia', 55.7558, 37.6173], ['Saint Petersburg', 'Russia', 59.9311, 30.3609],
  ['Tromso', 'Norway', 69.6492, 18.9553], ['Longyearbyen', 'Svalbard', 78.2232, 15.6267],
  ['Ushuaia', 'Argentina', -54.8019, -68.303],
];

function buildCities() {
  const out = path.join(DATA, 'cities.json');
  if (!FORCE && fs.existsSync(out)) { console.log('cities.json exists, skip'); return; }
  const cities = CITIES.map(([name, country, lat, lon]) => ({ name, country, lat, lon }));
  fs.writeFileSync(out, JSON.stringify({ cities }));
  console.log(`cities.json: ${cities.length} cities`);
}

/* ---------------- fonts ---------------- */

const FONT_REQUESTS = [
  { css: 'Cinzel:wght@400', file: 'Cinzel-Regular.ttf' },
  { css: 'Cinzel:wght@600', file: 'Cinzel-SemiBold.ttf' },
  { css: 'Cinzel:wght@700', file: 'Cinzel-Bold.ttf' },
  { css: 'Cormorant+Garamond:wght@400', file: 'CormorantGaramond-Regular.ttf' },
  { css: 'Cormorant+Garamond:wght@600', file: 'CormorantGaramond-SemiBold.ttf' },
  { css: 'Cormorant+Garamond:ital@1', file: 'CormorantGaramond-Italic.ttf' },
  { css: 'Barlow:wght@400', file: 'Barlow-Regular.ttf' },
  { css: 'Barlow:wght@500', file: 'Barlow-Medium.ttf' },
  { css: 'Barlow:wght@600', file: 'Barlow-SemiBold.ttf' },
];

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'curl/8.0' } }, (res) => {
      let buf = '';
      res.setEncoding('utf8');
      res.on('data', d => buf += d);
      res.on('end', () => resolve(buf));
    }).on('error', reject);
  });
}

async function buildFonts() {
  for (const f of FONT_REQUESTS) {
    const dest = path.join(FONTS, f.file);
    if (!FORCE && fs.existsSync(dest) && fs.statSync(dest).size > 10000) { console.log(`  cached  ${f.file}`); continue; }
    const css = await fetchText(`https://fonts.googleapis.com/css2?family=${f.css}`);
    const m = css.match(/url\((https:\/\/[^)]+\.ttf)\)/);
    if (!m) throw new Error(`no ttf url found for ${f.css}: ${css.slice(0, 200)}`);
    await fetch(m[1], dest);
    console.log(`  font    ${f.file} (${fs.statSync(dest).size} bytes)`);
  }
}

(async () => {
  console.log('== stars ==');
  await buildStars();
  console.log('== constellations ==');
  await buildConstellations();
  console.log('== cities ==');
  buildCities();
  console.log('== fonts ==');
  await buildFonts();
  console.log('done.');
})().catch(e => { console.error(e); process.exit(1); });
