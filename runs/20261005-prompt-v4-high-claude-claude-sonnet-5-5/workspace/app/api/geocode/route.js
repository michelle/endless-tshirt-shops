export const runtime = 'nodejs';

export async function GET(request) {
  const q = (new URL(request.url).searchParams.get('q') || '').trim().slice(0, 80);
  if (q.length < 2) return Response.json({ results: [] });
  const res = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=en&format=json`,
    { next: { revalidate: 86400 } },
  );
  if (!res.ok) return Response.json({ results: [], error: 'Place search is unavailable right now.' }, { status: 502 });
  const json = await res.json();
  const results = (json.results || []).map((r) => {
    const region = ['US', 'CA', 'AU', 'GB'].includes(r.country_code) ? r.admin1 : '';
    const label = [r.name, region, r.country].filter(Boolean).join(', ');
    return { label: label.slice(0, 48), detail: [r.admin1, r.country].filter(Boolean).join(', '), lat: r.latitude, lon: r.longitude, tz: r.timezone };
  });
  return Response.json({ results });
}
