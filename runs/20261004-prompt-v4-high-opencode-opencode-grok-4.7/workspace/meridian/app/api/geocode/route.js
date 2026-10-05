export const dynamic = "force-dynamic";

export async function GET(req) {
  const q = new URL(req.url).searchParams.get("q")?.trim() || "";
  if (q.length < 2) return Response.json({ results: [] });
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=en&format=json`;
  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) return Response.json({ results: [] }, { status: 502 });
  const data = await res.json();
  const results = (data.results || []).map((r) => ({
    id: String(r.id),
    name: r.name,
    admin1: r.admin1 || "",
    country: r.country || "",
    lat: r.latitude,
    lon: r.longitude,
    tz: r.timezone,
    label: [r.name, r.admin1, r.country].filter(Boolean).join(", "),
  }));
  return Response.json({ results });
}
