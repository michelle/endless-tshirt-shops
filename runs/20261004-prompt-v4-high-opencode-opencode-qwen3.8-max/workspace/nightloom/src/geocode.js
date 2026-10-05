'use strict';
/**
 * Location helpers: city presets, OpenStreetMap Nominatim geocoding (with
 * caching + polite rate limiting), and timezone resolution via tz-lookup.
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const tzlookup = require('tz-lookup');
const config = require('./config');

const CITIES = JSON.parse(fs.readFileSync(path.join(config.ROOT, 'data', 'cities.json'), 'utf8')).cities;

const CACHE_FILE = path.join(config.ROOT, 'data', 'geocache.json');
let geoCache = {};
try { geoCache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')); } catch { /* empty */ }
let lastNominatim = 0;

function saveGeoCache() {
  try { fs.writeFileSync(CACHE_FILE, JSON.stringify(geoCache, null, 1)); } catch { /* non-fatal */ }
}

function nominatimSearch(q) {
  return new Promise((resolve, reject) => {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(q)}`;
    const req = https.get(url, { headers: { 'User-Agent': 'NightLoom/1.0 (personalized star-map store)', 'Accept-Language': 'en' } }, (res) => {
      let buf = '';
      res.setEncoding('utf8');
      res.on('data', d => buf += d);
      res.on('end', () => {
        try { resolve(JSON.parse(buf)); } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.setTimeout(12000, () => req.destroy(new Error('nominatim timeout')));
  });
}

/** Geocode free-text; returns { name, country, countryCode, lat, lon } or null. */
async function geocode(q) {
  const key = q.trim().toLowerCase();
  if (!key) return null;
  if (geoCache[key]) return geoCache[key];
  // Polite rate limit: at most one Nominatim request per 1.1s.
  const wait = Math.max(0, 1100 - (Date.now() - lastNominatim));
  await new Promise(r => setTimeout(r, wait));
  lastNominatim = Date.now();
  const res = await nominatimSearch(q);
  if (!Array.isArray(res) || !res.length) return null;
  const r = res[0];
  const out = {
    name: r.name || (r.display_name || '').split(',')[0],
    country: r.address && r.address.country ? r.address.country : (r.display_name || '').split(',').slice(-1)[0],
    countryCode: r.address && r.address.country_code ? r.address.country_code.toUpperCase() : null,
    lat: parseFloat(r.lat),
    lon: parseFloat(r.lon),
  };
  if (!isFinite(out.lat) || !isFinite(out.lon)) return null;
  geoCache[key] = out;
  saveGeoCache();
  return out;
}

function timezoneFor(lat, lon) {
  try { return tzlookup(lat, lon); } catch { return 'UTC'; }
}

/** UTC offset (ms, local - UTC) of `tz` at the instant `date`. */
function tzOffsetMs(date, tz) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const parts = {};
  for (const p of dtf.formatToParts(date)) parts[p.type] = p.value;
  const asUTC = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour % 24, +parts.minute, +parts.second);
  return asUTC - Math.floor(date.getTime() / 1000) * 1000;
}

/**
 * Convert a wall-clock moment at a location into a UTC instant,
 * honoring the location's timezone (incl. DST) at that date.
 */
function wallToUtc(dateISO, timeHHMM, lat, lon) {
  const tz = timezoneFor(lat, lon);
  const [y, m, d] = dateISO.split('-').map(Number);
  const [H, M] = (timeHHMM || '00:00').split(':').map(Number);
  const wallUTC = Date.UTC(y, m - 1, d, H, M, 0);
  let instant = wallUTC;
  for (let i = 0; i < 3; i++) {
    const off = tzOffsetMs(new Date(instant), tz);
    instant = wallUTC - off;
  }
  return { utc: new Date(instant), tz };
}

/** Human-readable description of a UTC instant in the location's timezone. */
function describeLocal(utcISO, lat, lon) {
  const tz = timezoneFor(lat, lon);
  const d = new Date(utcISO);
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  return { tz, local: fmt.format(d).replace(',', '') };
}

module.exports = { CITIES, geocode, timezoneFor, wallToUtc, describeLocal };
