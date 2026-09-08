import { NextRequest, NextResponse } from "next/server";

// Proxies Open-Meteo's free, key-free geocoding API so the browser doesn't
// need any credentials to look up a place name.
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", q);
  url.searchParams.set("count", "6");
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");

  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return NextResponse.json({ results: [] });
    const data = await res.json();
    const results = (data.results ?? []).map((r: Record<string, unknown>) => ({
      name: r.name,
      admin1: r.admin1,
      country: r.country,
      lat: r.latitude,
      lon: r.longitude,
      label: [r.name, r.admin1, r.country].filter(Boolean).join(", "),
    }));
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
