import { NextResponse } from "next/server";
import { placeLabel } from "@/lib/design";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim() || "";
  if (q.length < 2) return NextResponse.json({ results: [] });
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=en&format=json`;
  const res = await fetch(url, { headers: { "User-Agent": "Stillpoint/1.0 (custom tee studio)" }, cache: "no-store" });
  if (!res.ok) return NextResponse.json({ results: [], error: "Place search is unavailable." }, { status: 502 });
  const data = await res.json();
  const results = (data.results || []).map((r: {
    name: string;
    admin1?: string;
    country?: string;
    latitude: number;
    longitude: number;
    timezone?: string;
  }) => ({
    name: r.name,
    admin1: r.admin1 || "",
    country: r.country || "",
    latitude: r.latitude,
    longitude: r.longitude,
    timezone: r.timezone || "UTC",
    label: [placeLabel(r.name, r.admin1), r.country].filter(Boolean).join(", "),
  }));
  return NextResponse.json({ results });
}
