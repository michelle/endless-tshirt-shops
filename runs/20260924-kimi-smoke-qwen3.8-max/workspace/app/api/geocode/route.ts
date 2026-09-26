import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 20;

export type GeoResult = {
  name: string;
  admin1: string;
  country: string;
  countryCode: string;
  lat: number;
  lon: number;
  label: string;
};

/**
 * GET /api/geocode?q=<place>          — forward geocoding (Open-Meteo, keyless)
 * GET /api/geocode?lat=&lon=          — reverse geocoding (BigDataCloud client API, keyless)
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const q = (url.searchParams.get('q') ?? '').trim();
  const lat = url.searchParams.get('lat');
  const lon = url.searchParams.get('lon');

  try {
    if (lat !== null && lon !== null) {
      const la = Number(lat);
      const lo = Number(lon);
      if (!Number.isFinite(la) || !Number.isFinite(lo) || la < -90 || la > 90 || lo < -180 || lo > 180) {
        return NextResponse.json({ error: 'Invalid coordinates.' }, { status: 400 });
      }
      const res = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${la}&longitude=${lo}&localityLanguage=en`,
        { signal: AbortSignal.timeout(10000) },
      );
      if (!res.ok) throw new Error(`reverse geocode ${res.status}`);
      const data = (await res.json()) as {
        city?: string;
        locality?: string;
        principalSubdivision?: string;
        countryName?: string;
        countryCode?: string;
      };
      const name = data.city || data.locality || data.principalSubdivision || 'This exact spot';
      const result: GeoResult = {
        name,
        admin1: data.principalSubdivision ?? '',
        country: data.countryName ?? '',
        countryCode: data.countryCode ?? '',
        lat: la,
        lon: lo,
        label: name,
      };
      return NextResponse.json({ results: [result] }, { headers: { 'Cache-Control': 'public, s-maxage=86400' } });
    }

    if (q.length < 2 || q.length > 120) {
      return NextResponse.json({ results: [] });
    }
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=en&format=json`,
      { signal: AbortSignal.timeout(10000) },
    );
    if (!res.ok) throw new Error(`geocode ${res.status}`);
    const data = (await res.json()) as {
      results?: {
        name: string;
        admin1?: string;
        country?: string;
        country_code?: string;
        latitude: number;
        longitude: number;
      }[];
    };
    const results: GeoResult[] = (data.results ?? []).map((r) => ({
      name: r.name,
      admin1: r.admin1 ?? '',
      country: r.country ?? '',
      countryCode: r.country_code ?? '',
      lat: Math.round(r.latitude * 1e4) / 1e4,
      lon: Math.round(r.longitude * 1e4) / 1e4,
      label: r.name,
    }));
    return NextResponse.json({ results }, { headers: { 'Cache-Control': 'public, s-maxage=86400' } });
  } catch (e) {
    console.error('geocode error', (e as Error).message);
    return NextResponse.json({ error: 'Location lookup failed. Try again.' }, { status: 502 });
  }
}
