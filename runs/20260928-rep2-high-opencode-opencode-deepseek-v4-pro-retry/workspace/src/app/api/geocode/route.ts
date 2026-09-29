import { NextRequest, NextResponse } from "next/server";
import { geocode, fallbackGeocode } from "@/lib/geocode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") || "";
  if (!q.trim()) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }

  const result = (await geocode(q)) || fallbackGeocode(q);
  if (!result) {
    return NextResponse.json({ error: "Location not found" }, { status: 404 });
  }
  return NextResponse.json(result);
}
