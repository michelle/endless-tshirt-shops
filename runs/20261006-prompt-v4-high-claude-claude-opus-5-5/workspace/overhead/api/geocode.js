// Place search proxy (Open-Meteo geocoding — free, no key) so the browser needs no third-party CORS.
import { json } from '../lib/config.js';

export async function GET(request) {
  const q = (new URL(request.url).searchParams.get('q') || '').trim().slice(0, 80);
  if (q.length < 2) return json({ results: [] });
  const url = `https://geocoding-api.open-meteo.com/v1/search?count=8&language=en&format=json&name=${encodeURIComponent(q)}`;
  const res = await fetch(url);
  if (!res.ok) return json({ error: 'Place search unavailable' }, 502);
  const data = await res.json();
  const results = (data.results || []).map((r) => ({
    name: r.name,
    region: r.admin1 || '',
    country: r.country || '',
    countryCode: r.country_code || '',
    lat: r.latitude,
    lon: r.longitude,
    tz: r.timezone || 'UTC',
  }));
  return json({ results }, 200, { 'cache-control': 'public, max-age=86400' });
}
