// GET /api/geocode?q=… — place search via Open-Meteo's free geocoding API.
import { json, cors, fail } from '../lib/http.mjs';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.end();
  const url = new URL(req.url, 'http://x');
  const q = (url.searchParams.get('q') || '').trim();
  if (q.length < 2) return json(res, 200, { results: [] });
  try {
    const up = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=8&language=en&format=json`);
    if (!up.ok) return fail(res, 502, `geocoder responded ${up.status}`);
    const j = await up.json();
    const results = (j.results || []).map((r) => ({
      city: r.name,
      admin1: r.admin1 || '',
      country: r.country || '',
      countryCode: r.country_code || '',
      lat: r.latitude, lon: r.longitude,
    }));
    json(res, 200, { results });
  } catch (e) {
    fail(res, 502, `geocoder unreachable: ${e.message}`);
  }
}
