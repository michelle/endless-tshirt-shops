import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export interface GeoResult {
  name: string;
  label: string;
  lat: number;
  lon: number;
  tz: string;
}

/** GET /api/geocode?q=Lisbon → up to 6 candidate places with coordinates and IANA time zone. */
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 2) return Response.json({ results: [] });
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", q);
  url.searchParams.set("count", "6");
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) return Response.json({ results: [] }, { status: 502 });
  const data = (await res.json()) as {
    results?: { name: string; latitude: number; longitude: number; timezone: string; country?: string; admin1?: string }[];
  };
  const results: GeoResult[] = (data.results ?? []).map((r) => ({
    name: r.name,
    label: [r.name, r.admin1, r.country].filter((x, i, a) => x && a.indexOf(x) === i).join(", "),
    lat: Math.round(r.latitude * 10000) / 10000,
    lon: Math.round(r.longitude * 10000) / 10000,
    tz: r.timezone,
  }));
  return Response.json({ results });
}
