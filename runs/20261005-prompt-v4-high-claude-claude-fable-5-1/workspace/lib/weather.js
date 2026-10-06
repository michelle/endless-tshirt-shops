// Fetches and normalises historical weather for one civil day at one place (Open-Meteo archive).
import { moonPhase, moonName } from '../public/lib/dayprint.js';

const ARCHIVE = 'https://archive-api.open-meteo.com/v1/archive';
const GEOCODE = 'https://geocoding-api.open-meteo.com/v1/search';

// Open-Meteo is free and generally reliable, but a serverless cold start plus a transient
// network blip should not cost a sale: retry network-level failures and 5xx/429 once or twice.
async function fetchWithRetry(url, tries = 3) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(12000) });
      if (r.status >= 500 || r.status === 429) { lastErr = new Error(`upstream ${r.status}`); }
      else return r;
    } catch (e) {
      lastErr = e;
    }
    await new Promise((res) => setTimeout(res, 400 * (i + 1)));
  }
  throw lastErr;
}

export const MIN_DATE = '1940-01-01';
// The reanalysis archive lags real time by a few days; keep a safe margin.
export function maxDate() {
  const d = new Date(Date.now() - 7 * 86400000);
  return d.toISOString().slice(0, 10);
}

export function isValidDate(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s) return false;
  return s >= MIN_DATE && s <= maxDate();
}

export async function geocode(q, count = 6) {
  const url = `${GEOCODE}?name=${encodeURIComponent(q)}&count=${count}&language=en&format=json`;
  const r = await fetchWithRetry(url);
  if (!r.ok) throw new Error(`geocoding failed: ${r.status}`);
  const j = await r.json();
  return (j.results || []).map((p) => ({
    name: p.name,
    admin1: p.admin1 || '',
    country: p.country || '',
    countryCode: p.country_code || '',
    lat: p.latitude,
    lon: p.longitude,
    tz: p.timezone || 'auto',
  }));
}

/**
 * @param {{lat:number, lon:number, date:string, unit:'F'|'C', place:object}} q
 */
export async function fetchDay(q) {
  const unit = q.unit === 'C' ? 'C' : 'F';
  const params = new URLSearchParams({
    latitude: String(q.lat),
    longitude: String(q.lon),
    start_date: q.date,
    end_date: q.date,
    hourly: 'temperature_2m,precipitation,cloud_cover,wind_speed_10m,weather_code',
    daily: 'sunrise,sunset,temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code,daylight_duration',
    timezone: 'auto',
    temperature_unit: unit === 'F' ? 'fahrenheit' : 'celsius',
  });
  const r = await fetchWithRetry(`${ARCHIVE}?${params}`);
  const j = await r.json();
  if (!r.ok || j.error) throw new Error(j.reason || `weather archive failed: ${r.status}`);
  const h = j.hourly || {}, d = j.daily || {};
  const take = (arr) => Array.from({ length: 24 }, (_, i) => (arr && arr[i] != null ? arr[i] : null));
  const temp = take(h.temperature_2m);
  if (temp.every((v) => v == null)) throw new Error('no weather data for that day');
  const sunrise = d.sunrise?.[0] || null, sunset = d.sunset?.[0] || null;
  const daylightSec = d.daylight_duration?.[0];
  const daylightMinutes = daylightSec != null ? Math.round(daylightSec / 60) : null;
  let polar = null;
  if ((!sunrise || !sunset || sunrise === sunset) && daylightMinutes != null) polar = daylightMinutes > 720 ? 'day' : 'night';
  const phase = moonPhase(q.date);
  return {
    place: q.place,
    date: q.date,
    unit,
    tz: j.timezone || 'UTC',
    hourly: {
      temp,
      precip: take(h.precipitation).map((v) => v ?? 0),
      cloud: take(h.cloud_cover).map((v) => v ?? 0),
      wind: take(h.wind_speed_10m).map((v) => v ?? 0),
      code: take(h.weather_code),
    },
    daily: {
      sunrise: polar ? null : sunrise,
      sunset: polar ? null : sunset,
      tmax: d.temperature_2m_max?.[0] ?? null,
      tmin: d.temperature_2m_min?.[0] ?? null,
      precipSum: d.precipitation_sum?.[0] ?? 0,
      code: d.weather_code?.[0] ?? null,
      daylightMinutes,
      polar,
    },
    moon: { phase, name: moonName(phase) },
  };
}
