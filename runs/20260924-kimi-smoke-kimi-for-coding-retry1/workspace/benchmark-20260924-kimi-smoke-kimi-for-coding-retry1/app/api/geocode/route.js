import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

// GET /api/geocode?q=paris — thin proxy over Nominatim (no key required).
// Used by the customizer's "find place" helper to resolve a city to lat/lng.
export async function GET(req) {
  const q = (new URL(req.url).searchParams.get('q') || '').trim().slice(0, 80);
  if (q.length < 2) return NextResponse.json({ results: [] });
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=jsonv2&limit=5&accept-language=en`,
      { headers: { 'User-Agent': 'skywriter-store-demo/1.0 (contact: hello@skywriter.example)' } }
    );
    if (!res.ok) return NextResponse.json({ results: [] });
    const data = await res.json();
    return NextResponse.json({
      results: (Array.isArray(data) ? data : []).map((r) => ({
        label: r.display_name,
        lat: Number(r.lat),
        lng: Number(r.lon),
      })),
    });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
