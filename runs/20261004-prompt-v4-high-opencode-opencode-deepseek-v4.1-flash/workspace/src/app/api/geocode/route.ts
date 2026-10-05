import { NextResponse } from "next/server";

export const runtime = "nodejs";

interface OpenMeteoResult {
  name: string;
  country?: string;
  admin1?: string;
  latitude: number;
  longitude: number;
  timezone?: string;
}

/** Server-side place lookup (Open-Meteo geocoding, no API key required). */
export async function GET(request: Request) {
  const query = (new URL(request.url).searchParams.get("q") ?? "").trim().slice(0, 80);
  if (query.length < 2) return NextResponse.json({ results: [] });
  try {
    const endpoint = new URL("https://geocoding-api.open-meteo.com/v1/search");
    endpoint.searchParams.set("name", query);
    endpoint.searchParams.set("count", "6");
    endpoint.searchParams.set("language", "en");
    endpoint.searchParams.set("format", "json");
    const response = await fetch(endpoint, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error(`geocoder ${response.status}`);
    const data = (await response.json()) as { results?: OpenMeteoResult[] };
    const results = (data.results ?? []).map((r) => ({
      name: r.name,
      country: r.country ?? "",
      region: r.admin1 ?? "",
      latitude: r.latitude,
      longitude: r.longitude,
      timezone: r.timezone ?? "UTC",
      label: [r.name, r.admin1, r.country].filter(Boolean).join(", "),
    }));
    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json({ results: [], error: (error as Error).message }, { status: 502 });
  }
}
