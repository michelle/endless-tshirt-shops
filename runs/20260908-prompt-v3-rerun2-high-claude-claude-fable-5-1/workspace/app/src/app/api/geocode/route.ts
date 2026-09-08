import { NextRequest } from "next/server";

// Proxies the free Open-Meteo geocoder (no key needed) and returns a compact
// list of places with the IANA timezone we need to convert local time to UTC.

interface OpenMeteoResult {
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  country_code?: string;
  admin1?: string;
  timezone?: string;
}

const WITH_REGION = new Set(["US", "CA", "AU", "BR", "IN", "MX", "RU", "CN"]);

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 80);
  if (q.length < 2) return Response.json({ results: [] });

  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=en&format=json`;
  try {
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return Response.json({ results: [] }, { status: 200 });
    const data = (await res.json()) as { results?: OpenMeteoResult[] };
    const results = (data.results ?? [])
      .filter((r) => r.timezone && Number.isFinite(r.latitude) && Number.isFinite(r.longitude))
      .map((r) => {
        const parts = [r.name];
        if (r.admin1 && r.admin1 !== r.name && WITH_REGION.has(r.country_code ?? "")) parts.push(r.admin1);
        if (r.country) parts.push(r.country);
        return {
          label: parts.join(", "),
          lat: Math.round(r.latitude * 10000) / 10000,
          lon: Math.round(r.longitude * 10000) / 10000,
          tz: r.timezone!,
        };
      });
    return Response.json({ results });
  } catch {
    return Response.json({ results: [] });
  }
}
