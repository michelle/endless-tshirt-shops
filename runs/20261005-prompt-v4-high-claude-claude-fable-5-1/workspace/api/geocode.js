import { geocode } from '../lib/weather.js';
import { json, error, query, methodNotAllowed } from '../lib/http.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res, 'GET');
  const q = String(query(req).q || '').trim();
  if (q.length < 2) return json(res, 200, { results: [] });
  try {
    const results = await geocode(q.slice(0, 80), 6);
    json(res, 200, { results }, { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' });
  } catch (e) {
    error(res, 502, 'Place search is unavailable right now. ' + e.message);
  }
}
