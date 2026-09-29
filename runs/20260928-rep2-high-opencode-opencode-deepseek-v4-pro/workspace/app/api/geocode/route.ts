import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// Lightweight geocoding via OpenStreetMap Nominatim (no API key required).
// Used only to turn a place name into coordinates for the star map.
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  if (!q) return NextResponse.json({ error: "Missing query" }, { status: 400 });

  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", q);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");

    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent": "stellar-star-map-tees/1.0 (demo)",
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Geocoding failed" }, { status: 502 });
    }

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }

    const top = data[0];
    return NextResponse.json({
      lat: parseFloat(top.lat),
      lng: parseFloat(top.lon),
      displayName: top.display_name,
    });
  } catch (err) {
    console.error("Geocoding error", err);
    return NextResponse.json({ error: "Geocoding failed" }, { status: 500 });
  }
}
