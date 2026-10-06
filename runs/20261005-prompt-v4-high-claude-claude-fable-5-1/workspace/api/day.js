import { fetchDay, isValidDate, MIN_DATE, maxDate } from '../lib/weather.js';
import { json, error, query, methodNotAllowed } from '../lib/http.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res, 'GET');
  const q = query(req);
  const lat = Number(q.lat), lon = Number(q.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return error(res, 400, 'lat/lon required');
  if (!isValidDate(String(q.date))) return error(res, 400, `date must be between ${MIN_DATE} and ${maxDate()}`);
  const place = {
    name: String(q.name || '').slice(0, 60) || `${lat.toFixed(2)}, ${lon.toFixed(2)}`,
    admin1: String(q.admin1 || '').slice(0, 60),
    country: String(q.country || '').slice(0, 60),
    countryCode: String(q.cc || '').slice(0, 2).toUpperCase(),
    lat, lon,
  };
  try {
    const day = await fetchDay({ lat, lon, date: q.date, unit: q.unit === 'C' ? 'C' : 'F', place });
    json(res, 200, day, { 'Cache-Control': 'public, s-maxage=2592000, stale-while-revalidate=31536000' });
  } catch (e) {
    error(res, 502, 'Could not load the weather for that day. ' + e.message);
  }
}
